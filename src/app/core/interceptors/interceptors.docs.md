# Interceptors

El interceptor principal del template es:

- [auth.interceptor.ts](./auth.interceptor.ts)

Y se apoya en contextos HTTP:

- [auth-context.ts](./context/auth-context.ts)
- [http-toast-context.ts](./context/http-toast-context.ts)
- [http-headers-context.ts](./context/http-headers-context.ts)

## Que Hace El Interceptor

1. agrega `Authorization: Bearer <accessToken>` a requests privadas
2. si una request privada recibe `401`, intenta refresh una sola vez
3. reintenta la request original
4. puede disparar toasts de exito o error por request
5. puede adjuntar headers custom desde `HttpContext`

El refresh se comparte entre requests concurrentes. Ante un fallo recuperable del
refresh (`0`, `401`, `408`, `429` o `5xx`) se hacen hasta dos reintentos con backoff.
Al agotarse o recibir un error no recuperable, se limpia la sesiÃ³n y se redirige a
`/login`. Si la request original vuelve a responder `401` con el token renovado,
la sesiÃ³n tambiÃ©n se cierra para evitar ciclos.

Un `403` representa falta de permisos para la operacion solicitada: se propaga al
consumidor y nunca intenta renovar la sesion.

## Como Omitir Auth

Usar `OMITIR_AUTH`:

```ts
context: new HttpContext().set(OMITIR_AUTH, true);
```

Esto sirve para:

- login
- refresh
- endpoints publicos

## Como Mostrar Toasts Por Request

Exito:

```ts
context: new HttpContext().set(MOSTRAR_TOAST_EXITO, { titulo: 'Perfil' });
```

Error:

```ts
context: new HttpContext().set(MOSTRAR_TOAST_ERROR, { titulo: 'Perfil' });
```

## Errores de validacion de DTO

El interceptor normaliza las respuestas de error para todas las requests que usan
`MOSTRAR_TOAST_ERROR`. Si el backend devuelve `fields`, se muestra un unico toast
con los detalles por campo, por ejemplo:

```json
{
  "userMessage": "Error en el formulario",
  "fields": [
    { "nombreCampo": "cuit", "message": "no debe estar vacio" },
    { "nombreCampo": "emailInstitucional", "message": "debe tener formato valido" }
  ]
}
```

Resultado: `cuit: no debe estar vacio · emailInstitucional: debe tener formato valido`.
La prioridad es `fields`, `userMessage`, `message`, `error` y, por ultimo, el
mensaje HTTP seguro. Nunca se muestra `developerMessage`.

Los formularios solo validan datos locales y emiten el payload. Las pantallas que
muestren un error propio deben reutilizar `extraerMensajeErrorApi` de `core/api`.

## Como Pasar Datos En Headers

### `X-Company-Uuid`

```ts
import { conCompanyUuid } from '../../core/interceptors/context/http-headers-context';

const context = conCompanyUuid(new HttpContext(), 'empresa-1');
```

### Headers Extra

```ts
import { conHeadersExtra } from '../../core/interceptors/context/http-headers-context';

const context = conHeadersExtra(new HttpContext(), {
  'X-Tenant-Slug': 'mi-club',
  'X-Trace-Source': 'admin-panel',
});
```

### Combinado

```ts
let context = new HttpContext();
context = conCompanyUuid(context, 'empresa-1');
context = conHeadersExtra(context, {
  'X-Tenant-Slug': 'mi-club',
});
```

## Ejemplo Completo

```ts
this.http.post(url, body, {
  context: conHeadersExtra(
    conCompanyUuid(
      new HttpContext()
        .set(MOSTRAR_TOAST_EXITO, { titulo: 'Productos' })
        .set(MOSTRAR_TOAST_ERROR, { titulo: 'Productos' }),
      'empresa-1',
    ),
    {
      'X-Trace-Source': 'listado-productos',
    },
  ),
});
```

## Alcance

Impacta en todas las requests HTTP que pasen por el interceptor.

## Regla Del Template

El interceptor debe seguir siendo infraestructura.

No conviene meter:

- logica de negocio
- decisiones de pantalla
- headers hardcodeados por feature

Si una app necesita headers especiales, conviene pasarlos por `HttpContext` como se hace ahora.
