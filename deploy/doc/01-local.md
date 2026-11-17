# Deploy local

El deploy local permite levantar un servicio con Docker Compose en una máquina de desarrollo sin necesitar git checkout de ramas, nginx del host, sudo ni notificaciones a Discord.

---

## Cómo ejecutar

Desde la carpeta `deploy/` del proyecto:

```bat
local_docker_run.bat
```

O directamente con Python:

```bash
python deploy.py --local
python deploy.py --local local
python deploy.py --local local nombre-servicio
python deploy.py --local local nombre-servicio --delete-db
python deploy.py --local local nombre-servicio -f
python deploy.py --local local nombre-servicio -fc
```

- Sin argumentos: usa el entorno `local` y el primer servicio del bloque.
- `local` (primer arg): nombre del entorno a leer en `deploy.yml` (default: `local`).
- `nombre-servicio` (segundo arg): selecciona un servicio específico dentro del bloque.
- `--delete-db`: antes del `up`, ejecuta `docker compose down --volumes --remove-orphans` para borrar volúmenes de base de datos. **Solo funciona con `--local`.**
- `-f`: después del deploy, ejecuta `docker logs -f` sobre el contenedor de aplicación. Use `Ctrl+C` para dejar de seguir los logs.
- `-fc`: agrega `--force-recreate` al `docker compose up`, forzando la recreación de todos los contenedores aunque no hayan cambiado. Funciona en modo local y en servidor.
- `-h`, `--help`: muestra todos los argumentos y opciones sin ejecutar el deploy.

---

## Bloque `local` en deploy.yml

El deploy local lee el bloque `local` (u otro entorno si se pasa como argumento):

```yaml
local:
  nombre-servicio:
    port: 9080
    stack: spring_maria

    env:
      RESTART_POLICY: "no"
      MI_VARIABLE: "valor-local"

    application_properties: src/main/resources/application.server.properties
    mysql_user: mi_proyecto
    mysql_db: mi_proyecto
    mysql_pass: mi_proyecto
    mysql_external_port: 3307
```

---

## Qué campos SE leen en local

| Campo | Notas |
|-------|-------|
| `stack` | Define el tipo de app y el comportamiento de build |
| `port` | Puerto en el host local |
| `composer_file` | docker-compose.yml a usar (obligatorio, sin default) |
| `nginx_config` | No debe especificarse en local; si está presente, el deploy falla |
| `application_properties` | Requerido en stacks Spring |
| `mysql_*` / `postgres_*` | Requeridos en stacks con BD embebida |
| `env` | Variables de entorno inyectadas al contenedor |
| `environment` | Configuración de build Angular/TanStack/Vue |
| `compose_service` | Nombre del servicio en el compose (default: `app`) |
| `path` | Se usa para `NG_APP_BASE_HREF` / `VITE_BASE_PATH` del build |
| `script` | Hook post-deploy ejecutado tras el `docker compose up` |

---

## Qué campos NO se leen en local (ignorados)

| Campo | Por qué se ignora |
|-------|-------------------|
| `branch` | No se hace git checkout en local |
| `domain` | No se configura nginx del host |
| `nginx_config` | No se instalan fragmentos nginx |
| `ssl` | No aplica en local |

No hace falta eliminarlos del bloque; simplemente no tienen efecto.

---

## Comportamiento automático en local

### Logs Spring Boot

En stacks Spring, el runner local fuerza `LOGGING_FILE_PATH=/app/logs` y `LOGGING_FILE_NAME=""`, y reemplaza el bind mount de `/app/logs` por un `tmpfs`. De esta forma Logback puede inicializar sus appenders sin escribir archivos persistentes en el repositorio ni en el host. Los logs locales se consultan con `docker logs <contenedor>`.

`LOGGING_FILE_PATH`, `LOGGING_FILE_NAME` y `LOGS_VOLUME` son variables reservadas en local y no pueden habilitarse desde `env:`. La persistencia de logs en archivos está limitada a los despliegues de servidor.

### RESTART_POLICY

Por defecto los docker-compose usan `restart: ${RESTART_POLICY:-unless-stopped}`. En local se recomienda desactivar el restart para no enmascarar errores de arranque:

```yaml
env:
  RESTART_POLICY: "no"
```

---

## Variables de entorno y application.properties

El bloque `local` debe apuntar al mismo `application_properties` que usa el servidor (por convención `application.server.properties`). Las diferencias entre entornos se manejan con el bloque `env:`:

```yaml
local:
  mi-api:
    application_properties: src/main/resources/application.server.properties
    env:
      RESTART_POLICY: "no"
      EXTERNAL_API_URL: "http://localhost:8081"   # en servidor sería la URL real
      FEATURE_NEW_UI: true
```

Si `application.server.properties` tiene `external.api.url=${EXTERNAL_API_URL}`, la variable del bloque `env:` sobreescribe el valor en runtime.

Ver también: [06-configurar-proyecto.md](06-configurar-proyecto.md)

---

## Ejemplos

Ver [ejemplos/local/](ejemplos/local/)
