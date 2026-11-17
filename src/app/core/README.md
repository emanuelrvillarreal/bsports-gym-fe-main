# Core

`core` concentra la infraestructura base del template.

## Estructura

- `api/`: definicion central de rutas backend
- `auth/`: roles y helpers de autorizacion
- `global-services/`: auth, sesion y servicios transversales
- `guards/`: proteccion de rutas
- `interceptors/`: autenticacion, refresh, toasts y headers por request
- `routing/`: contratos transversales de routing, como `SeoRouteData`

## Regla Del Template

En `core` debe vivir infraestructura reusable.

No debe vivir:

- UI
- paginas
- logica visual
- reglas de negocio puntuales de una pantalla

## Documentacion

- [api-patron.docs.md](./api/api-patron.docs.md)
- [api-routes.docs.md](./api/api-routes.docs.md)
- [auth-global-services.docs.md](./global-services/auth-global-services.docs.md)
- [guards.docs.md](./guards/guards.docs.md)
- [interceptors.docs.md](./interceptors/interceptors.docs.md)
- [roles-extensibles.md](../../../docs/core/roles-extensibles.md)
