# Utilidades de logging con colores ANSI para la consola.
# Provee funciones de log diferenciadas por nivel: info, ok, warn, error, step, title.

import sys

_RESET  = "\033[0m"
_BOLD   = "\033[1m"
_CYAN   = "\033[96m"
_GREEN  = "\033[92m"
_YELLOW = "\033[93m"
_RED    = "\033[91m"
_BLUE   = "\033[94m"
_GRAY   = "\033[90m"
_WHITE  = "\033[97m"


def _supports_color() -> bool:
    """Devuelve True si el terminal actual soporta colores ANSI."""
    return hasattr(sys.stdout, "isatty") and sys.stdout.isatty()


def _c(code: str, text: str) -> str:
    """Aplica un código de color solo si el terminal lo soporta."""
    if _supports_color():
        return f"{code}{text}{_RESET}"
    return text


def title(msg: str) -> None:
    """Imprime un encabezado de sección destacado."""
    print(_c(_BOLD + _BLUE, f"\n{'='*60}"))
    print(_c(_BOLD + _WHITE, f"  {msg}"))
    print(_c(_BOLD + _BLUE, f"{'='*60}"))


def step(msg: str) -> None:
    """Imprime un paso principal del flujo de deploy."""
    print(_c(_BOLD + _CYAN, f"\n▶ {msg}"))


def info(msg: str) -> None:
    """Imprime información general de progreso."""
    print(_c(_GRAY, f"  {msg}"))


def ok(msg: str) -> None:
    """Imprime un mensaje de éxito."""
    print(_c(_GREEN, f"  ✔ {msg}"))


def warn(msg: str) -> None:
    """Imprime una advertencia (no detiene la ejecución)."""
    print(_c(_YELLOW, f"  ⚠ {msg}"), file=sys.stderr)


def error(msg: str) -> None:
    """Imprime un mensaje de error crítico."""
    print(_c(_BOLD + _RED, f"  ✘ {msg}"), file=sys.stderr)


def separator(label: str = "") -> None:
    """Imprime una línea separadora, opcionalmente con etiqueta."""
    if label:
        print(_c(_GRAY, f"\n---------- {label} ----------"))
    else:
        print(_c(_GRAY, f"\n{'─'*60}"))
