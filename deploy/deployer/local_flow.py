# Flujo de despliegue local: ejecuta docker compose sin git checkout, nginx ni Discord.
# Equivalente al antiguo local.py, integrado como modo --local del entry point.

import json
import os
import subprocess
import tempfile
from pathlib import Path
from typing import Any

from . import log
from .config import is_spring_stack, is_nginx_stack, is_valid_stack, resolve_template_path
from .errors import die
from .server_flow import _run_post_deploy_hook
from .files import (write_runtime_env_local, ensure_default_dockerignore,
                    resolve_spring_application_properties)
from .docker_ops import export_service_port_vars, configure_frontend_build_env, run_liquibase_seed
from .yml_parser import load_yaml, select_service


def _apply_database_env(run_env: dict, service_name: str, service: dict, stack: str) -> None:
    """Inyecta variables de base de datos en run_env según el stack.

    Args:
        run_env: Diccionario de entorno que se pasará a docker compose.
        service_name: Nombre del servicio (para errores).
        service: Diccionario del servicio leído del deploy.yml.
        stack: Tipo de stack.
    """
    if stack == "spring_maria":
        required = ["mysql_user", "mysql_db", "mysql_pass", "mysql_external_port"]
        missing = [k for k in required if not str(service.get(k) or "").strip()]
        if missing:
            die(f"{service_name}: faltan campos: {', '.join(missing)}")
        mysql_user = str(service["mysql_user"]).strip()
        mysql_db   = str(service["mysql_db"]).strip()
        mysql_pass = str(service["mysql_pass"]).strip()
        run_env["MYSQL_USER"]          = mysql_user
        run_env["MYSQL_DB"]            = mysql_db
        run_env["MYSQL_PASS"]          = mysql_pass
        run_env["MYSQL_ROOT_PASSWORD"] = mysql_pass
        run_env["MYSQL_EXTERNAL_PORT"] = str(service["mysql_external_port"]).strip()
        run_env["SPRING_DATASOURCE_URL"]      = (
            f"jdbc:mysql://mariadb:3306/{mysql_db}?sessionVariables=sql_mode=''"
            "&connectionTimeZone=America/Argentina/Buenos_Aires"
            "&forceConnectionTimeZoneToSession=true"
        )
        run_env["SPRING_DATASOURCE_USERNAME"] = mysql_user
        run_env["SPRING_DATASOURCE_PASSWORD"] = mysql_pass
    elif stack in ("spring_postgres", "python_postgres"):
        required = ["postgres_user", "postgres_db", "postgres_pass", "postgres_external_port"]
        missing = [k for k in required if not str(service.get(k) or "").strip()]
        if missing:
            die(f"{service_name}: faltan campos: {', '.join(missing)}")
        pg_user = str(service["postgres_user"]).strip()
        pg_db   = str(service["postgres_db"]).strip()
        pg_pass = str(service["postgres_pass"]).strip()
        run_env["POSTGRES_USER"]         = pg_user
        run_env["POSTGRES_DB"]           = pg_db
        run_env["POSTGRES_PASS"]         = pg_pass
        run_env["POSTGRES_EXTERNAL_PORT"] = str(service["postgres_external_port"]).strip()
        if stack == "spring_postgres":
            run_env["SPRING_DATASOURCE_URL"]      = f"jdbc:postgresql://postgres:5432/{pg_db}"
            run_env["SPRING_DATASOURCE_USERNAME"] = pg_user
            run_env["SPRING_DATASOURCE_PASSWORD"] = pg_pass


def _apply_local_logging_defaults(run_env: dict, stack: str) -> None:
    """Dirige los archivos de log Spring al tmpfs local del contenedor.

    Args:
        run_env: Diccionario de entorno de docker compose.
        stack: Tipo de stack.
    """
    if is_spring_stack(stack):
        run_env["LOGGING_FILE_PATH"] = "/app/logs"
        run_env["LOGGING_FILE_NAME"] = ""


def _create_local_logging_override(compose_service: str) -> Path:
    """Crea un override temporal que evita persistir logs Spring localmente."""
    override = tempfile.NamedTemporaryFile(
        mode="w", suffix=".yml", prefix="deployer-local-", delete=False, encoding="utf-8"
    )
    with override:
        override.write(
            "services:\n"
            f"  {json.dumps(compose_service)}:\n"
            "    volumes:\n"
            "      - type: tmpfs\n"
            "        target: /app/logs\n"
            "    environment:\n"
            "      LOGGING_FILE_PATH: /app/logs\n"
            "      LOGGING_FILE_NAME: \"\"\n"
        )
    return Path(override.name)


def _apply_compose_env(run_env: dict, service: dict) -> None:
    """Propaga RESTART_POLICY desde env del servicio al entorno de compose si está definida.

    Args:
        run_env: Diccionario de entorno de docker compose.
        service: Diccionario del servicio.
    """
    env_block = service.get("env") or {}
    if isinstance(env_block, dict) and "RESTART_POLICY" in env_block:
        run_env["RESTART_POLICY"] = str(env_block["RESTART_POLICY"]).strip()


def _apply_port_env_local(run_env: dict, service_name: str, port: str, stack: str, path_value: str) -> None:
    """Versión local de export_service_port_vars: opera sobre un dict en lugar de os.environ.

    Args:
        run_env: Diccionario de entorno de docker compose.
        service_name: Nombre del servicio.
        port: Puerto externo.
        stack: Tipo de stack.
        path_value: Sub-path de URL (puede estar vacío).
    """
    run_env["NAME"]           = service_name
    run_env["PORT"]           = port
    run_env["CONTAINER_NAME"] = service_name
    run_env["EXTERNAL_PORT"]  = port
    if stack in ("angular", "vue") or is_nginx_stack(stack):
        run_env["INTERNAL_PORT"] = "80"
        if stack in ("angular", "vue"):
            run_env["NG_APP_BASE_HREF"] = f"/{path_value}/" if path_value else "/"
            run_env["VITE_BASE_PATH"]   = f"/{path_value}/" if path_value else "/"
        else:
            run_env.pop("VITE_BASE_PATH", None)
            run_env.pop("NG_APP_BASE_HREF", None)
    elif stack == "angular_ssr":
        run_env["INTERNAL_PORT"]   = "4000"
        run_env["NG_APP_BASE_HREF"] = f"/{path_value}/" if path_value else "/"
        run_env.pop("VITE_BASE_PATH", None)
    elif stack == "tanstack":
        run_env["INTERNAL_PORT"] = "3000"
        run_env["VITE_BASE_PATH"] = f"/{path_value}/" if path_value else "/"
        run_env.pop("NG_APP_BASE_HREF", None)
    else:
        run_env["INTERNAL_PORT"] = port
        run_env.pop("NG_APP_BASE_HREF", None)
        run_env.pop("VITE_BASE_PATH", None)


def _apply_frontend_env_local(run_env: dict, stack: str, environment_name: str) -> None:
    """Versión local de configure_frontend_build_env: opera sobre un dict.

    Args:
        run_env: Diccionario de entorno de docker compose.
        stack: Tipo de stack.
        environment_name: Nombre del environment de build.
    """
    if stack in ("angular", "angular_ssr"):
        run_env["NG_BUILD_CONFIGURATION"] = environment_name or "production"
        run_env.pop("VITE_BUILD_MODE", None)
    elif stack in ("tanstack", "vue"):
        run_env["VITE_BUILD_MODE"] = environment_name or "production"
        run_env.pop("NG_BUILD_CONFIGURATION", None)
    else:
        run_env.pop("NG_BUILD_CONFIGURATION", None)
        run_env.pop("VITE_BUILD_MODE", None)


def run_local_deploy(deploy_dir: Path, argv: list[str]) -> int:
    """Punto de entrada del flujo local: levanta docker compose sin tocar git ni nginx.

    Args:
        deploy_dir: Path al directorio deploy/.
        argv: Argumentos de línea de comando (sin deploy.py ni --local).
    Returns:
        Código de salida (0 = éxito).
    """
    delete_db = os.environ.get("LOCAL_DELETE_DB") == "1" or "--delete-db" in argv
    follow_logs = "-f" in argv
    force_recreate = "-fc" in argv
    run_seed = "--seed" in argv
    args = [a for a in argv if a not in {"--delete-db", "-f", "-fc", "--seed"}]
    deploy_env   = args[0] if len(args) > 0 else os.environ.get("DEPLOY_ENV", "local")
    service_arg  = args[1] if len(args) > 1 else None

    repo_root  = deploy_dir.parent
    deploy_yml = repo_root / "deploy.yml"
    if not deploy_yml.is_file():
        die(f"no existe {deploy_yml}")

    data = load_yaml(deploy_yml)
    service_name, service = select_service(data, deploy_env, service_arg)

    stack = str(service.get("stack") or "spring").strip().lower()
    if not is_valid_stack(stack) and not is_nginx_stack(stack):
        die(f"{service_name}: stack inválido [{stack}]")

    if str(service.get("nginx_config") or "").strip():
        die(f"{service_name}: nginx_config no debe especificarse en el flujo local")

    composer = resolve_template_path(str(service.get("composer_file") or "").strip())
    if not composer:
        die(f"{service_name}: falta composer_file en deploy.yml")
    composer_path = deploy_dir / composer
    if not composer_path.is_file():
        die(f"{service_name}: no existe composer_file: {composer_path}")

    port = str(service.get("port") or "").strip()
    if not port:
        die(f"{service_name}: falta port en deploy.yml")

    log.title(f"Deploy LOCAL: env={deploy_env} | servicio={service_name} | stack={stack} | puerto={port}")

    application_properties_file = None
    if is_spring_stack(stack):
        application_properties_file = resolve_spring_application_properties(
            str(repo_root), service_name, "", str(service.get("application_properties") or "")
        )

    ensure_default_dockerignore(repo_root, service_name, "")
    write_runtime_env_local(deploy_dir, service, stack)

    run_env = os.environ.copy()
    if application_properties_file:
        run_env["APPLICATION_PROPERTIES_FILE"] = application_properties_file
    _apply_frontend_env_local(run_env, stack, str(service.get("environment") or "").strip())
    _apply_port_env_local(run_env, service_name, port, stack, str(service.get("path") or "").strip())
    _apply_database_env(run_env, service_name, service, stack)
    _apply_compose_env(run_env, service)
    _apply_local_logging_defaults(run_env, stack)

    compose_file_args = ["docker", "compose", "-f", str(composer_path)]
    compose_service = str(service.get("compose_service") or "app").strip()
    local_override = _create_local_logging_override(compose_service) if is_spring_stack(stack) else None
    if local_override:
        compose_file_args.extend(["-f", str(local_override)])

    try:
        if delete_db:
            log.step(f"Borrando volúmenes locales del proyecto [{service_name}]...")
            subprocess.run([*compose_file_args, "down", "--volumes", "--remove-orphans"],
                           cwd=str(deploy_dir), env=run_env, check=True)

        compose_args = [*compose_file_args, "up", "-d", "--build"]
        if force_recreate:
            compose_args.append("--force-recreate")
        log.step(f"Ejecutando: {' '.join(compose_args)}")
        subprocess.run(compose_args, cwd=str(deploy_dir), env=run_env, check=True)

        subprocess.run([*compose_file_args, "ps"], cwd=str(deploy_dir), env=run_env, check=False)
    finally:
        if local_override:
            local_override.unlink(missing_ok=True)

    hook_script = str(service.get("script") or "").strip()
    _run_post_deploy_hook(deploy_dir, service_name, deploy_env, hook_script)

    if run_seed:
        run_liquibase_seed(service_name, stack, service, repo_root, deploy_dir)

    log.ok(f"Deploy local completado.")
    log.info(f"URL directa: http://localhost:{port}")
    log.info(f"Logs: docker logs -f {service_name}")
    log.info(f"Compose service: {compose_service}")
    if follow_logs:
        log.step(f"Siguiendo logs del contenedor [{service_name}] (Ctrl+C para salir)...")
        try:
            subprocess.run(["docker", "logs", "-f", service_name], check=False)
        except KeyboardInterrupt:
            log.info("Seguimiento de logs finalizado.")
    return 0
