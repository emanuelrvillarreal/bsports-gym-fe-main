# Guía de arquitectura

Esta guía describe la estructura vigente de B Sports Club y las reglas para extenderla sin duplicar infraestructura ni componentes visuales.

## Estructura principal

| Carpeta                         | Responsabilidad                                                       |
| ------------------------------- | --------------------------------------------------------------------- |
| `core/`                         | API, auth, guards, interceptors, routing, iconos y servicios globales |
| `helpers/`                      | Funciones puras y reutilizables                                       |
| `modules/auth/`                 | Pages y componentes del flujo público de autenticación                |
| `modules/layout/`               | Shells privados, header y nav-bar                                     |
| `modules/ui/`                   | Componentes visuales y motores de apariencia                          |
| `modules/_administradores/`     | Funcionalidad de SYSADMIN, ADMIN y ADM_RECEPCION                      |
| `modules/_socios/`              | Funcionalidad común y específica de socios                            |
| `modules/_profesores/`          | Funcionalidad del profesor                                            |
| `modules/_compartido-perfiles/` | Selección de contexto y pages compartidas por perfiles                |

## Organización de un módulo

Una familia puede contener:

- `pages/`: componentes asociados directamente a una ruta;
- `components/`: componentes con lógica de presentación reutilizable dentro de la familia;
- `forms/`: formularios que controlan campos y validación y emiten payloads tipados;
- subcarpetas por perfil cuando una funcionalidad no es compartida;
- un archivo `*.routes.ts` para declarar su árbol de rutas.

No crear carpetas vacías de `services` o `interfaces`. Los servicios y DTO HTTP permanecen en `core/api`; las interfaces puramente visuales pueden vivir junto al componente que las consume.

## Reglas por capa

### `core`

Contiene infraestructura transversal. No debe contener UI, estilos visuales ni lógica puntual de una pantalla.

Documentación: [core/README.md](./core/README.md)

### `modules/layout`

Contiene el shell autenticado: navegación, header, contenedor y comportamiento responsive. Los layouts de perfil componen `LayoutMainComponent`; no consumen endpoints ni deciden permisos de negocio.

Documentación: [layout/README.md](./modules/layout/README.md)

### `modules/ui`

Contiene componentes visuales reutilizables y motores de apariencia. Antes de crear uno nuevo, revisar el [índice UI](../../docs/ui/README.md).

No agregar fetch de negocio ni DTO específicos de un perfil. Calendario y carnet reciben datos preparados por componentes de lógica de cada familia.

### Familias de perfiles

- `_administradores/pages` centraliza todas las pages administrativas sin subcarpetas por rol. ADMIN y ADM_RECEPCION comparten `dashboard`; SYSADMIN inicia en `nueva-empresa`.
- `_sysadmin`, `_admin` y `_adm-recepcion` conservan sus componentes y formularios exclusivos. Las diferencias compartidas se expresan mediante datos de ruta.
- `_socios/pages` centraliza las pages; las exclusivas se agrupan por perfil en `pages/socio-titular` y `pages/socio-familiar`.
- `_socio-titular` y `_socio-familiar` conservan únicamente sus componentes y formularios exclusivos.
- `_profesores` mantiene lógica propia para calendario y credencial, pero compone los componentes visuales de `ui`.
- `_compartido-perfiles` contiene la selección unificada de empresa y rol, y la page mínima de configuración compartida.

## Sistema visual

Los motores son independientes:

- **Esquema**: `light` / `dark` mediante [dark-mode](./modules/ui/dark-mode/dark-mode.docs.md).
- **Branding**: colores primario, secundario y terciario mediante [color-mod](./modules/ui/color-mod/color-mod.docs.md).
- **Performance**: reducción de animaciones costosas mediante [alto-rendimiento](./modules/ui/alto-rendimiento/alto-rendimiento.docs.md).

Visión general: [theme-system.docs.md](./modules/ui/theme-system.docs.md)

## Routing

`app.routes.ts` compone rutas por familia:

1. `AUTH_ROUTES` para login, registro y recuperación de contraseña.
2. `COMPARTIDO_PERFILES_ROUTES` para seleccionar empresa y rol en una única page.
3. `/inicio`, que resuelve el prefijo según el contexto activo.
4. Árboles privados de administradores, profesores y socios.
5. Fallback a `/inicio`.

Cada árbol privado usa `authRoleGuard`, `authRoleChildGuard`, lazy loading con `loadComponent` y `data.roles`. El contrato SEO común vive en `core/routing/seo-route-data.ts` para evitar dependencias circulares.

Detalle: [app-routes.docs.md](./app-routes.docs.md)

## Dónde va cada pieza

| Tipo                                | Destino                                                 |
| ----------------------------------- | ------------------------------------------------------- |
| Endpoint, DTO o servicio HTTP       | `core/api`                                              |
| Auth, sesión, guard o interceptor   | `core`                                                  |
| Helper puro                         | `helpers`                                               |
| Shell o navegación                  | `modules/layout`                                        |
| Componente visual reutilizable      | `modules/ui`                                            |
| Page compartida por varios perfiles | `modules/_compartido-perfiles` o `pages/` de su familia |
| Page exclusiva administrativa       | `modules/_administradores/pages/[page]/`                |
| Page exclusiva de socios            | `pages/[perfil]/` dentro de `_socios`                   |
| Formulario de dominio               | `forms/` de la familia o perfil propietario             |
| Formulario público de autenticación | `modules/auth/components`                               |

## Agregar una funcionalidad

1. Identificar si pertenece a una familia existente y si es compartida entre perfiles.
2. Reutilizar componentes de `ui` antes de crear o modificar uno.
3. Mantener el contrato HTTP en `core/api` y la coordinación del caso de uso fuera del componente visual.
4. Registrar la ruta en el archivo `*.routes.ts` de la familia con `SeoRouteData` y `data.roles`.
5. Agregar la opción equivalente a `nav-bar` cuando la pantalla deba ser navegable.
6. Cubrir el comportamiento nuevo con pruebas y actualizar la documentación vecina al código.

## Documentación transversal

- [Patrón API](./core/api/api-patron.docs.md)
- [Rutas API](./core/api/api-routes.docs.md)
- [Auth global](./core/global-services/auth-global-services.docs.md)
- [Guards](./core/guards/guards.docs.md)
- [Interceptors](./core/interceptors/interceptors.docs.md)
- [Roles extensibles](../../docs/core/roles-extensibles.md)
