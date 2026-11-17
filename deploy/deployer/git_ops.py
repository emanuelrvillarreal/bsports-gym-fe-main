# Operaciones Git: validación de repo, limpieza de worktree y checkout de branches.
# Solo se usa en el flujo de servidor; el flujo local omite estas operaciones.

import os
import subprocess
from pathlib import Path

from . import config, log
from .errors import die, service_die


def validate_repo_root(root: str) -> Path:
    """Valida que REPO_ROOT sea un directorio git seguro para operaciones destructivas.

    Args:
        root: Path absoluto al repositorio de la aplicación.
    Returns:
        Path resuelto y validado del repo root.
    """
    deploy_dir = Path(config.REPO_ROOT).resolve() if config.REPO_ROOT else Path(root).resolve()
    try:
        root_path = Path(root).resolve()
        deploy_path = Path(__file__).resolve().parent.parent
        common = Path(os.path.commonpath([str(root_path), str(deploy_path)]))
    except Exception:
        die(f"REPO_ROOT inválido para limpieza git: {root}")

    if common != root_path:
        die(f"protección git: DEPLOY_DIR {deploy_path} no está dentro de REPO_ROOT {root_path}")
    if root_path == deploy_path:
        die(f"protección git: REPO_ROOT apunta al directorio deploy, no al repo de app ({root_path})")
    if not (root_path / ".git").exists():
        die(f"protección git: REPO_ROOT no parece un repo git ({root_path})")
    if not (root_path / "deploy.yml").is_file():
        die(f"protección git: no existe deploy.yml en REPO_ROOT ({root_path})")
    if root_path.parent == root_path or str(root_path) in ("/", "/home"):
        die(f"protección git: REPO_ROOT demasiado amplio ({root_path})")
    return root_path


def clean_git_worktree(root: str) -> None:
    """Descarta todos los cambios locales del repo (reset --hard + clean -fd).

    Args:
        root: Path al directorio del repositorio.
    """
    root_path = validate_repo_root(root)
    log.info(f"Descartando cambios locales en {root_path}...")
    subprocess.run(["git", "reset", "--hard", "HEAD"], check=True, cwd=str(root_path))
    subprocess.run(["git", "clean", "-fd"], check=True, cwd=str(root_path))


def checkout_service_branch(svc_name: str, branch: str, root: str) -> None:
    """Hace fetch y checkout de la branch del servicio en el repositorio.

    Args:
        svc_name: Nombre del servicio (para logs y mensajes Discord).
        branch: Nombre de la branch a activar.
        root: Path al directorio del repositorio.
    """
    clean_git_worktree(root)
    log.step(f"[{svc_name}] Fetch y checkout de rama: {branch}")

    r = subprocess.run(["git", "fetch", "origin", branch], capture_output=True, cwd=root)
    if r.returncode != 0:
        r2 = subprocess.run(["git", "fetch", "origin"], cwd=root)
        if r2.returncode != 0:
            die(f"{svc_name} {branch} {config.DEPLOY_ENV} - End | git fetch falló")

    clean_git_worktree(root)

    if subprocess.run(["git", "show-ref", "--verify", "--quiet", f"refs/remotes/origin/{branch}"], cwd=root).returncode == 0:
        r1 = subprocess.run(["git", "checkout", "-B", branch, f"origin/{branch}"], cwd=root)
        r2 = subprocess.run(["git", "reset", "--hard", f"origin/{branch}"], cwd=root)
        if r1.returncode != 0 or r2.returncode != 0:
            die(f"{svc_name} {branch} {config.DEPLOY_ENV} - End | checkout origin/{branch} falló")
    elif subprocess.run(["git", "rev-parse", "--verify", branch], capture_output=True, cwd=root).returncode == 0:
        r1 = subprocess.run(["git", "checkout", branch], cwd=root)
        r2 = subprocess.run(["git", "reset", "--hard", "HEAD"], cwd=root)
        if r1.returncode != 0 or r2.returncode != 0:
            die(f"{svc_name} {branch} {config.DEPLOY_ENV} - End | checkout {branch} falló")
    else:
        die(f"{svc_name} {branch} {config.DEPLOY_ENV} - End | rama '{branch}' no existe en origin ni local")

    clean_git_worktree(root)
    head = subprocess.run(["git", "rev-parse", "--abbrev-ref", "HEAD"], capture_output=True, text=True, cwd=root).stdout.strip()
    short = subprocess.run(["git", "rev-parse", "--short", "HEAD"], capture_output=True, text=True, cwd=root).stdout.strip()
    log.ok(f"[{svc_name}] Rama activa: {head} ({short})")


def resolve_repo_root(deploy_dir: Path) -> str:
    """Detecta el repo root a partir del directorio deploy/ usando git rev-parse.

    Args:
        deploy_dir: Path al directorio deploy/.
    Returns:
        Path absoluto al repo root como string.
    """
    r = subprocess.run(["git", "-C", str(deploy_dir), "rev-parse", "--show-toplevel"],
                       capture_output=True, text=True)
    if r.returncode == 0:
        return r.stdout.strip()
    return str(deploy_dir.parent)
