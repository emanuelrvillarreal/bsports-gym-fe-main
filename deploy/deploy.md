# Documentación del sistema de deploy

La carpeta `deploy/doc/` contiene la documentación completa para configurar despliegues mediante `deploy.yml`.

---

## Índice de documentación

| Archivo | Contenido |
|---------|-----------|
| [01-local.md](doc/01-local.md) | Deploy local: cómo ejecutarlo, qué campos aplican, qué campos se ignoran, comportamiento automático de logs y restart. |
| [02-stacks.md](doc/02-stacks.md) | Stacks disponibles: qué son, lista completa, puertos internos, campos requeridos y opcionales por stack, carpetas de plantillas. |
| [03-path-y-dominio.md](doc/03-path-y-dominio.md) | Campos `path` y `domain`: qué hace cada uno, cuándo usarlos, cómo funciona la sustitución en nginx y la selección automática de plantillas `-root.conf`. |
| [04-bases-de-datos.md](doc/04-bases-de-datos.md) | Bases de datos soportadas: MariaDB 11, PostgreSQL 18.4, PostgreSQL 16, BD externa. Variables generadas automáticamente, persistencia en volúmenes. |
| [05-env-personalizados.md](doc/05-env-personalizados.md) | Variables de entorno personalizadas (`env:`): para qué sirven, tipos de valores, claves reservadas, variables especiales (`RESTART_POLICY`, `LOGS_VOLUME`). |
| [06-configurar-proyecto.md](doc/06-configurar-proyecto.md) | Cómo preparar el proyecto para recibir configuración por variables de entorno: Spring Boot (`application.server.properties`), Angular (environments), Vue/TanStack (archivos `.env` de Vite). |

---

## Ejemplos

Cada sección tiene su carpeta de ejemplos con archivos listos para copiar y adaptar:

| Carpeta | Contenido |
|---------|-----------|
| [doc/ejemplos/local/](doc/ejemplos/local/) | Bloques `local` para spring-maria, spring-postgres, angular, vue, spring con BD externa |
| [doc/ejemplos/stacks/](doc/ejemplos/stacks/) | Un ejemplo de `deploy.yml` por cada stack disponible |
| [doc/ejemplos/path-y-dominio/](doc/ejemplos/path-y-dominio/) | Frontend + API mismo dominio, servicio en raíz, dos versiones en el mismo servidor |
| [doc/ejemplos/bases-de-datos/](doc/ejemplos/bases-de-datos/) | Configuración completa (servidor + local) para spring-maria y spring-postgres |
| [doc/ejemplos/env-personalizados/](doc/ejemplos/env-personalizados/) | Spring con variables custom, uso de RESTART_POLICY por entorno |
| [doc/ejemplos/configurar-proyecto/](doc/ejemplos/configurar-proyecto/) | `application.server.properties`, configuraciones de `angular.json`, archivos `.env` de Vite, `deploy.yml` completo de referencia |

---

## Cómo ejecutar el deploy

### Servidor

El script lee el entorno desde `/home/.env` (`env=<nombre>`):

```bash
python deploy/deploy.py
```

### Local (Windows)

```bat
deploy\local_docker_run.bat
deploy\local_docker_run.bat local nombre-servicio
deploy\local_docker_run.bat local nombre-servicio --delete-db
```

O directamente:

```bash
python deploy/deploy.py --local
python deploy/deploy.py --local local nombre-servicio --delete-db
python deploy/deploy.py --local local nombre-servicio -f
python deploy/deploy.py --local local nombre-servicio --seed
```

> `--delete-db` y `--seed` **solo funcionan con `--local`**. En flujo de servidor producen un error.
>
> `-f` sigue los logs del contenedor de aplicación al terminar. `-h` y `--help` muestran la ayuda completa.
>
> `--seed` espera a que el contenedor de la app termine de correr el changelog automático de Liquibase (`db.changelog-master.yaml`) y luego ejecuta `db.changelog-seed.yaml` con el contexto `seed` (ver [liquibase.md](../src/main/resources/db/liquibase.md)), usando un contenedor descartable de `liquibase/liquibase` conectado a la red Docker del servicio. Solo aplica a servicios con stack `spring_maria`, `spring_postgres` o `python_postgres`.

---

## Particularidades por entorno

Estas reglas son obligatorias para todos los proyectos que se desplieguen en
los siguientes entornos.

### `st7` y `malvinas4`: reinicio deshabilitado

Todos los servicios de `st7` y `malvinas4` deben declarar
`RESTART_POLICY: "no"` dentro de `env:`. Esto evita que Docker reinicie
automáticamente los contenedores en esos servidores.

```yaml
st7:
  nombre-servicio:
    # ...
    env:
      RESTART_POLICY: "no"

malvinas4:
  nombre-servicio:
    # ...
    env:
      RESTART_POLICY: "no"
```

### `malvinas2`: base de datos externa

Los servicios desplegados en `malvinas2` no deben levantar contenedores de
base de datos. Las bases de datos de este entorno se alojan externamente en
`192.168.100.13`.

Para una aplicación Spring:

- usar `stack: spring`, no `spring_maria` ni `spring_postgres`;
- usar el `docker-compose.yml` del stack Spring sin base de datos;
- configurar la conexión mediante `SPRING_DATASOURCE_URL`,
  `SPRING_DATASOURCE_USERNAME` y `SPRING_DATASOURCE_PASSWORD` dentro de `env:`;
- no declarar campos `mysql_*` ni `postgres_*`.

```yaml
malvinas2:
  nombre-servicio:
    branch: main
    port: 9080
    stack: spring
    env:
      SPRING_DATASOURCE_URL: "jdbc:mysql://192.168.100.13:<puerto>/<base>?useSSL=false&connectionTimeZone=America/Argentina/Buenos_Aires&forceConnectionTimeZoneToSession=true"
      SPRING_DATASOURCE_USERNAME: "<usuario>"
      SPRING_DATASOURCE_PASSWORD: "<secreto>"
    composer_file: spring-3.9-java-17/docker-compose.yml
```

El bloque `malvinas2` de `decretos-be/deploy.yml` es una referencia concreta
de esta configuración. Las credenciales reales deben mantenerse en la
configuración del proyecto y no copiarse a la documentación.

Toda conexión JDBC a MySQL/MariaDB debe definir la zona horaria
`America/Argentina/Buenos_Aires`. Si la URL ya contiene parámetros, agregar
`&connectionTimeZone=America/Argentina/Buenos_Aires&forceConnectionTimeZoneToSession=true`;
si no contiene parámetros, iniciar la query con
`?connectionTimeZone=America/Argentina/Buenos_Aires&forceConnectionTimeZoneToSession=true`.

---

## Estructura del deploy.yml

```yaml
<entorno>:            # nombre del servidor (debe coincidir con env= en /home/.env)
  <nombre-servicio>:  # nombre del contenedor Docker
    branch: ...       # rama Git a desplegar
    port: ...         # puerto en el host
    stack: ...        # tipo de aplicación

    # campos opcionales según stack...
```

Ver [02-stacks.md](doc/02-stacks.md) para la lista completa de campos por stack.
