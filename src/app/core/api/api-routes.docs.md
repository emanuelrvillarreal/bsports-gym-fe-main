# API Routes

`api-routes.ts` centraliza los endpoints del backend para evitar strings sueltos en servicios.

Archivo fuente:

- [api-routes.ts](./api-routes.ts)

Patrón de servicios: [api-patron.docs.md](./api-patron.docs.md)

## Objetivo

- mantener un estandar de naming
- agrupar endpoints por dominio
- evitar concatenaciones repetidas
- facilitar refactor de rutas backend

## Regla De Uso

En servicios no se debe escribir:

```ts
this.http.get('/user/login');
```

Se debe usar:

```ts
this.http.get(this.crearUrl(API_ROUTES.auth.login));
```

## Estructura Recomendada

Agrupar por recurso o dominio:

```ts
export const API_ROUTES = {
  auth: {
    login: 'user/login',
    registrar: 'user/register',
  },
  ejemploEntidad: {
    paginar: 'ejemplo-entidades/paginate',
    guardar: 'ejemplo-entidades/save',
    eliminar: (uuid: string) => `ejemplo-entidades/${uuid}`,
  },
} as const;
```

## Convenciones

- nombres cortos y claros
- plural por modulo cuando aplica
- string fijo para rutas estaticas
- funcion para rutas con params
- no meter logica de negocio dentro de `api-routes`

## Autenticación pública por enlace

`API_ROUTES.auth.startLogin` apunta a `POST /user/public/start-login` y recibe `{ email, path? }` sin JWT ni `X-Company-Uuid`. `API_ROUTES.auth.finishLogin` apunta a `POST /user/public/finish-login` y recibe `{ code }`, también sin esos headers. La respuesta de canje entrega tokens JWT y reutiliza el flujo de sesión de `AuthService`.

## Ejemplos

Ruta fija:

```ts
API_ROUTES.auth.login;
```

Ruta dinamica:

```ts
API_ROUTES.ejemploEntidad.eliminar(uuid);
```

Ruta con query simple:

```ts
`${this.crearUrl(API_ROUTES.ejemploEntidad.paginar)}?page=1`;
```

## Alcance

Impacta en todos los servicios que consumen backend.

## Recomendacion Para El Template

Si la app crece, conviene mantener esta estructura:

- `api-routes.ts` como indice central
- agrupacion por dominio
- helpers chicos y predecibles

Si en algun momento aparecen muchas query strings complejas, conviene mover esa composicion al servicio y dejar `api-routes` solo con el path base.
