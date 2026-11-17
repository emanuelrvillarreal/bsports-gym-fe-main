# Operaciones sobre archivos del proyecto: runtime.env, application.properties, .dockerignore.
# Prepara los archivos de configuración que Docker necesita antes del build.

import json
import os
import re
import shutil
import tempfile
from pathlib import Path

from . import config, log
from .errors import service_die

_RESERVED_ENV_KEYS = {"CONTAINER_NAME", "NAME"}

_DEFAULT_DOCKERIGNORE = (
    ".git/\n.idea/\n.vscode/\nnode_modules/\n.npm/\n.pnpm-store/\n"
    ".yarn/cache/\n.angular/cache/\n.next/\n.nuxt/\n.turbo/\n"
    "coverage/\ntarget/\n.m2/\n.gradle/\n"
    "deploy/runtime.env\ndeploy/local-logs/\n"
)

_RESERVED_LOCAL = {
    "stack","port","branch","path","domain","ssl","composer_file","nginx_config",
    "application_properties","script","environment","compose_service","env",
    "mysql_user","mysql_db","mysql_pass","mysql_external_port",
    "postgres_user","postgres_db","postgres_pass","postgres_external_port",
    "CONTAINER_NAME","EXTERNAL_PORT","INTERNAL_PORT","NAME","PORT",
    "MYSQL_USER","MYSQL_DB","MYSQL_PASS","MYSQL_ROOT_PASSWORD","MYSQL_EXTERNAL_PORT",
    "POSTGRES_USER","POSTGRES_DB","POSTGRES_PASS","POSTGRES_EXTERNAL_PORT",
    "SPRING_CONFIG_LOCATION","APPLICATION_PROPERTIES_FILE","LOGGING_FILE_PATH","LOGGING_FILE_NAME","LOGGING_FILE_BASENAME","LOGS_VOLUME",
    "NG_BUILD_CONFIGURATION","NG_APP_BASE_HREF","VITE_BUILD_MODE","VITE_BASE_PATH","APP_BASE_PATH",
}


def _format_dotenv_value(value) -> str:
    """Convierte un valor escalar a su representación en formato dotenv.

    Args:
        value: Valor escalar (str, int, float, bool, None).
    Returns:
        String listo para escribir en el archivo .env.
    Raises:
        ValueError: Si el valor no es escalar.
    """
    if isinstance(value, bool):
        text = "true" if value else "false"
    elif isinstance(value, (int, float)):
        text = str(value)
    elif value is None:
        text = ""
    elif isinstance(value, str):
        text = value
    else:
        raise ValueError("valor debe ser escalar (string, número o booleano)")
    if re.search(r'[\s#"\'\\]', text) or text == "":
        return json.dumps(text, ensure_ascii=False)
    return text


def write_runtime_env_file(deploy_dir: Path, name: str, branch: str, service_row: dict) -> None:
    """Escribe deploy/runtime.env con las variables de entorno del servicio.

    Args:
        deploy_dir: Path al directorio deploy/.
        name: Nombre del servicio (para errores).
        branch: Branch activo (para errores).
        service_row: Diccionario del servicio leído del deploy.yml.
    """
    dest = deploy_dir / "runtime.env"
    env = service_row.get("env")
    if env is None:
        env = {}
    if not isinstance(env, dict):
        service_die(name, branch, "env debe ser un mapa clave-valor en deploy.yml")
    lines = []
    for key, value in env.items():
        k = str(key).strip()
        if not re.match(r"^[A-Za-z_][A-Za-z0-9_]*$", k):
            service_die(name, branch, f"env: clave inválida [{k}]")
        if k in _RESERVED_ENV_KEYS or k.upper() in {x.upper() for x in _RESERVED_ENV_KEYS}:
            service_die(name, branch, f"env: clave reservada [{k}]")
        try:
            lines.append(f"{k}={_format_dotenv_value(value)}")
        except ValueError as exc:
            service_die(name, branch, f"env[{k}]: {exc}")
    with open(str(dest), "w", encoding="utf-8") as f:
        if lines:
            f.write("\n".join(lines) + "\n")
    log.info(f"runtime.env escrito ({len(lines)} variables)")


def write_runtime_env_local(deploy_dir: Path, service: dict, stack: str) -> None:
    """Escribe runtime.env para uso local, con validación extendida de claves reservadas.

    Args:
        deploy_dir: Path al directorio deploy/.
        service: Diccionario del servicio.
        stack: Nombre del stack activo.
    """
    from .errors import die
    env_block = service.get("env") or {}
    if not isinstance(env_block, dict):
        die("env debe ser un mapa clave-valor en deploy.yml")
    reserved_upper = {k.upper() for k in _RESERVED_LOCAL}
    if stack in ("spring_maria", "spring_postgres", "python_postgres"):
        reserved_upper |= {"SPRING_DATASOURCE_URL", "SPRING_DATASOURCE_USERNAME", "SPRING_DATASOURCE_PASSWORD"}
    lines = []
    for raw_key, value in env_block.items():
        key = str(raw_key).strip()
        if not re.match(r"^[A-Za-z_][A-Za-z0-9_]*$", key):
            die(f"env: clave inválida [{key}]")
        if key.upper() in reserved_upper:
            die(f"env: clave reservada [{key}]")
        lines.append(f"{key}={_format_dotenv_value(value)}")
    (deploy_dir / "runtime.env").write_text(
        ("\n".join(lines) + "\n") if lines else "",
        encoding="utf-8",
    )
    log.info(f"runtime.env local escrito ({len(lines)} variables)")


def ensure_default_dockerignore(repo_root: Path, name: str, branch: str) -> None:
    """Crea .dockerignore en la raíz del repo si no existe.

    Args:
        repo_root: Path raíz del repositorio.
        name: Nombre del servicio (para errores).
        branch: Branch activo (para errores).
    """
    dockerignore = Path(repo_root) / ".dockerignore"
    if dockerignore.is_file():
        return
    tmp = tempfile.NamedTemporaryFile(mode="w", delete=False, encoding="utf-8")
    try:
        tmp.write(_DEFAULT_DOCKERIGNORE)
        tmp.close()
        shutil.move(tmp.name, str(dockerignore))
        log.info(".dockerignore creado con valores por defecto")
    except Exception:
        try:
            os.unlink(tmp.name)
        except Exception:
            pass
        service_die(name, branch, "no se pudo escribir .dockerignore")


def resolve_spring_application_properties(repo_root: str, name: str, branch: str, app_props: str) -> str:
    """Valida y devuelve el path absoluto del application.properties configurado.

    Args:
        repo_root: Path raíz del repositorio.
        name: Nombre del servicio.
        branch: Branch activo.
        app_props: Path relativo o absoluto al archivo application.properties.
    Returns:
        Path absoluto al archivo que Docker montará en el contenedor.
    """
    src = Path(app_props) if Path(app_props).is_absolute() else Path(repo_root) / app_props
    if not src.is_file():
        service_die(name, branch, f"no existe application_properties: {src}")
    try:
        resolved = str(src.resolve())
    except Exception:
        service_die(name, branch, f"no se pudo resolver application_properties: {src}")
    log.info(f"application.properties: {resolved}")
    return resolved


def ensure_host_log_directory(svc_name: str) -> None:
    """Crea /var/log/<svc_name> con el UID/GID del contenedor Docker (10001).

    Args:
        svc_name: Nombre del servicio; se usa para el path /var/log/<svc_name>.
    """
    import subprocess
    from .errors import die
    docker_uid, docker_gid = 10001, 10001
    host_log_dir = f"/var/log/{svc_name}"
    if not Path("/var/log").is_dir():
        log.warn(f"No existe /var/log; omitiendo preparación de {host_log_dir}.")
        return
    if os.getuid() == 0:
        if subprocess.run(["mkdir", "-p", host_log_dir]).returncode != 0:
            die(f"{svc_name}: no se pudo crear {host_log_dir}")
        if subprocess.run(["chown", "-R", f"{docker_uid}:{docker_gid}", host_log_dir]).returncode != 0:
            die(f"{svc_name}: no se pudo chown {host_log_dir}")
        return
    if shutil.which("sudo") is None:
        die(f"{svc_name}: se requiere sudo o root para preparar {host_log_dir}")
    if subprocess.run(["sudo", "mkdir", "-p", host_log_dir]).returncode != 0:
        die(f"{svc_name}: sudo mkdir falló en {host_log_dir}")
    if subprocess.run(["sudo", "chown", "-R", f"{docker_uid}:{docker_gid}", host_log_dir]).returncode != 0:
        die(f"{svc_name}: sudo chown falló en {host_log_dir}")
    log.info(f"Directorio de logs host preparado: {host_log_dir}")
