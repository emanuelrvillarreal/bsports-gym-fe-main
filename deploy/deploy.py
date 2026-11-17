#!/usr/bin/env python3
# Entry point del sistema de deploy.
# Con --local ejecuta el flujo local (sin git/nginx/Discord).
# Sin --local ejecuta el flujo de servidor completo.
#
# Uso:
#   python deploy.py                          # servidor, entorno desde /home/.env
#   python deploy.py --local [env] [servicio] # local, entorno 'local' por defecto
#   python deploy.py --local --delete-db      # local borrando volúmenes de DB

import sys
import traceback
from pathlib import Path

DEPLOY_DIR = Path(__file__).resolve().parent

sys.path.insert(0, str(DEPLOY_DIR))

from deployer import config, log
from deployer.errors import discord_notify


def _print_version() -> None:
    """Lee version.yml y muestra la versión del deployer."""
    version_file = DEPLOY_DIR / "version.yml"
    if version_file.is_file():
        for line in version_file.read_text(encoding="utf-8").splitlines():
            if line.strip().startswith("version"):
                ver = line.split(":", 1)[-1].strip().strip('"')
                log.info(f"deploy version {ver}")
                return
    log.info("deploy version desconocida")


def _print_help() -> None:
    """Muestra los modos, argumentos y opciones disponibles."""
    print("""Uso:
  python deploy.py                         Despliega en el servidor.
  python deploy.py --local [entorno] [servicio] [opciones]
                                           Despliega localmente con Docker Compose.

Argumentos del modo local:
  entorno                                  Bloque de deploy.yml (default: local).
  servicio                                 Servicio del bloque (default: el primero).

Opciones:
  --local                                  Activa el modo de despliegue local.
  --delete-db                              Elimina volúmenes de base de datos antes
                                           del deploy. Solo disponible con --local.
  --seed                                   Ejecuta el seed de Liquibase (contexto
                                           'seed') luego de que la app termine de
                                           levantar. Solo disponible con --local.
  -f                                       Al finalizar el deploy local, ejecuta
                                           docker logs -f del contenedor de aplicación.
  -fc                                      Agrega --force-recreate al docker compose up
                                           (funciona con y sin --local).
  -h, --help                               Muestra esta ayuda y termina.

Ejemplos:
  python deploy.py --local
  python deploy.py --local local decretos-be
  python deploy.py --local --delete-db
  python deploy.py --local local decretos-be -f
""")


def main() -> None:
    """Punto de entrada principal: decide el flujo según los argumentos recibidos."""
    args = sys.argv[1:]
    if "-h" in args or "--help" in args:
        _print_help()
        return

    _print_version()

    is_local = "--local" in args
    remaining = [a for a in args if a != "--local"]

    if "--delete-db" in remaining and not is_local:
        log.error("--delete-db solo puede usarse con --local.")
        sys.exit(1)
    if "-f" in remaining and not is_local:
        log.error("-f solo puede usarse con --local.")
        sys.exit(1)
    if "--seed" in remaining and not is_local:
        log.error("--seed solo puede usarse con --local.")
        sys.exit(1)
    if is_local:
        from deployer.local_flow import run_local_deploy
        code = run_local_deploy(DEPLOY_DIR, remaining)
        sys.exit(code)
    else:
        from deployer.server_flow import run_server_deploy
        run_server_deploy(DEPLOY_DIR, force_recreate="-fc" in remaining)


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception as exc:
        ctx = "deploy"
        if config.CURRENT_SERVICE:
            ctx = f"deploy: servicio={config.CURRENT_SERVICE}"
            if config.CURRENT_BRANCH:
                ctx += f" branch={config.CURRENT_BRANCH}"
            if config.DEPLOY_ENV:
                ctx += f" env={config.DEPLOY_ENV}"
        msg = f"{ctx}: ERROR inesperado: {exc}"
        log.error(msg)
        traceback.print_exc()
        discord_notify(msg)
        sys.exit(1)
