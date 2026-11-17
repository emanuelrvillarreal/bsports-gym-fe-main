# Manejo de errores y notificaciones Discord.
# Provee funciones para notificar y terminar la ejecución ante fallos críticos.

import json
import sys
import urllib.request

from . import config, log


def discord_notify(msg: str) -> None:
    """Envía un mensaje al webhook de Discord configurado. Silencia errores de red."""
    try:
        payload = json.dumps({"content": msg}).encode("utf-8")
        req = urllib.request.Request(
            config.DISCORD_WEBHOOK,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        urllib.request.urlopen(req, timeout=10)
    except Exception:
        log.warn("No se pudo enviar notificación a Discord.")


def die(msg: str) -> None:
    """Notifica a Discord, imprime el error y termina con código 1.

    Args:
        msg: Mensaje de error descriptivo.
    """
    discord_notify(msg)
    log.error(msg)
    sys.exit(1)


def service_die(name: str, branch: str, reason: str) -> None:
    """Termina el proceso con error formateado para un servicio específico.

    Args:
        name: Nombre del servicio.
        branch: Branch activo.
        reason: Descripción del fallo.
    """
    die(f"{name} Be {branch} {config.DEPLOY_ENV} - End | {reason}")


def require_cmd(cmd: str) -> None:
    """Verifica que un comando externo esté disponible en el PATH. Termina si no existe.

    Args:
        cmd: Nombre del ejecutable requerido.
    """
    import shutil
    if shutil.which(cmd) is None:
        die(f"deploy: falta el comando requerido: {cmd}")
