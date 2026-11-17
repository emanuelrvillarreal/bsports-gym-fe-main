# Constantes globales y registro de stacks soportados.
# Define paths de plantillas, webhook de Discord y variables de estado compartido.

from pathlib import Path

DISCORD_WEBHOOK = "https://discord.com/api/webhooks/1200063276776693941/6hc1XPVrOcTyCpw0Qo17mf1JOQvXo6Y8OGBH21nqzNeWwr4Evnn2HIKu_G53n_uJiyGs"
HOME_ENV_FILE = Path("/home/.env")

PLANTILLAS_DIR = "plantillas"
STACK_SPRING_DIR         = f"{PLANTILLAS_DIR}/spring-3.9-java-17"
STACK_SPRING_MARIA_DIR   = f"{PLANTILLAS_DIR}/spring-3.9-java-17-maria-11"
STACK_SPRING_POSTGRES_DIR = f"{PLANTILLAS_DIR}/spring-3.9-java-17-postgres-18-4"

# Estado global mutable (modificado por server_flow durante el despliegue)
REPO_ROOT: str = ""
DEPLOY_ENV: str = ""
CURRENT_SERVICE: str = ""
CURRENT_BRANCH: str = ""


def is_spring_stack(stack: str) -> bool:
    """Devuelve True si el stack es uno de los tres tipos Spring Boot."""
    return stack in ("spring", "spring_maria", "spring_postgres")


def is_nginx_stack(stack: str) -> bool:
    """Devuelve True si el stack es de tipo nginx estático (prefijo nginx-)."""
    return stack.startswith("nginx-")


def is_valid_stack(stack: str) -> bool:
    """Devuelve True si el stack es un valor reconocido."""
    return stack in ("spring", "spring_maria", "spring_postgres", "angular", "angular_ssr",
                     "tanstack", "python_postgres", "vue", "simple") or is_nginx_stack(stack)


def resolve_template_path(path: str) -> str:
    """Prefija 'plantillas/' si el path es relativo y no lo incluye ya."""
    from pathlib import Path as _Path
    if not path or _Path(path).is_absolute() or path.startswith(f"{PLANTILLAS_DIR}/"):
        return path
    return f"{PLANTILLAS_DIR}/{path}"


def spring_stack_dir(stack: str) -> str:
    """Devuelve el subdirectorio de plantilla correspondiente al stack Spring dado."""
    return {
        "spring": STACK_SPRING_DIR,
        "spring_maria": STACK_SPRING_MARIA_DIR,
        "spring_postgres": STACK_SPRING_POSTGRES_DIR,
    }.get(stack, "")
