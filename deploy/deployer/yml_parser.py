# Parser de deploy.yml: carga el archivo YAML y extrae la lista de servicios por entorno.
# Incluye un parser manual liviano para entornos sin python3-yaml instalado.

import re
from pathlib import Path
from typing import Any

from . import config, log
from .errors import die


# --- Parser YAML liviano (fallback sin librería yaml) ---

def _strip_comment(text: str) -> str:
    """Elimina el comentario inline de una línea YAML respetando strings entre comillas.

    Args:
        text: Línea YAML sin el indent.
    Returns:
        Línea sin el comentario trailing.
    """
    quote = None
    escaped = False
    for i, ch in enumerate(text):
        if escaped:
            escaped = False
            continue
        if ch == "\\":
            escaped = True
            continue
        if ch in {"'", '"'}:
            if quote == ch:
                quote = None
            elif quote is None:
                quote = ch
            continue
        if ch == "#" and quote is None:
            return text[:i].rstrip()
    return text.rstrip()


def _parse_scalar(value: str) -> Any:
    """Convierte un valor YAML inline a su tipo Python equivalente.

    Args:
        value: String cruda del valor (después del ':').
    Returns:
        str, int, float, bool o None según el contenido.
    """
    text = _strip_comment(value).strip()
    if not text:
        return ""
    if (text.startswith('"') and text.endswith('"')) or (text.startswith("'") and text.endswith("'")):
        return text[1:-1]
    lowered = text.lower()
    if lowered == "true":
        return True
    if lowered == "false":
        return False
    if lowered in {"null", "~"}:
        return None
    if re.match(r"^-?\d+$", text):
        return int(text)
    if re.match(r"^-?\d+\.\d+$", text):
        return float(text)
    return text


def _load_simple_yaml(path: Path) -> dict[str, Any]:
    """Parsea un archivo YAML simple (sin listas ni anclas) de manera manual.

    Args:
        path: Path al archivo YAML.
    Returns:
        Diccionario con la estructura del YAML.
    """
    root: dict[str, Any] = {}
    stack: list[tuple[int, dict[str, Any]]] = [(-1, root)]
    for lineno, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if not raw.strip() or raw.lstrip().startswith("#"):
            continue
        indent = len(raw) - len(raw.lstrip(" "))
        content = _strip_comment(raw.strip())
        if not content:
            continue
        if ":" not in content:
            die(f"{path}:{lineno}: línea YAML no soportada por el parser local")
        key, raw_value = content.split(":", 1)
        key = key.strip()
        if not key:
            die(f"{path}:{lineno}: clave YAML vacía")
        while indent <= stack[-1][0]:
            stack.pop()
        parent = stack[-1][1]
        if raw_value.strip() == "":
            child: dict[str, Any] = {}
            parent[key] = child
            stack.append((indent, child))
        else:
            parent[key] = _parse_scalar(raw_value)
    return root


def load_yaml(path: Path) -> dict[str, Any]:
    """Carga un archivo YAML usando python3-yaml si está disponible, o el parser manual.

    Args:
        path: Path al archivo YAML a cargar.
    Returns:
        Diccionario con el contenido del YAML.
    """
    try:
        import yaml
    except ImportError:
        log.warn("python3-yaml no encontrado; usando parser manual.")
        return _load_simple_yaml(path)
    with path.open(encoding="utf-8") as f:
        data = yaml.safe_load(f)
    if not isinstance(data, dict):
        die(f"{path} no contiene un mapa YAML válido")
    return data


# --- Extracción de servicios ---

def list_services(repo_root: str, deploy_env: str) -> list[dict]:
    """Carga deploy.yml y devuelve la lista de servicios del entorno dado.

    Args:
        repo_root: Path raíz del repositorio (donde está deploy.yml).
        deploy_env: Nombre del entorno a desplegar (ej. 'prod', 'staging').
    Returns:
        Lista de dicts con todos los campos normalizados de cada servicio.
    """
    path = Path(repo_root) / "deploy.yml"
    if not path.is_file():
        die(f"no existe {path}")
    data = load_yaml(path)
    if not isinstance(data, dict) or deploy_env not in data:
        die(f"en deploy.yml no existe el entorno [{deploy_env}]")
    block = data[deploy_env]
    if not isinstance(block, dict):
        die(f"bloque [{deploy_env}] no es un mapa en deploy.yml")
    services = []
    for svc_name, cfg in block.items():
        if not isinstance(cfg, dict):
            continue
        services.append({
            "name": svc_name,
            "stack": str(cfg.get("stack", "spring") or "spring").strip().lower(),
            "compose_service": str(cfg.get("compose_service", "") or "app").strip(),
            "port": str(cfg.get("port", "")).strip(),
            "branch": str(cfg.get("branch", "")).strip(),
            "path": str(cfg.get("path", "") or "").strip(),
            "domain": str(cfg.get("domain", "") or "").strip(),
            "ssl": str(cfg.get("ssl", "") or "").strip(),
            "composer_file": str(cfg.get("composer_file", "") or "").strip(),
            "nginx_config": str(cfg.get("nginx_config", "") or "").strip(),
            "application_properties": str(cfg.get("application_properties", "") or "").strip(),
            "script": str(cfg.get("script", "") or "").strip(),
            "environment": str(cfg.get("environment", "") or "").strip(),
            "mysql_user": str(cfg.get("mysql_user", "") or "").strip(),
            "mysql_db": str(cfg.get("mysql_db", "") or "").strip(),
            "mysql_pass": str(cfg.get("mysql_pass", "") or "").strip(),
            "mysql_external_port": str(cfg.get("mysql_external_port", "") or "").strip(),
            "postgres_user": str(cfg.get("postgres_user", "") or "").strip(),
            "postgres_db": str(cfg.get("postgres_db", "") or "").strip(),
            "postgres_pass": str(cfg.get("postgres_pass", "") or "").strip(),
            "postgres_external_port": str(cfg.get("postgres_external_port", "") or "").strip(),
            "nginx_connect_timeout": str(cfg.get("nginx_connect_timeout", "") or "").strip(),
            "nginx_send_timeout": str(cfg.get("nginx_send_timeout", "") or "").strip(),
            "nginx_read_timeout": str(cfg.get("nginx_read_timeout", "") or "").strip(),
            "nginx_request_timeout": str(cfg.get("nginx_request_timeout", "") or "").strip(),
            "env": cfg.get("env") if isinstance(cfg.get("env"), dict) else {},
        })
    log.info(f"{len(services)} servicio(s) encontrado(s) en [{deploy_env}]")
    return services


def select_service(data: dict[str, Any], deploy_env: str, service_name: str | None) -> tuple[str, dict]:
    """Selecciona un servicio específico o el primero del entorno dado.

    Args:
        data: Diccionario completo cargado del deploy.yml.
        deploy_env: Nombre del entorno.
        service_name: Nombre del servicio a seleccionar; None para tomar el primero.
    Returns:
        Tupla (nombre_servicio, dict_servicio).
    """
    block = data.get(deploy_env)
    if not isinstance(block, dict):
        die(f"en deploy.yml no existe el entorno [{deploy_env}] o no es un mapa")
    if service_name:
        service = block.get(service_name)
        if not isinstance(service, dict):
            die(f"en deploy.yml no existe el servicio [{service_name}] bajo [{deploy_env}]")
        return service_name, service
    for name, service in block.items():
        if isinstance(service, dict):
            return str(name), service
    die(f"el entorno [{deploy_env}] no tiene servicios")
