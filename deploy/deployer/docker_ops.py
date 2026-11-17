# Operaciones Docker: ejecución de compose, manejo de conflictos de contenedores,
# diagnóstico de fallos y espera de arranque.

import re
import subprocess
import sys
import time
from pathlib import Path

from . import config, log
from .errors import service_die, die
from .config import is_spring_stack


def _container_ids_by_exact_name(container_name: str) -> list[str]:
    """Busca contenedores cuyo nombre Docker coincide exactamente."""
    r = subprocess.run(
        ["docker", "ps", "-aq", "--filter", f"name=^/{container_name}$"],
        capture_output=True,
        text=True,
    )
    if r.returncode != 0:
        return []

    ids: list[str] = []
    for cid in r.stdout.strip().splitlines():
        if not cid:
            continue
        name_r = subprocess.run(["docker", "inspect", "-f", "{{ .Name }}", cid],
                                capture_output=True, text=True)
        actual = name_r.stdout.strip().lstrip("/") if name_r.returncode == 0 else ""
        if actual == container_name:
            ids.append(cid)
    return ids


def _container_state_summary(container_id: str) -> str:
    """Resume el estado Docker de un contenedor para mensajes de error."""
    r = subprocess.run(
        ["docker", "inspect", "-f",
         "{{.Id}} name={{.Name}} status={{.State.Status}} running={{.State.Running}} "
         "exit={{.State.ExitCode}} error={{.State.Error}} finished={{.State.FinishedAt}}",
         container_id],
        capture_output=True,
        text=True,
    )
    if r.returncode != 0:
        return f"{container_id} status=missing"
    return r.stdout.strip().replace("name=/", "name=")


def remove_container_and_wait(name: str, branch: str, container_name: str, timeout: int = 120) -> None:
    """Remueve un contenedor por nombre exacto y espera a que Docker libere el nombre."""
    ids = _container_ids_by_exact_name(container_name)
    if not ids:
        return

    for cid in ids:
        r = subprocess.run(["docker", "rm", "-f", cid], capture_output=True, text=True)
        if r.returncode != 0:
            detail = (r.stderr or r.stdout or "").strip()
            log.warn(f"[{name}] docker rm no confirmo remocion de {container_name}: {detail or cid}")

    deadline = time.time() + timeout
    while time.time() < deadline:
        remaining_ids = _container_ids_by_exact_name(container_name)
        if not remaining_ids:
            log.ok(f"[{name}] Contenedor anterior removido: {container_name}")
            return
        time.sleep(1)

    states = "; ".join(_container_state_summary(cid) for cid in _container_ids_by_exact_name(container_name))
    service_die(name, branch, f"el contenedor {container_name} sigue existiendo despues de removerlo: {states}")


def _inspect_label(container_ref: str, label: str) -> str:
    """Lee un label de Docker inspect para el contenedor dado.

    Args:
        container_ref: ID o nombre del contenedor.
        label: Nombre completo del label a leer.
    Returns:
        Valor del label o string vacío si no existe/falla.
    """
    r = subprocess.run(
        ["docker", "inspect", "-f", f'{{{{ index .Config.Labels "{label}" }}}}', container_ref],
        capture_output=True, text=True,
    )
    return r.stdout.strip() if r.returncode == 0 else ""


def _remove_container_if_alien(name, branch, container_id, expected_project, expected_service) -> None:
    """Elimina un contenedor si sus labels de Compose no coinciden con los esperados.

    Args:
        name: Nombre del servicio (para logs).
        branch: Branch activo.
        container_id: ID o nombre del contenedor a evaluar.
        expected_project: Valor esperado de com.docker.compose.project.
        expected_service: Valor esperado de com.docker.compose.service.
    """
    actual_project = _inspect_label(container_id, "com.docker.compose.project")
    actual_service = _inspect_label(container_id, "com.docker.compose.service")
    if actual_project == expected_project and actual_service == expected_service:
        return
    name_r = subprocess.run(["docker", "inspect", "-f", "{{ .Name }}", container_id], capture_output=True, text=True)
    label = (name_r.stdout.strip().lstrip("/") if name_r.returncode == 0 else "") or container_id
    log.warn(f"[{name}] Removiendo contenedor incompatible {label} (project={actual_project or 'sin-label'}, service={actual_service or 'sin-label'})")
    r = subprocess.run(["docker", "rm", "-f", container_id], capture_output=True)
    if r.returncode != 0:
        service_die(name, branch, f"no se pudo remover contenedor incompatible {label}")


def remove_conflicting_containers(name: str, branch: str, stack: str, compose_service: str) -> None:
    """Elimina contenedores previos que tengan el mismo nombre pero labels de Compose distintos.

    Args:
        name: Nombre del servicio (también usado como nombre de contenedor).
        branch: Branch activo.
        stack: Stack del servicio (para detectar contenedores de DB asociados).
        compose_service: Nombre del servicio dentro del docker-compose.
    """
    def _check_by_name(container_name, exp_project, exp_service):
        if subprocess.run(["docker", "container", "inspect", container_name], capture_output=True).returncode == 0:
            _remove_container_if_alien(name, branch, container_name, exp_project, exp_service)
        r = subprocess.run(["docker", "ps", "-aq", "--filter", f"name={container_name}"],
                           capture_output=True, text=True)
        if r.returncode != 0:
            return
        for cid in r.stdout.strip().splitlines():
            if not cid:
                continue
            nr = subprocess.run(["docker", "inspect", "-f", "{{ .Name }}", cid], capture_output=True, text=True)
            actual = nr.stdout.strip().lstrip("/") if nr.returncode == 0 else ""
            if actual == container_name or actual.endswith(f"_{container_name}") or actual.endswith(f"-{container_name}"):
                _remove_container_if_alien(name, branch, cid, exp_project, exp_service)

    _check_by_name(name, name, compose_service)
    if stack == "spring_maria":
        _check_by_name(f"{name}-mariadb", name, "mariadb")
    elif stack in ("spring_postgres", "python_postgres"):
        _check_by_name(f"{name}-postgres", name, "postgres")


def dump_diagnostics(svc_name: str, cid: str, compose_svc: str, compose_file_args: list, deploy_dir: Path) -> None:
    """Imprime diagnóstico completo de Docker al stderr cuando el contenedor falla.

    Args:
        svc_name: Nombre del servicio.
        cid: ID del contenedor (puede ser vacío).
        compose_svc: Nombre del servicio en docker-compose.
        compose_file_args: Lista de argumentos -f composer_path.
        deploy_dir: Path al directorio deploy/.
    """
    e = sys.stderr
    log.separator(f"diagnóstico Docker ({svc_name}, servicio {compose_svc})")
    subprocess.run(["docker", "compose"] + compose_file_args + ["ps", "-a"], cwd=str(deploy_dir), stdout=e, stderr=e)
    print("", file=e)
    subprocess.run(["docker", "compose"] + compose_file_args + ["logs", "--no-color", "--tail=500", compose_svc],
                   cwd=str(deploy_dir), stdout=e, stderr=e)
    if cid:
        print("", file=e)
        subprocess.run(["docker", "inspect", "-f",
                        "Status={{.State.Status}} ExitCode={{.State.ExitCode}} OOMKilled={{.State.OOMKilled}} "
                        "Error={{.State.Error}} FinishedAt={{.State.FinishedAt}}", cid],
                       stdout=e, stderr=subprocess.DEVNULL)
        print("", file=e)
        subprocess.run(["docker", "logs", "--tail=500", cid], stdout=e, stderr=e)
    log.separator("fin diagnóstico Docker")


def _compose_container_ids(compose_service: str, compose_file_args: list, deploy_dir: Path) -> list[str]:
    """Devuelve los IDs actuales que Docker Compose asocia al servicio."""
    r = subprocess.run(["docker", "compose"] + compose_file_args + ["ps", "-aq", compose_service],
                       capture_output=True, text=True, cwd=str(deploy_dir))
    if r.returncode != 0:
        return []
    return [line.strip() for line in r.stdout.splitlines() if line.strip()]


def _inspect_container_state(container_id: str) -> dict[str, str]:
    """Lee el estado minimo de un contenedor para decidir si sigue vivo."""
    r = subprocess.run(
        ["docker", "inspect", "-f",
         "Name={{.Name}}|Status={{.State.Status}}|Running={{.State.Running}}|"
         "ExitCode={{.State.ExitCode}}|OOMKilled={{.State.OOMKilled}}|"
         "Error={{.State.Error}}|FinishedAt={{.State.FinishedAt}}", container_id],
        capture_output=True, text=True,
    )
    if r.returncode != 0:
        return {"id": container_id, "Status": "missing", "Running": "false"}

    state = {"id": container_id}
    for part in r.stdout.strip().split("|"):
        key, _, value = part.partition("=")
        state[key] = value
    state["Name"] = state.get("Name", "").lstrip("/")
    return state


def _print_container_states(states: list[dict[str, str]]) -> None:
    """Imprime todos los estados vistos para evitar perder el contenedor relevante."""
    if not states:
        return
    print("Estados de contenedores detectados:", file=sys.stderr)
    for state in states:
        print(
            "  "
            f"id={state.get('id', '')} "
            f"name={state.get('Name', '') or '-'} "
            f"status={state.get('Status', '') or '-'} "
            f"running={state.get('Running', '') or '-'} "
            f"exit={state.get('ExitCode', '') or '-'} "
            f"oom={state.get('OOMKilled', '') or '-'} "
            f"error={state.get('Error', '') or '-'} "
            f"finished={state.get('FinishedAt', '') or '-'}",
            file=sys.stderr,
        )


def wait_for_container(name: str, branch: str, compose_service: str, start_time: int,
                       compose_file_args: list, deploy_dir: Path) -> None:
    """Espera 20 segundos verificando que el contenedor siga corriendo."""
    log.step(f"Verificando contenedor durante 20 segundos ({name}, {compose_service})...")
    initial_ids = _compose_container_ids(compose_service, compose_file_args, deploy_dir)
    if not initial_ids:
        dump_diagnostics(name, "", compose_service, compose_file_args, deploy_dir)
        service_die(name, branch, f"no hay contenedor para el servicio {compose_service} en compose")

    last_states = []
    last_running = None
    for remaining in range(20, 0, -1):
        ids = _compose_container_ids(compose_service, compose_file_args, deploy_dir)
        states = [_inspect_container_state(cid) for cid in ids]
        last_states = states
        running = next((state for state in states if state.get("Running") == "true"), None)
        last_running = running
        if running:
            log.info(f"[{name}] Faltan {remaining:2d}s...")
            time.sleep(1)
            continue
        log.warn(f"[{name}] Sin contenedor running. Faltan {remaining:2d}s...")
        time.sleep(1)

    if last_running:
        log.ok(f"[{name}] Contenedor corriendo correctamente.")
        return

    total_duration = int(time.time()) - start_time
    _print_container_states(last_states)
    diagnostic_id = last_states[0]["id"] if last_states else initial_ids[0]
    dump_diagnostics(name, diagnostic_id, compose_service, compose_file_args, deploy_dir)
    die(f"{name} Be {branch} {config.DEPLOY_ENV} - End ERROR contenedor no en ejecucion - Duracion: {total_duration}s")

def configure_db_env(stack: str, composer: str,
                     mysql_user, mysql_db, mysql_pass, mysql_external_port,
                     postgres_user, postgres_db, postgres_pass, postgres_external_port) -> list:
    """Configura variables de entorno para la base de datos embebida y retorna args de compose.

    Args:
        stack: Tipo de stack ('spring_maria', 'spring_postgres', 'python_postgres').
        composer: Path relativo o absoluto al docker-compose.yml.
        mysql_*: Credenciales MariaDB.
        postgres_*: Credenciales PostgreSQL.
    Returns:
        Lista ['-f', composer] lista para pasar a docker compose.
    """
    import os
    _clear_db_env()
    if stack == "spring_maria":
        os.environ["MYSQL_USER"] = mysql_user
        os.environ["MYSQL_DB"] = mysql_db
        os.environ["MYSQL_PASS"] = mysql_pass
        os.environ["MYSQL_ROOT_PASSWORD"] = mysql_pass
        os.environ["MYSQL_EXTERNAL_PORT"] = mysql_external_port
        os.environ["SPRING_DATASOURCE_URL"] = (
            f"jdbc:mysql://mariadb:3306/{mysql_db}?sessionVariables=sql_mode=''"
            "&connectionTimeZone=America/Argentina/Buenos_Aires"
            "&forceConnectionTimeZoneToSession=true"
        )
        os.environ["SPRING_DATASOURCE_USERNAME"] = mysql_user
        os.environ["SPRING_DATASOURCE_PASSWORD"] = mysql_pass
    elif stack in ("spring_postgres", "python_postgres"):
        os.environ["POSTGRES_USER"] = postgres_user
        os.environ["POSTGRES_DB"] = postgres_db
        os.environ["POSTGRES_PASS"] = postgres_pass
        os.environ["POSTGRES_EXTERNAL_PORT"] = postgres_external_port
        if stack == "spring_postgres":
            os.environ["SPRING_DATASOURCE_URL"] = f"jdbc:postgresql://postgres:5432/{postgres_db}"
            os.environ["SPRING_DATASOURCE_USERNAME"] = postgres_user
            os.environ["SPRING_DATASOURCE_PASSWORD"] = postgres_pass
    return ["-f", composer]


def _clear_db_env() -> None:
    """Limpia del entorno todas las variables de base de datos embebida."""
    import os
    for key in ("MYSQL_USER","MYSQL_DB","MYSQL_PASS","MYSQL_ROOT_PASSWORD","MYSQL_EXTERNAL_PORT",
                "POSTGRES_USER","POSTGRES_DB","POSTGRES_PASS","POSTGRES_EXTERNAL_PORT",
                "SPRING_DATASOURCE_URL","SPRING_DATASOURCE_USERNAME","SPRING_DATASOURCE_PASSWORD"):
        os.environ.pop(key, None)


def export_service_port_vars(name: str, port: str, stack: str, deploy_path: str) -> None:
    """Exporta variables de entorno de puertos y paths para el docker-compose del servicio.

    Args:
        name: Nombre del servicio.
        port: Puerto externo asignado.
        stack: Tipo de stack.
        deploy_path: Sub-path de la URL (puede ser vacío para root).
    """
    import os
    from .config import is_nginx_stack
    os.environ["NAME"] = name
    os.environ["PORT"] = port
    os.environ["CONTAINER_NAME"] = name
    os.environ["EXTERNAL_PORT"] = port
    if stack in ("angular", "vue") or is_nginx_stack(stack):
        os.environ["INTERNAL_PORT"] = "80"
        if stack in ("angular", "vue"):
            os.environ["NG_APP_BASE_HREF"] = f"/{deploy_path}/" if deploy_path else "/"
            os.environ["VITE_BASE_PATH"] = f"/{deploy_path}/" if deploy_path else "/"
        else:
            os.environ.pop("NG_APP_BASE_HREF", None)
            os.environ.pop("VITE_BASE_PATH", None)
    elif stack == "angular_ssr":
        os.environ["INTERNAL_PORT"] = "4000"
        os.environ["NG_APP_BASE_HREF"] = f"/{deploy_path}/" if deploy_path else "/"
        os.environ.pop("VITE_BASE_PATH", None)
    elif stack == "tanstack":
        os.environ["INTERNAL_PORT"] = "3000"
        os.environ["VITE_BASE_PATH"] = f"/{deploy_path}/" if deploy_path else "/"
        os.environ.pop("NG_APP_BASE_HREF", None)
    else:
        os.environ["INTERNAL_PORT"] = port
        os.environ.pop("NG_APP_BASE_HREF", None)
        os.environ.pop("VITE_BASE_PATH", None)


def wait_for_app_started(container_name: str, timeout: int = 180) -> bool:
    """Espera a que el contenedor Spring Boot termine de arrancar (changelog automático incluido).

    Busca en los logs la línea 'Started ... in ... seconds' que Spring Boot
    imprime al finalizar el arranque (después de correr el changelog master).
    """
    deadline = time.time() + timeout
    while time.time() < deadline:
        r = subprocess.run(["docker", "logs", "--tail", "200", container_name],
                           capture_output=True, text=True)
        output = (r.stdout or "") + (r.stderr or "")
        if re.search(r"Started \S+ in [\d.]+ seconds", output):
            return True
        time.sleep(2)
    return False


_MYSQL_CONNECTOR_VERSION = "9.2.0"
_MYSQL_CONNECTOR_JAR = f"mysql-connector-j-{_MYSQL_CONNECTOR_VERSION}.jar"
_MYSQL_CONNECTOR_URL = (
    "https://repo1.maven.org/maven2/com/mysql/mysql-connector-j/"
    f"{_MYSQL_CONNECTOR_VERSION}/{_MYSQL_CONNECTOR_JAR}"
)


def _ensure_mysql_driver_jar(deploy_dir: Path) -> Path:
    """Descarga (una sola vez, cacheado) el driver JDBC de MySQL usado por el seed de Liquibase."""
    import urllib.request
    cache_dir = deploy_dir / ".cache"
    cache_dir.mkdir(exist_ok=True)
    jar_path = cache_dir / _MYSQL_CONNECTOR_JAR
    if not jar_path.is_file():
        log.info(f"Descargando driver JDBC MySQL ({_MYSQL_CONNECTOR_JAR})...")
        urllib.request.urlretrieve(_MYSQL_CONNECTOR_URL, jar_path)
    return jar_path


def _get_container_network(container_name: str) -> str:
    """Devuelve el nombre de la red Docker a la que está conectado un contenedor."""
    r = subprocess.run(
        ["docker", "inspect", "-f",
         "{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{end}}", container_name],
        capture_output=True, text=True,
    )
    return r.stdout.strip() if r.returncode == 0 else ""


def _seed_db_target(stack: str, service_name: str, service: dict):
    """Devuelve (contenedor_db, jdbc_url, usuario, clave) para el seed según el stack, o None si no aplica."""
    if stack == "spring_maria":
        db = str(service.get("mysql_db") or "").strip()
        user = str(service.get("mysql_user") or "").strip()
        password = str(service.get("mysql_pass") or "").strip()
        url = (f"jdbc:mysql://mariadb:3306/{db}?sessionVariables=sql_mode=''"
               "&connectionTimeZone=America/Argentina/Buenos_Aires"
               "&forceConnectionTimeZoneToSession=true")
        return f"{service_name}-mariadb", url, user, password
    if stack in ("spring_postgres", "python_postgres"):
        db = str(service.get("postgres_db") or "").strip()
        user = str(service.get("postgres_user") or "").strip()
        password = str(service.get("postgres_pass") or "").strip()
        url = f"jdbc:postgresql://postgres:5432/{db}"
        return f"{service_name}-postgres", url, user, password
    return None


def run_liquibase_seed(name: str, stack: str, service: dict, repo_root: Path, deploy_dir: Path) -> None:
    """Ejecuta db.changelog-seed.yaml (contexto 'seed') contra la base local.

    Se ejecuta luego de que el contenedor de la app termina de correr el
    changelog automático (db.changelog-master.yaml), usando un contenedor
    descartable de liquibase/liquibase conectado a la misma red de Docker.
    """
    target = _seed_db_target(stack, name, service)
    if target is None:
        log.warn(f"[{name}] --seed: el stack [{stack}] no tiene seed de Liquibase soportado, se omite.")
        return
    db_container, url, user, password = target

    log.step(f"[{name}] --seed: esperando arranque completo del contenedor de la app...")
    if not wait_for_app_started(name):
        die(f"{name}: --seed: timeout esperando el arranque del contenedor {name}")

    network = _get_container_network(db_container)
    if not network:
        die(f"{name}: --seed: no se pudo determinar la red Docker de {db_container}")

    changelog_dir = repo_root / "src" / "main" / "resources" / "db" / "changelog"
    extra_args = []
    volume_args = ["-v", f"{changelog_dir}:/liquibase/changelog"]
    if stack == "spring_maria":
        driver_jar = _ensure_mysql_driver_jar(deploy_dir)
        volume_args += ["-v", f"{driver_jar}:/liquibase/classpath/{driver_jar.name}"]
        extra_args += [
            f"--classpath=/liquibase/changelog:/liquibase/classpath/{driver_jar.name}",
            "--driver=com.mysql.cj.jdbc.Driver",
        ]

    log.step(f"[{name}] --seed: ejecutando changelog de seed contra {db_container}...")
    r = subprocess.run([
        "docker", "run", "--rm",
        "--network", network,
        *volume_args,
        "liquibase/liquibase:4.29",
        "update",
        "--changelog-file=db.changelog-seed.yaml",
        "--context-filter=seed",
        f"--url={url}",
        f"--username={user}",
        f"--password={password}",
        *extra_args,
    ])
    if r.returncode != 0:
        die(f"{name}: --seed: falló la ejecución del changelog de seed")
    log.ok(f"[{name}] --seed: seed de Liquibase aplicado correctamente.")


def configure_frontend_build_env(stack: str, svc_environment: str) -> None:
    """Configura variables de build para frontends Angular, Vue o TanStack.

    Args:
        stack: Tipo de stack del servicio.
        svc_environment: Nombre del environment de build (ej. 'production', 'staging').
    """
    import os
    from .config import is_nginx_stack
    if stack in ("angular", "angular_ssr"):
        os.environ["NG_BUILD_CONFIGURATION"] = svc_environment or "production"
        os.environ.pop("VITE_BUILD_MODE", None)
    elif stack in ("tanstack", "vue"):
        os.environ["VITE_BUILD_MODE"] = svc_environment or "production"
        os.environ.pop("NG_BUILD_CONFIGURATION", None)
    elif is_nginx_stack(stack):
        for k in ("NG_BUILD_CONFIGURATION", "NG_APP_BASE_HREF", "VITE_BUILD_MODE", "VITE_BASE_PATH"):
            os.environ.pop(k, None)
    else:
        for k in ("NG_BUILD_CONFIGURATION", "VITE_BUILD_MODE", "VITE_BASE_PATH"):
            os.environ.pop(k, None)
