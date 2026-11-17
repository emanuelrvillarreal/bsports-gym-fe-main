# Path y Dominio

---

## `path` — Sub-path de la URL pública

### Qué es

`path` es el prefijo de la URL bajo la cual se publica el servicio. Se escribe sin barras al inicio ni al final.

```yaml
path: convenios
# → https://<dominio>/convenios/
```

### Qué hace

1. **Sustituye `{PATH}` en la plantilla nginx** — el runner reemplaza el placeholder con el valor de `path` para construir el bloque `location`.
2. **Configura el base href del frontend**:
   - Angular / Angular SSR: `NG_APP_BASE_HREF=/<path>/` → `ng build --base-href=/<path>/`
   - Vue / TanStack: `VITE_BASE_PATH=/<path>/`
3. **En stacks Spring**: si se omite `path`, la API queda en `/api` (la plantilla nginx lo define así).

### Cuándo usarlo

- Siempre que el servicio no esté en la raíz del dominio.
- Cuando varios servicios comparten el mismo dominio y se diferencian por path.

### Cuándo omitirlo

- Cuando el servicio es el único del dominio y debe responder en `/`.
- En ese caso, si la plantilla nginx usa `{PATH}`, el runner cambia automáticamente a la variante `-root.conf`.

### Selección automática de plantilla root

Si el campo `nginx_config` apunta a una plantilla que contiene `{PATH}` y `path` está vacío, el runner busca automáticamente la variante `-root.conf`:

| Plantilla configurada | Variante usada si no hay path |
|-----------------------|-------------------------------|
| `plantillas/angular-21-node-22/nginx.host-reverse-proxy.conf` | `nginx.host-reverse-proxy-root.conf` |
| `plantillas/spring-3.9-java-17/nginx.spring-boot-api.conf` | `nginx.spring-boot-api-root.conf` |
| `plantillas/tanstack-start-node-22/nginx.host-reverse-proxy.conf` | `nginx.host-reverse-proxy-root.conf` |
| *(y así para todos los stacks)* | |

Si no existe la variante `-root.conf`, el deploy falla con un error claro.

---

## `domain` — Dominio para el orquestador nginx

### Qué es

`domain` es el dominio público del servicio, sin protocolo ni path.

```yaml
domain: stg.blueopendata.com
```

### Qué hace

Cuando se define `domain`, el runner agrega esta línea al inicio del fragmento nginx instalado:

```nginx
# domain: stg.blueopendata.com
```

Ese comentario es **metadata para el orquestador de fragmentos** (`nginx_fragment_orchestrator.py`). El orquestador agrupa todos los fragmentos con el mismo `domain` dentro de un único bloque `server { server_name <domain>; }`.

### Cuándo usarlo

- Cuando dos o más servicios deben quedar bajo el mismo `server_name` nginx (por ejemplo, un frontend y una API bajo el mismo dominio).
- Para que el orquestador pueda construir el bloque `server` correcto.

### Cuándo omitirlo

- Si el servicio tiene su propio `server_name` dedicado (el orquestador lo trata como fragmento del server default).
- En deploys locales (`--local`): el campo es ignorado, no se configura nginx.

### Múltiples dominios para el mismo servicio

Si el mismo servicio debe responder desde dos o más dominios, se pueden declarar **separados por coma** en el campo `domain`:

```yaml
domain: sb-habilitaciones.malvinasargentinas.gob.ar, sb-vecitos-habilitaciones.malvinasargentinas.gob.ar
```

El orquestador genera un único bloque `server` con ambos en `server_name`:

```nginx
server {
    server_name sb-habilitaciones.malvinasargentinas.gob.ar sb-vecitos-habilitaciones.malvinasargentinas.gob.ar;
    ...
}
```

El archivo de configuración se nombra con el **primer dominio** de la lista. Los demás son alias.

> El servidor (Certbot / SSL) debe tener certificado válido para **cada** dominio listado.

---

## Diferencia entre `path` y `domain`

| | `path` | `domain` |
|--|--------|---------|
| **Afecta** | URL interna del servicio y build del frontend | Agrupación en el server_name de nginx |
| **Se necesita para** | Publicar en subruta, base href correcto | Agrupar varios servicios bajo un mismo dominio |
| **Ignorado en local** | No (afecta el build) | Sí |
| **Ejemplo** | `path: convenios` → `/convenios/` | `domain: stg.blueopendata.com` |

---

## Caso típico: frontend + API bajo el mismo dominio

```yaml
st7:
  ecommerce-fe:
    branch: develop
    port: 9051
    path: ecommerce
    domain: stg.blueopendata.com

    stack: angular
    environment: st7
    composer_file: plantillas/angular-21-node-22/docker-compose.yml
    nginx_config: plantillas/angular-21-node-22/nginx.host-reverse-proxy.conf

  ecommerce-api:
    branch: develop
    port: 9050
    path: ecommerce
    domain: stg.blueopendata.com

    stack: spring
    composer_file: plantillas/spring-3.9-java-17/docker-compose.yml
    nginx_config: plantillas/spring-3.9-java-17/nginx.spring-boot-api.conf
    application_properties: src/main/resources/application.st7.properties
```

Resultado:
- Frontend: `https://stg.blueopendata.com/ecommerce/`
- API: `https://stg.blueopendata.com/ecommerce/api`

> **Nota:** No usar `path: ecommerce/api` para Spring; la plantilla nginx ya agrega `/api` al proxy.

---

## Caso: servicio en raíz del dominio (sin path)

```yaml
s4:
  mi-home:
    branch: main
    port: 6038

    stack: nginx-1.27
    composer_file: plantillas/nginx-1.27/docker-compose.yml
    nginx_config: plantillas/nginx-1.27/nginx.host-reverse-proxy-root.conf
```

Al no haber `path`, se usa directamente la plantilla `-root.conf`.

---

## Ejemplos

Ver [ejemplos/path-y-dominio/](ejemplos/path-y-dominio/)
