# Cómo configurar un proyecto para el deploy

Para que el sistema de deploy funcione correctamente, el proyecto debe estar preparado para **recibir su configuración a través de variables de entorno**. De ese modo, el mismo código sirve para cualquier entorno (local, staging, producción) sin cambiar archivos del repo.

El flujo es siempre:
```
deploy.yml (env:) → runtime.env → contenedor → app lee las variables
```

---

## Spring Boot — `application.server.properties`

### Convención de nombre

El archivo de propiedades del servidor se llama por convención `application.server.properties` (o `application.<entorno>.properties`). Se referencia en `deploy.yml`:

```yaml
application_properties: src/main/resources/application.server.properties
```

El deployer valida este archivo y lo monta directamente en `/config/application.properties` dentro del contenedor, en modo solo lectura. No genera copias intermedias dentro de `deploy/`. **No commitear credenciales reales**; usarlas como variables de entorno.

### Cómo recibir variables de entorno

Spring Boot resuelve placeholders `${NOMBRE_VARIABLE}` en el archivo `.properties`:

```properties
# Requerido: falla si la variable no existe
external.api.url=${EXTERNAL_API_URL}

# Con valor por defecto si la variable no está definida
app.feature.export-enabled=${FEATURE_EXPORT_ENABLED:false}

# Número (Spring convierte el string automáticamente)
app.timeout.seconds=${HTTP_TIMEOUT:30}
```

Y en `deploy.yml`:

```yaml
env:
  EXTERNAL_API_URL: "https://api.staging.com/v1"
  FEATURE_EXPORT_ENABLED: true
  HTTP_TIMEOUT: 45
```

### Variables JDBC en stacks con BD embebida

Para `spring_maria` y `spring_postgres`, el deployer genera automáticamente `SPRING_DATASOURCE_*`. El `.properties` las recibe sin declararlas en `env:`:

```properties
spring.datasource.url=${SPRING_DATASOURCE_URL}
spring.datasource.username=${SPRING_DATASOURCE_USERNAME}
spring.datasource.password=${SPRING_DATASOURCE_PASSWORD}
```

### Patrón recomendado: mismo properties para todos los entornos

Un único `application.server.properties` que lee todo de variables de entorno:

```properties
server.port=${SERVER_PORT:8080}

# Base de datos (generadas automáticamente por el deployer en spring_maria/spring_postgres)
spring.datasource.url=${SPRING_DATASOURCE_URL}
spring.datasource.username=${SPRING_DATASOURCE_USERNAME}
spring.datasource.password=${SPRING_DATASOURCE_PASSWORD}

# Configuración propia de la app (declarada en env: del deploy.yml)
app.external-api.url=${EXTERNAL_API_URL}
app.feature.new-ui=${FEATURE_NEW_UI:false}
app.max-upload-mb=${MAX_UPLOAD_MB:10}
```

Cada entorno declara sus valores en el bloque `env:` correspondiente del `deploy.yml`.

### Acceso en Java

```java
// Con @Value
@Value("${app.external-api.url}")
private String externalApiUrl;

// Con @ConfigurationProperties
@ConfigurationProperties(prefix = "app.external-api")
public record ExternalApiConfig(String url) {}
```

### Precedencia (de menor a mayor)

1. Defaults en el placeholder (`${VAR:default}`)
2. Contenido del `application.properties` montado
3. Variables del bloque `env:` → `runtime.env` → entorno del contenedor
4. Variables fijadas por infra en `docker-compose.yml` (`SPRING_DATASOURCE_*`, `SERVER_PORT`, etc.)

---

## Angular — environments

### Cómo funciona el build

El deployer pasa `NG_BUILD_CONFIGURATION` al Dockerfile. Este lo usa para ejecutar:

```bash
ng build --configuration=<valor>
```

El valor viene del campo `environment` en `deploy.yml`:

```yaml
environment: st7   # → ng build --configuration=st7
```

Si se omite, usa `production`.

### Configurar `angular.json`

Cada entorno debe estar declarado en `angular.json` bajo `projects.<proyecto>.architect.build.configurations`:

```json
{
  "configurations": {
    "production": {
      "fileReplacements": [
        {
          "replace": "src/environments/environment.ts",
          "with": "src/environments/environment.prod.ts"
        }
      ]
    },
    "st7": {
      "fileReplacements": [
        {
          "replace": "src/environments/environment.ts",
          "with": "src/environments/environment.st7.ts"
        }
      ]
    },
    "local": {
      "fileReplacements": [
        {
          "replace": "src/environments/environment.ts",
          "with": "src/environments/environment.local.ts"
        }
      ]
    }
  }
}
```

### Archivos de environment

```typescript
// src/environments/environment.st7.ts
export const environment = {
  production: false,
  apiUrl: 'https://stg.blueopendata.com/mi-app/api',
};

// src/environments/environment.prod.ts
export const environment = {
  production: true,
  apiUrl: 'https://app.blueopendata.com/mi-app/api',
};

// src/environments/environment.local.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:9050/api',
};
```

### Base href automático

El deployer inyecta `NG_APP_BASE_HREF=/<path>/` que el Dockerfile usa en el build. El `path` del `deploy.yml` debe coincidir con el `baseHref` en `angular.json` para SSR.

---

## Vue 3 / TanStack — Vite modes

### Cómo funciona el build

El deployer pasa `VITE_BUILD_MODE` al Dockerfile:

```bash
vite build --mode <valor>
```

El valor viene del campo `environment` en `deploy.yml`:

```yaml
environment: production   # → vite build --mode production
```

### Archivos `.env` de Vite

Vite carga automáticamente `.env.<mode>` en el build:

```
.env.production      ← usado con environment: production
.env.staging         ← usado con environment: staging
.env.local           ← usado en local
```

Ejemplo `.env.production`:

```env
VITE_API_URL=https://app.blueopendata.com/mi-app/api
VITE_FEATURE_NEW_UI=true
```

### Base path automático

El deployer inyecta `VITE_BASE_PATH=/<path>/`. En `vite.config.ts`:

```typescript
export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/',
});
```

---

## Resumen: qué necesita cada tipo de proyecto

| Tipo | Configuración por entorno | Variable del deployer | Campo en deploy.yml |
|------|--------------------------|----------------------|---------------------|
| Spring Boot | `application.server.properties` con `${VAR}` | Variables en `env:` del YAML | `application_properties` |
| Angular | `environment.<nombre>.ts` + `angular.json` | `NG_BUILD_CONFIGURATION` | `environment` |
| Vue 3 | `.env.<mode>` | `VITE_BUILD_MODE` | `environment` |
| TanStack | `.env.<mode>` | `VITE_BUILD_MODE` | `environment` |
| Python | Variables de entorno del proceso | Variables en `env:` del YAML | — |

---

## Ejemplos

Ver [ejemplos/configurar-proyecto/](ejemplos/configurar-proyecto/)
