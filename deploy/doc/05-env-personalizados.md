# Variables de entorno personalizadas (`env:`)

---

## Para qué sirve

El bloque `env:` permite pasar variables de configuración propias de la aplicación al contenedor sin tocar scripts ni Dockerfiles de infraestructura.

Se usa para valores que cambian por entorno o por servicio y **no encajan** en los campos fijos del deploy (`port`, `mysql_user`, etc.):

- Activar o desactivar feature flags
- URL de servicios externos distintos por servidor
- Timeouts, límites o toggles
- Política de restart del contenedor

---

## Cómo funciona

```
deploy.yml → deployer → deploy/runtime.env → docker compose → contenedor
   env:         valida       KEY=VALUE          env_file        process env
```

1. El parser extrae el bloque `env:` como mapa clave-valor.
2. El deployer valida claves y valores antes de arrancar Docker.
3. Escribe `deploy/runtime.env` en formato dotenv.
4. El `docker-compose.yml` del stack lo monta:
   ```yaml
   env_file:
     - path: ../runtime.env
       required: false
   ```
5. El proceso del contenedor recibe las variables como entorno.

`runtime.env` se regenera en cada deploy; no lo edites a mano en el servidor.

---

## Sintaxis en deploy.yml

```yaml
nombre-servicio:
  stack: spring_maria
  port: 9080

  env:
    MI_VARIABLE: "valor"
    NUMERO: 42
    FLAG: true

  mysql_user: mi-proyecto
  # ...
```

---

## Tipos de valores soportados

| Tipo | Ejemplo | Resultado en runtime.env |
|------|---------|--------------------------|
| String | `URL: "https://api.com"` | `URL=https://api.com` |
| String con espacios | `LABEL: "Mi App"` | `LABEL="Mi App"` |
| Número entero | `TIMEOUT: 30` | `TIMEOUT=30` |
| Número decimal | `RATE: 1.5` | `RATE=1.5` |
| Booleano | `ENABLED: true` | `ENABLED=true` |
| Vacío | `OPT: ""` | `OPT=""` |

No se soportan listas ni mapas anidados dentro de `env:`.

---

## Reglas de claves

| Regla | Detalle |
|-------|---------|
| Formato | Solo letras, números y `_`. Debe empezar con letra o `_`. |
| Convención | `MAYUSCULAS_CON_GUION_BAJO` |
| Prohibidas | Claves reservadas de infra/deploy (ver lista abajo) |

### Claves reservadas (no usar en `env:`)

Las siguientes claves están reservadas; el deployer falla si las detecta en `env:`:

```
CONTAINER_NAME, NAME, PORT, EXTERNAL_PORT, INTERNAL_PORT
MYSQL_USER, MYSQL_DB, MYSQL_PASS, MYSQL_ROOT_PASSWORD, MYSQL_EXTERNAL_PORT
POSTGRES_USER, POSTGRES_DB, POSTGRES_PASS, POSTGRES_EXTERNAL_PORT
NG_BUILD_CONFIGURATION, NG_APP_BASE_HREF
VITE_BUILD_MODE, VITE_BASE_PATH
SPRING_CONFIG_LOCATION, LOGGING_FILE_PATH, LOGGING_FILE_BASENAME
APP_BASE_PATH
```

Además, en stacks `spring_maria` y `spring_postgres`:
```
SPRING_DATASOURCE_URL, SPRING_DATASOURCE_USERNAME, SPRING_DATASOURCE_PASSWORD
```

---

## Variables especiales con significado para el compose

Estas variables **sí** pueden declararse en `env:` porque las lee el `docker-compose.yml` del stack:

### `RESTART_POLICY`

Controla el comportamiento de restart del contenedor.

| Valor | Comportamiento |
|-------|---------------|
| `no` | No reinicia nunca (**recomendado en local**) |
| `always` | Reinicia siempre |
| `unless-stopped` | Reinicia salvo detención manual (**default en servidor**) |
| `on-failure` | Reinicia solo si el proceso falla |

```yaml
env:
  RESTART_POLICY: "no"
```

### `LOGS_VOLUME` (solo stacks Spring, servidor)

Ruta base del host donde se montan los logs del contenedor Spring. Por defecto, cada servicio escribe en `/var/log/<nombre-servicio>`, fuera del repositorio.

```yaml
env:
  LOGS_VOLUME: /srv/logs
```

Esta variable no está permitida en el deploy local, donde los logs se consultan únicamente con `docker logs`.

---

## Verificar que las variables llegaron al contenedor

```bash
docker exec NOMBRE_SERVICIO env | grep MI_VARIABLE
```

---

## Qué NO funciona

| Enfoque | Resultado |
|---------|-----------|
| Variable suelta fuera de `env:` en el YAML | Ignorada por el deployer |
| `${MI_VAR}` en properties sin `env:` correspondiente | Usa default del placeholder o falla |
| Clave reservada en `env:` | Deploy falla antes de arrancar Docker |
| Editar `runtime.env` a mano en el servidor | Se pierde en el próximo deploy |

---

## Ejemplos

Ver [ejemplos/env-personalizados/](ejemplos/env-personalizados/)
