# Bases de datos

El deployer soporta tres modalidades de base de datos:

1. **BD embebida en el mismo compose** — MariaDB 11, PostgreSQL 18.4 o PostgreSQL 16 se levantan junto a la app en el mismo `docker-compose.yml`. Las credenciales se declaran en `deploy.yml`.
2. **BD externa** — La conexión JDBC se define en `application.properties`. El deployer no gestiona la BD.
3. **Python + PostgreSQL 16** — Stack dedicado para backends Python.

---

## MariaDB 11 — stack `spring_maria`

### Cómo funciona

El deployer exporta las variables `MYSQL_*` y `SPRING_DATASOURCE_*` al entorno antes de ejecutar `docker compose up`. El compose del stack las recibe y configura tanto el contenedor de MariaDB como el de la app Spring.

### Campos requeridos

| Campo | Descripción |
|-------|-------------|
| `mysql_user` | Usuario de MariaDB (también usuario JDBC de Spring). Por convención: igual al `path`. |
| `mysql_db` | Nombre de la base de datos. Por convención: igual al `path`. |
| `mysql_pass` | Contraseña del usuario y de root MariaDB. Por convención: igual al `path`. |
| `mysql_external_port` | Puerto TCP en el host → 3306 del contenedor. Asignado por DevOps. |

### Variables generadas automáticamente

El deployer no requiere que las declares en `env:`; las genera a partir de los campos anteriores:

| Variable | Valor |
|----------|-------|
| `MYSQL_USER` | = `mysql_user` |
| `MYSQL_DB` | = `mysql_db` |
| `MYSQL_PASS` | = `mysql_pass` |
| `MYSQL_ROOT_PASSWORD` | = `mysql_pass` |
| `MYSQL_EXTERNAL_PORT` | = `mysql_external_port` |
| `SPRING_DATASOURCE_URL` | `jdbc:mysql://mariadb:3306/<mysql_db>?sessionVariables=sql_mode=''&connectionTimeZone=America/Argentina/Buenos_Aires&forceConnectionTimeZoneToSession=true` |
| `SPRING_DATASOURCE_USERNAME` | = `mysql_user` |
| `SPRING_DATASOURCE_PASSWORD` | = `mysql_pass` |

> No declarar `SPRING_DATASOURCE_*` en el bloque `env:` — están reservadas para stacks con BD embebida.

### Persistencia

Los datos persisten en el volumen Docker `<nombre-servicio>_mariadb_data`. Con `--delete-db` en local se borra este volumen para recrear la base desde cero.

### Ejemplo

```yaml
st7:
  mi-api:
    branch: develop
    port: 9080
    path: mi-api

    stack: spring_maria

    mysql_user: mi-api
    mysql_db: mi-api
    mysql_pass: mi-api
    mysql_external_port: 9083

    composer_file: plantillas/spring-3.9-java-17-maria-11/docker-compose.yml
    nginx_config: plantillas/spring-3.9-java-17-maria-11/nginx.spring-boot-api.conf
    application_properties: src/main/resources/application.st7.properties
```

---

## PostgreSQL 18.4 — stack `spring_postgres`

### Campos requeridos

| Campo | Descripción |
|-------|-------------|
| `postgres_user` | Usuario de PostgreSQL (también usuario JDBC). Por convención: igual al `path`. |
| `postgres_db` | Nombre de la base. Por convención: igual al `path`. |
| `postgres_pass` | Contraseña del usuario. Por convención: igual al `path`. |
| `postgres_external_port` | Puerto TCP en el host → 5432 del contenedor. |

### Variables generadas automáticamente

| Variable | Valor |
|----------|-------|
| `POSTGRES_USER` | = `postgres_user` |
| `POSTGRES_DB` | = `postgres_db` |
| `POSTGRES_PASS` | = `postgres_pass` |
| `POSTGRES_EXTERNAL_PORT` | = `postgres_external_port` |
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://postgres:5432/<postgres_db>` |
| `SPRING_DATASOURCE_USERNAME` | = `postgres_user` |
| `SPRING_DATASOURCE_PASSWORD` | = `postgres_pass` |

### Persistencia

Volumen Docker `<nombre-servicio>_postgres_data`.

### Ejemplo

```yaml
st7:
  mi-api:
    branch: develop
    port: 9080
    path: mi-api

    stack: spring_postgres

    postgres_user: mi-api
    postgres_db: mi-api
    postgres_pass: mi-api
    postgres_external_port: 9084

    composer_file: plantillas/spring-3.9-java-17-postgres-18-4/docker-compose.yml
    nginx_config: plantillas/spring-3.9-java-17-postgres-18-4/nginx.spring-boot-api.conf
    application_properties: src/main/resources/application.st7.properties
```

---

## PostgreSQL 16 — stack `python_postgres`

Mismo comportamiento que `spring_postgres` para los campos `postgres_*`, pero sin variables `SPRING_DATASOURCE_*` (el código Python gestiona la conexión directamente).

### Variables generadas automáticamente

| Variable | Valor |
|----------|-------|
| `POSTGRES_USER` | = `postgres_user` |
| `POSTGRES_DB` | = `postgres_db` |
| `POSTGRES_PASS` | = `postgres_pass` |
| `POSTGRES_EXTERNAL_PORT` | = `postgres_external_port` |

### Ejemplo

```yaml
st7:
  mi-python-api:
    branch: main
    port: 8000
    path: mi-python-api

    stack: python_postgres

    postgres_user: mi-python-api
    postgres_db: mi-python-api
    postgres_pass: mi-python-api
    postgres_external_port: 5433

    composer_file: plantillas/python-3.11-postgres-16/docker-compose.yml
    nginx_config: plantillas/python-3.11-postgres-16/nginx.python-api.conf
```

---

## BD externa — stack `spring`

La conexión se define completamente en `application_properties`. El deployer no exporta variables JDBC; es responsabilidad del archivo `.properties`.

```yaml
st7:
  mi-api:
    branch: main
    port: 9050
    path: mi-api

    stack: spring

    composer_file: plantillas/spring-3.9-java-17/docker-compose.yml
    nginx_config: plantillas/spring-3.9-java-17/nginx.spring-boot-api.conf
    application_properties: src/main/resources/application.st7.properties
```

En `application.st7.properties` se define la conexión:

```properties
spring.datasource.url=jdbc:postgresql://db.interna.com:5432/mi_base
spring.datasource.username=usuario
spring.datasource.password=contraseña
```

Para una base externa MySQL/MariaDB, la URL debe incluir siempre la zona
horaria de Argentina:

```properties
spring.datasource.url=jdbc:mysql://192.168.100.13:3306/mi_base?useSSL=false&connectionTimeZone=America/Argentina/Buenos_Aires&forceConnectionTimeZoneToSession=true
```

Si la URL ya tiene parámetros, se agrega
`&connectionTimeZone=America/Argentina/Buenos_Aires&forceConnectionTimeZoneToSession=true`.
Si no tiene parámetros, se usa
`?connectionTimeZone=America/Argentina/Buenos_Aires&forceConnectionTimeZoneToSession=true`. Este parámetro no aplica
a conexiones PostgreSQL.

---

## Comparativa

| | spring_maria | spring_postgres | python_postgres | spring (externa) |
|--|:---:|:---:|:---:|:---:|
| BD incluida en compose | MariaDB 11 | PostgreSQL 18.4 | PostgreSQL 16 | No |
| Credenciales en deploy.yml | `mysql_*` | `postgres_*` | `postgres_*` | No |
| SPRING_DATASOURCE_* generadas | Sí | Sí | No | No |
| Datos persistidos en volumen | Sí | Sí | Sí | Depende del host |

---

## Ejemplos

Ver [ejemplos/bases-de-datos/](ejemplos/bases-de-datos/)
