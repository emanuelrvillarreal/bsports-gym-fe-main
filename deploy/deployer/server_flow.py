# Flujo de despliegue en servidor: orquesta git checkout, docker compose y nginx
# para cada servicio definido en deploy.yml bajo el entorno activo del servidor.

import os
import re
import subprocess
import sys
import time
from pathlib import Path

from . import config, log
from .config import is_spring_stack, is_valid_stack, is_nginx_stack, resolve_template_path
from .errors import service_die, require_cmd, die, discord_notify
from .files import (write_runtime_env_file, ensure_default_dockerignore,
                    resolve_spring_application_properties, ensure_host_log_directory)
from .docker_ops import (remove_conflicting_containers, export_service_port_vars,
                          configure_frontend_build_env, configure_db_env, _clear_db_env,
                          wait_for_container, dump_diagnostics, remove_container_and_wait)
from .nginx_ops import configure_nginx_for_service, install_ssl_environment_fragments, requires_sudo_for_nginx
from .git_ops import checkout_service_branch, resolve_repo_root, validate_repo_root
from .yml_parser import list_services

_APPLIED_SERVICE_ENV_KEYS: set[str] = set()


def _require_non_empty(name: str, branch: str, field: str, value: str) -> None:
    """Termina si un campo requerido está vacío.

    Args:
        name: Nombre del servicio.
        branch: Branch activo.
        field: Nombre del campo validado.
        value: Valor a verificar.
    """
    if not value:
        service_die(name, branch, f"falta {field} en deploy.yml")


def _validate_stack(name, branch, stack, app_props, mysql_user, mysql_db, mysql_pass, mysql_ext_port,
                    pg_user, pg_db, pg_pass, pg_ext_port) -> None:
    """Valida que el stack y sus campos requeridos estén correctamente configurados.

    Args:
        name, branch: Identificadores del servicio para mensajes de error.
        stack: Tipo de stack declarado.
        app_props: Path a application.properties (requerido para Spring).
        mysql_*: Campos de MariaDB (requeridos para spring_maria).
        pg_*: Campos de PostgreSQL (requeridos para spring_postgres y python_postgres).
    """
    if not is_valid_stack(stack):
        service_die(name, branch, f"stack inválido [{stack}]")
    if is_spring_stack(stack):
        _require_non_empty(name, branch, "application_properties", app_props)
    if stack == "spring_maria":
        for f, v in [("mysql_user", mysql_user), ("mysql_db", mysql_db),
                     ("mysql_pass", mysql_pass), ("mysql_external_port", mysql_ext_port)]:
            _require_non_empty(name, branch, f, v)
    elif stack in ("spring_postgres", "python_postgres"):
        for f, v in [("postgres_user", pg_user), ("postgres_db", pg_db),
                     ("postgres_pass", pg_pass), ("postgres_external_port", pg_ext_port)]:
            _require_non_empty(name, branch, f, v)


def _run_post_deploy_hook(deploy_dir: Path, name: str, branch: str, hook_script: str) -> None:
    """Ejecuta el script post-deploy si está configurado.

    Args:
        deploy_dir: Path al directorio deploy/.
        name: Nombre del servicio.
        branch: Branch activo.
        hook_script: Path relativo al script bash a ejecutar.
    """
    if not hook_script:
        return
    repo_root = deploy_dir.parent
    p = Path(hook_script) if Path(hook_script).is_absolute() else repo_root / hook_script
    if not p.is_file():
        service_die(name, branch, f"script configurado pero no existe: {p}")
    if subprocess.run(["bash", str(p)], cwd=str(repo_root)).returncode != 0:
        service_die(name, branch, f"el script post-deploy falló: {p}")
    log.ok(f"Script post-deploy ejecutado: {p.name}")


def _apply_service_env_for_compose(row: dict) -> None:
    """Exporta env del servicio al proceso de Docker Compose.

    runtime.env pasa variables al contenedor. Las variables usadas por el
    docker-compose.yml, como RESTART_POLICY o LOGS_VOLUME, deben existir durante
    la interpolacion del compose.
    """
    global _APPLIED_SERVICE_ENV_KEYS
    env_block = row.get("env") or {}
    current_keys = set()
    if isinstance(env_block, dict):
        current_keys = {str(key).strip() for key in env_block.keys()}

    for key in _APPLIED_SERVICE_ENV_KEYS - current_keys:
        os.environ.pop(key, None)

    for key, value in env_block.items():
        os.environ[str(key).strip()] = str(value).strip()

    _APPLIED_SERVICE_ENV_KEYS = current_keys


def deploy_one_service(deploy_dir: Path, row: dict, force_recreate: bool = False) -> None:
    """Despliega un único servicio: git checkout, docker compose up y nginx.

    Args:
        deploy_dir: Path al directorio deploy/.
        row: Diccionario del servicio con todos sus campos normalizados.
    """
    name             = row["name"]
    stack            = row["stack"] or "spring"
    compose_service  = row["compose_service"] or "app"
    port             = row["port"]
    branch           = row["branch"]
    deploy_path      = row["path"]
    domain           = row["domain"]
    composer         = row["composer_file"]
    nginx_src        = row["nginx_config"]
    app_props        = row["application_properties"]
    hook_script      = row["script"]
    svc_environment  = row["environment"]
    mysql_user       = row["mysql_user"]
    mysql_db         = row["mysql_db"]
    mysql_pass       = row["mysql_pass"]
    mysql_ext_port   = row["mysql_external_port"]
    pg_user          = row["postgres_user"]
    pg_db            = row["postgres_db"]
    pg_pass          = row["postgres_pass"]
    pg_ext_port      = row["postgres_external_port"]
    nginx_connect_timeout = row["nginx_connect_timeout"]
    nginx_send_timeout = row["nginx_send_timeout"]
    nginx_read_timeout = row["nginx_read_timeout"]
    nginx_request_timeout = row["nginx_request_timeout"]

    config.CURRENT_SERVICE = name
    config.CURRENT_BRANCH = branch
    start_time = int(time.time())

    log.title(f"Desplegando: {name} | stack={stack} | branch={branch} | env={config.DEPLOY_ENV}")

    _require_non_empty(name, branch, "branch", branch)
    checkout_service_branch(name, branch, config.REPO_ROOT)
    discord_notify(f"{name} Docker {branch} {config.DEPLOY_ENV} ({stack}) - Start")

    composer  = resolve_template_path(composer)
    nginx_src = resolve_template_path(nginx_src)

    _require_non_empty(name, branch, "composer_file", composer)
    _require_non_empty(name, branch, "port", port)
    _validate_stack(name, branch, stack, app_props, mysql_user, mysql_db, mysql_pass, mysql_ext_port,
                    pg_user, pg_db, pg_pass, pg_ext_port)
    if is_spring_stack(stack):
        _require_non_empty(name, branch, "nginx_config", nginx_src)

    configure_frontend_build_env(stack, svc_environment)

    if nginx_src:
        require_cmd("sudo")

    composer_path = deploy_dir / composer if not Path(composer).is_absolute() else Path(composer)
    try:
        composer_path = composer_path.resolve()
    except Exception:
        pass
    if not composer_path.is_file():
        service_die(name, branch, f"no existe composer_file: {composer_path}")

    log.step("Preparando archivos de configuración...")
    if is_spring_stack(stack):
        os.environ["APPLICATION_PROPERTIES_FILE"] = resolve_spring_application_properties(
            config.REPO_ROOT, name, branch, app_props
        )
    ensure_default_dockerignore(Path(config.REPO_ROOT), name, branch)
    write_runtime_env_file(deploy_dir, name, branch, row)
    _apply_service_env_for_compose(row)
    export_service_port_vars(name, port, stack, deploy_path)

    if stack in ("spring_maria", "spring_postgres", "python_postgres"):
        compose_file_args = configure_db_env(stack, str(composer_path),
                                             mysql_user, mysql_db, mysql_pass, mysql_ext_port,
                                             pg_user, pg_db, pg_pass, pg_ext_port)
    else:
        compose_file_args = ["-f", str(composer_path)]
        _clear_db_env()

    if is_spring_stack(stack):
        ensure_host_log_directory(name)

    log.step("Removiendo contenedores conflictivos...")
    remove_conflicting_containers(name, branch, stack, compose_service)
    remove_container_and_wait(name, branch, name)

    log.step("Ejecutando docker compose up --build...")
    env = os.environ.copy()
    env["DOCKER_BUILDKIT"] = "1"
    env["COMPOSE_DOCKER_CLI_BUILD"] = "1"
    up_args = ["up", "-d", "--build"]
    if force_recreate:
        up_args.append("--force-recreate")
    r = subprocess.run(["docker", "compose"] + compose_file_args + up_args,
                       cwd=str(deploy_dir), env=env)
    if r.returncode != 0:
        service_die(name, branch, "docker compose falló (up -d --build)")

    log.step("Configurando nginx...")
    configure_nginx_for_service(deploy_dir, name, branch, port, deploy_path, nginx_src, domain,
                                nginx_connect_timeout, nginx_send_timeout, nginx_read_timeout, nginx_request_timeout)
    _run_post_deploy_hook(deploy_dir, name, branch, hook_script)
    wait_for_container(name, branch, compose_service, start_time, compose_file_args, deploy_dir)

    log.separator(f"Logs recientes ({name}, servicio {compose_service})")
    subprocess.run(["docker", "compose"] + compose_file_args + ["logs", "--no-color", "--tail=300", compose_service],
                   cwd=str(deploy_dir))
    log.separator("fin logs")

    log.ok(f"Deploy exitoso: {name}")
    log.info(f"  docker logs -f \"{name}\"")

    total_duration = int(time.time()) - start_time
    discord_notify(f"{name} Be {branch} {config.DEPLOY_ENV} ({stack}) - End - Duración: {total_duration}s")

    config.CURRENT_SERVICE = ""
    config.CURRENT_BRANCH = ""


def run_server_deploy(deploy_dir: Path, force_recreate: bool = False) -> None:
    """Punto de entrada del flujo de servidor: lee entorno, valida y despliega todos los servicios.

    Args:
        deploy_dir: Path al directorio deploy/.
    """
    require_cmd("docker")
    require_cmd("git")

    _read_deploy_env()
    _resolve_repo_root(deploy_dir)

    os.environ["DEPLOY_DIR"] = str(deploy_dir)
    os.environ["DEPLOY_ENV"] = config.DEPLOY_ENV
    os.environ["REPO_ROOT"] = config.REPO_ROOT

    deploy_yml = Path(config.REPO_ROOT) / "deploy.yml"
    if not deploy_yml.is_file():
        die(f"no existe deploy.yml en {config.REPO_ROOT}")

    log.step(f"Entorno: {config.DEPLOY_ENV} | Repo: {config.REPO_ROOT}")
    services = list_services(config.REPO_ROOT, config.DEPLOY_ENV)
    if requires_sudo_for_nginx(services, deploy_dir):
        require_cmd("sudo")

    for row in services:
        deploy_one_service(deploy_dir, row, force_recreate=force_recreate)

    install_ssl_environment_fragments(deploy_dir)
    log.title("Deploy completado")


def _read_deploy_env() -> None:
    """Lee la variable env= del archivo /home/.env y la asigna a config.DEPLOY_ENV."""
    env_file = config.HOME_ENV_FILE
    if not env_file.is_file():
        die(f"no existe {env_file}; no se puede determinar el entorno.")
    content = env_file.read_text(encoding="utf-8", errors="replace")
    m = re.search(r'^\s*[Ee][Nn][Vv]=(.+)$', content, re.MULTILINE)
    if not m:
        die(f"en {env_file} no se encontró la variable env= con valor no vacío.")
    val = m.group(1).strip().strip('"').strip("'").strip()
    if not val:
        die(f"en {env_file} no se encontró la variable env= con valor no vacío.")
    config.DEPLOY_ENV = val
    log.info(f"Entorno detectado: {config.DEPLOY_ENV}")


def _resolve_repo_root(deploy_dir: Path) -> None:
    """Detecta y valida el REPO_ROOT y lo asigna en config.

    Args:
        deploy_dir: Path al directorio deploy/.
    """
    root = resolve_repo_root(deploy_dir)
    validate_repo_root(root)
    config.REPO_ROOT = root
