# Operaciones nginx: instalación de fragmentos SSL por servicio y por entorno.
# Solo aplica al flujo de servidor; el flujo local omite nginx.

import os
import re
import subprocess
import tempfile
from pathlib import Path

from . import config, log
from .errors import service_die, require_cmd, die


def _run_nginx_test_or_die(die_msg: str) -> None:
    """Ejecuta nginx -t y termina con error si la configuración es inválida.

    Args:
        die_msg: Prefijo del mensaje de error enviado a Discord si nginx -t falla.
    """
    with tempfile.NamedTemporaryFile(delete=False, suffix=".log") as lf:
        log_file = lf.name
    with open(log_file, "wb") as lf:
        r = subprocess.run(["sudo", "nginx", "-t"], stdout=lf, stderr=lf)
    if r.returncode == 0:
        os.unlink(log_file)
        log.ok("nginx -t OK")
        return
    log.error("nginx -t falló.")
    with open(log_file) as lf:
        print(lf.read())
    with open(log_file) as lf:
        snippet = lf.read(1500).replace("\n", " ")
    os.unlink(log_file)
    die(f"{die_msg}: {snippet}")


def configure_nginx_for_service(deploy_dir: Path, name: str, branch: str,
                                 port: str, deploy_path: str, nginx_src: str, domain: str,
                                 nginx_connect_timeout: str = "", nginx_send_timeout: str = "",
                                 nginx_read_timeout: str = "", nginx_request_timeout: str = "") -> None:
    """Renderiza y instala el fragmento nginx SSL del servicio en /etc/nginx/snippets/ssl-fragments/.

    Args:
        deploy_dir: Path al directorio deploy/.
        name: Nombre del servicio (usado como nombre del archivo .conf).
        branch: Branch activo (para errores).
        port: Puerto del servicio para reemplazar {PORT} en la plantilla.
        deploy_path: Sub-path para reemplazar {PATH}; vacío = usar plantilla -root.conf.
        nginx_src: Path relativo o absoluto al archivo de plantilla nginx.
        domain: Dominio del servicio; si se provee, se agrega como comentario al inicio.
        nginx_connect_timeout: Timeout de conexión proxy (ej. "300s"), opcional.
        nginx_send_timeout: Timeout de envío proxy (ej. "1800s"), opcional.
        nginx_read_timeout: Timeout de lectura proxy (ej. "1800s"), opcional.
        nginx_request_timeout: Timeout de request (send_timeout) (ej. "1800s"), opcional.
    """
    if not nginx_src:
        require_cmd("sudo")
        subprocess.run(["sudo", "rm", "-f", f"/etc/nginx/snippets/ssl-fragments/{name}.conf"], check=True)
        return
    nginx_path = _resolve(deploy_dir, nginx_src)
    if not nginx_path.is_file():
        service_die(name, branch, f"nginx_config no encontrado: {nginx_path}")
    content = nginx_path.read_text(encoding="utf-8-sig")
    if "{PATH}" in content and not deploy_path:
        root_src = (nginx_src[:-5] if nginx_src.endswith(".conf") else nginx_src) + "-root.conf"
        root_path = _resolve(deploy_dir, root_src)
        if not root_path.is_file():
            service_die(name, branch, f"falta path en deploy.yml y no existe plantilla root: {root_path}")
        nginx_src = root_src
        nginx_path = root_path
        content = nginx_path.read_text(encoding="utf-8-sig")
    rendered = content.replace("{PATH}", deploy_path).replace("{PORT}", port)
    rendered = rendered.replace("{PROXY_CONNECT_TIMEOUT}", nginx_connect_timeout or "60s")
    rendered = rendered.replace("{PROXY_SEND_TIMEOUT}", nginx_send_timeout or "60s")
    rendered = rendered.replace("{PROXY_READ_TIMEOUT}", nginx_read_timeout or "60s")
    rendered = rendered.replace("{SEND_TIMEOUT}", nginx_request_timeout or "60s")
    if domain:
        rendered = f"# domain: {domain}\n" + rendered
    if re.search(r'^\s*server\s*\{', content, re.MULTILINE):
        return
    tmp_fd, rendered_path = tempfile.mkstemp(suffix=".conf")
    try:
        os.close(tmp_fd)
        with open(rendered_path, "w", encoding="utf-8") as f:
            f.write(rendered)
        require_cmd("sudo")
        subprocess.run(["sudo", "mkdir", "-p", "/etc/nginx/snippets/ssl-fragments"], check=True)
        subprocess.run(["sudo", "rm", "-f", f"/etc/nginx/snippets/ssl-fragments/{name}.conf"], check=True)
        r = subprocess.run(["sudo", "install", "-m", "644", rendered_path,
                            f"/etc/nginx/snippets/ssl-fragments/{name}.conf"])
        if r.returncode != 0:
            service_die(name, branch, f"no se pudo escribir fragmento nginx /etc/nginx/snippets/ssl-fragments/{name}.conf")
        log.ok(f"Fragmento nginx instalado: /etc/nginx/snippets/ssl-fragments/{name}.conf")
    finally:
        try:
            os.unlink(rendered_path)
        except Exception:
            pass


def install_ssl_environment_fragments(deploy_dir: Path) -> None:
    """Instala todos los fragmentos SSL del entorno actual desde deploy/nginx/ssl-fragments/<env>/.

    Args:
        deploy_dir: Path al directorio deploy/.
    """
    from .errors import discord_notify
    frag_dir = deploy_dir / "nginx" / "ssl-fragments" / config.DEPLOY_ENV
    target = "/etc/nginx/snippets/ssl-fragments"
    if not frag_dir.is_dir():
        return
    files = list(frag_dir.glob("*.conf"))
    if not files:
        return
    log.step(f"Instalando {len(files)} fragmentos SSL del entorno {config.DEPLOY_ENV}...")
    require_cmd("sudo")
    subprocess.run(["sudo", "mkdir", "-p", target], check=True)
    for f in files:
        subprocess.run(["sudo", "install", "-m", "644", str(f), f"{target}/{f.name}"], check=True)
    _run_nginx_test_or_die(f"nginx -t falló tras instalar fragmentos en {target}")
    discord_notify(f"deploy: fragmentos nginx ({config.DEPLOY_ENV}) instalados en {target} ({len(files)} .conf). Reload a cargo del orquestador.")
    log.ok(f"Fragmentos SSL del entorno instalados en {target}")


def requires_sudo_for_nginx(services: list, deploy_dir: Path) -> bool:
    """Determina si algún servicio o fragmento de entorno requiere sudo para nginx.

    Args:
        services: Lista de dicts de servicios leídos del deploy.yml.
        deploy_dir: Path al directorio deploy/.
    Returns:
        True si algún servicio necesita operar nginx con sudo.
    """
    from .config import is_spring_stack
    frag_dir = deploy_dir / "nginx" / "ssl-fragments" / config.DEPLOY_ENV
    has_env_fragments = frag_dir.is_dir() and any(frag_dir.glob("*.conf"))
    has_service_nginx = any(is_spring_stack(row["stack"]) or row.get("nginx_config") for row in services)
    return has_service_nginx or has_env_fragments


def _resolve(deploy_dir: Path, rel: str) -> Path:
    """Resuelve un path relativo a deploy_dir, o lo devuelve tal cual si es absoluto."""
    p = Path(rel) if Path(rel).is_absolute() else deploy_dir / rel
    try:
        return p.resolve()
    except Exception:
        return p
