# Stacks

Un stack define el tipo de aplicación, cómo se construye la imagen Docker, qué puerto usa internamente el contenedor y qué validaciones aplica el deployer antes de levantar el servicio.

---

## Stacks disponibles

| Stack | Descripción |
|-------|-------------|
| `spring` | Backend Spring Boot (Java 17). BD externa via `application.properties`. **Default si se omite `stack`**. |
| `spring_maria` | Spring Boot + MariaDB 11 en el mismo compose (sin `.env` del proyecto). |
| `spring_postgres` | Spring Boot + PostgreSQL 18.4 en el mismo compose (sin `.env` del proyecto). |
| `angular` | Frontend Angular (Node 22, pnpm obligatorio). SPA servida por nginx en el contenedor. |
| `angular_ssr` | Frontend Angular con SSR (Node 22, pnpm). Runtime Node en puerto 4000. |
| `tanstack` | Frontend React con TanStack Start (Vite, Node 22). Runtime Node en puerto 3000. |
| `vue` | Frontend Vue 3 (Node 20, pnpm). SPA servida por nginx en el contenedor. |
| `python_postgres` | Backend Python 3.11 + PostgreSQL 16 en el mismo compose. |
| `nginx-1.27` | Sitio estático HTML/CSS/JS (sin build Node). Archivos en `public/` del repo. |
| `simple` | Stack genérico sin parámetros adicionales. Solo requiere `branch`, `port` y `composer_file`. |

---

## Puertos internos por stack

| Stack | Puerto interno del contenedor |
|-------|-------------------------------|
| `spring`, `spring_maria`, `spring_postgres` | Igual al `port` del YAML (la API escucha en ese puerto) |
| `angular`, `vue`, `nginx-*` | **80** (nginx interno) |
| `angular_ssr` | **4000** (Node SSR) |
| `tanstack` | **3000** (Node SSR) |
| `python_postgres` | Igual al `port` del YAML |
| `simple` | Igual al `port` del YAML |

---

## Carpetas de plantillas

Cada stack tiene una carpeta en `deploy/plantillas/` con su `Dockerfile`, `docker-compose.yml` y plantillas nginx. **No editar estos archivos.**

| Stack | Carpeta |
|-------|---------|
| `spring` | `plantillas/spring-3.9-java-17/` |
| `spring_maria` | `plantillas/spring-3.9-java-17-maria-11/` |
| `spring_postgres` | `plantillas/spring-3.9-java-17-postgres-18-4/` |
| `angular` | `plantillas/angular-21-node-22/` |
| `angular_ssr` | `plantillas/angular-21-node-22-ssr/` |
| `tanstack` | `plantillas/tanstack-start-node-22/` |
| `vue` | `plantillas/vue-3-node-20/` |
| `python_postgres` | `plantillas/python-3.11-postgres-16/` |
| `nginx-1.27` | `plantillas/nginx-1.27/` |
| `simple` (vite-react) | `plantillas/vite-react-node-22/` |

Variantes especiales para backends con Malvinas SSO (requieren `sso-malvinas.crt` en la raíz del repo):

| Caso | Carpeta |
|------|---------|
| Spring + BD externa + SSO | `plantillas/spring-3.9-java-17-malvinas-sso/` |
| Spring Maria + SSO | `plantillas/spring-3.9-java-17-maria-11-malvinas-sso/` |

---

## Campos por stack

### `spring` — Spring Boot con BD externa

| Campo | Obligatorio | Notas |
|-------|:-----------:|-------|
| `branch` | Sí | |
| `port` | Sí | |
| `application_properties` | Sí | Path al `.properties` del entorno |
| `composer_file` | Sí | `plantillas/spring-3.9-java-17/docker-compose.yml` |
| `nginx_config` | Sí | `plantillas/spring-3.9-java-17/nginx.spring-boot-api.conf` |
| `path`, `domain`, `env`, `script` | No | |

---

### `spring_maria` — Spring Boot + MariaDB 11

| Campo | Obligatorio | Notas |
|-------|:-----------:|-------|
| `branch` | Sí | |
| `port` | Sí | Puerto de la API Spring |
| `application_properties` | Sí | |
| `mysql_user` | Sí | Usuario de MariaDB y JDBC |
| `mysql_db` | Sí | Nombre de la base |
| `mysql_pass` | Sí | Contraseña usuario y root |
| `mysql_external_port` | Sí | Puerto host → 3306 del contenedor |
| `composer_file` | Sí | `plantillas/spring-3.9-java-17-maria-11/docker-compose.yml` |
| `nginx_config` | Sí | `plantillas/spring-3.9-java-17-maria-11/nginx.spring-boot-api.conf` |

---

### `spring_postgres` — Spring Boot + PostgreSQL 18.4

| Campo | Obligatorio | Notas |
|-------|:-----------:|-------|
| `branch` | Sí | |
| `port` | Sí | Puerto de la API Spring |
| `application_properties` | Sí | |
| `postgres_user` | Sí | Usuario de PostgreSQL y JDBC |
| `postgres_db` | Sí | Nombre de la base |
| `postgres_pass` | Sí | Contraseña |
| `postgres_external_port` | Sí | Puerto host → 5432 del contenedor |
| `composer_file` | Sí | `plantillas/spring-3.9-java-17-postgres-18-4/docker-compose.yml` |
| `nginx_config` | Sí | `plantillas/spring-3.9-java-17-postgres-18-4/nginx.spring-boot-api.conf` |

---

### `angular` — Frontend Angular SPA

| Campo | Obligatorio | Notas |
|-------|:-----------:|-------|
| `branch` | Sí | |
| `port` | Sí | |
| `composer_file` | Sí | `plantillas/angular-21-node-22/docker-compose.yml` |
| `environment` | No | Configuración de build (`ng build --configuration=...`). Default: `production` |
| `nginx_config` | No | |
| `path` | No | Se pasa como `--base-href` al build |

Requisitos del repo:
- `pnpm-lock.yaml` en la raíz (obligatorio; no debe haber `yarn.lock` ni `package-lock.json`)
- `angular.json` con la configuración declarada en `environment`
- Si `package.json` declara `packageManager`, debe empezar con `pnpm@`

---

### `angular_ssr` — Angular SSR (Server-Side Rendering)

Igual que `angular` pero el runtime es Node (`server/server.mjs`) en puerto 4000.

Requisitos adicionales del repo:
- SSR habilitado: `ng build` genera `dist/<proyecto>/server/server.mjs`
- El servidor SSR debe escuchar en `0.0.0.0` y respetar la variable `PORT`

| Campo | Obligatorio | Notas |
|-------|:-----------:|-------|
| `composer_file` | Sí | `plantillas/angular-21-node-22-ssr/docker-compose.yml` |

---

### `tanstack` — TanStack Start (React SSR)

| Campo | Obligatorio | Notas |
|-------|:-----------:|-------|
| `branch` | Sí | |
| `port` | Sí | |
| `composer_file` | Sí | `plantillas/tanstack-start-node-22/docker-compose.yml` |
| `environment` | No | Modo Vite (`vite build --mode ...`). Default: `production` |
| `path` | No | Se pasa como `VITE_BASE_PATH` al build |

Requisitos del repo:
- `package-lock.json` y script `npm run build` (internamente `vite build`)
- `vite.config` que respete `VITE_BASE_PATH`
- `server.mjs` en la raíz del repo

---

### `vue` — Vue 3 SPA

| Campo | Obligatorio | Notas |
|-------|:-----------:|-------|
| `branch` | Sí | |
| `port` | Sí | |
| `composer_file` | Sí | `plantillas/vue-3-node-20/docker-compose.yml` |
| `environment` | No | Modo Vite. Default: `production` |
| `path` | No | Se pasa como `VITE_BASE_PATH` al build |

---

### `python_postgres` — Python 3.11 + PostgreSQL 16

| Campo | Obligatorio | Notas |
|-------|:-----------:|-------|
| `branch` | Sí | |
| `port` | Sí | |
| `composer_file` | Sí | `plantillas/python-3.11-postgres-16/docker-compose.yml` |
| `postgres_user` | Sí | |
| `postgres_db` | Sí | |
| `postgres_pass` | Sí | |
| `postgres_external_port` | Sí | |

---

### `nginx-1.27` — Sitio estático

| Campo | Obligatorio | Notas |
|-------|:-----------:|-------|
| `branch` | Sí | |
| `port` | Sí | |
| `composer_file` | Sí | `plantillas/nginx-1.27/docker-compose.yml` |
| `nginx_config` | No | |

Archivos del sitio deben estar en `public/` del repo.

---

### `simple` — Stack genérico sin parámetros adicionales

| Campo | Obligatorio | Notas |
|-------|:-----------:|-------|
| `branch` | Sí | |
| `port` | Sí | |
| `composer_file` | Sí | Path al `docker-compose.yml` de la plantilla a usar |
| `path`, `domain`, `env`, `script` | No | |

No requiere `application_properties` ni configuración de BD. No inyecta variables de build (`VITE_BUILD_MODE`, `VITE_BASE_PATH`, `NG_BUILD_CONFIGURATION`). Usar `env:` para pasar variables al contenedor o al build.

#### Plantilla disponible: `vite-react-node-22`

React + Vite compilado con nginx en el contenedor. Usa `npm ci` + `npm run build`. Puerto interno: **80**.

Variables que acepta el `docker-compose.yml` vía `env:`:

| Variable | Default | Descripción |
|----------|---------|-------------|
| `VITE_BUILD_MODE` | `production` | Modo Vite (`--mode`) |
| `VITE_BASE_PATH` | `/` | Base path de la aplicación (`--base`) |

Ejemplo:

```yaml
produccion:
  mi-react-app:
    branch: main
    port: "3010"
    stack: simple
    composer_file: plantillas/vite-react-node-22/docker-compose.yml
    env:
      VITE_BUILD_MODE: production
      VITE_BASE_PATH: /mi-app/
```

---

## Campos comunes a todos los stacks

| Campo | Tipo | Notas |
|-------|------|-------|
| `path` | Opcional | Sub-path URL público. Ver [03-path-y-dominio.md](03-path-y-dominio.md) |
| `domain` | Opcional | Dominio para el orquestador nginx. Ver [03-path-y-dominio.md](03-path-y-dominio.md) |
| `ssl` | Opcional | Reservado, sin efecto actual |
| `env` | Opcional | Variables extra al contenedor. Ver [05-env-personalizados.md](05-env-personalizados.md) |
| `script` | Opcional | Script bash post-deploy (path relativo a `deploy/`) |
| `compose_service` | Opcional | Nombre del servicio en el compose (default: `app`) |

---

## Ejemplos

Ver [ejemplos/stacks/](ejemplos/stacks/)
