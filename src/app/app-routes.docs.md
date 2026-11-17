# Rutas de la aplicación

`app.routes.ts` compone los árboles exportados por cada familia. Las pages se cargan con `loadComponent` y el contrato común de metadatos vive en `core/routing/seo-route-data.ts`.

## Archivos de routing

| Archivo                                                      | Responsabilidad                                                |
| ------------------------------------------------------------ | -------------------------------------------------------------- |
| `modules/auth/auth.routes.ts`                                | Rutas públicas de autenticación                                |
| `modules/_compartido-perfiles/compartido-perfiles.routes.ts` | Selección unificada de empresa y rol; loader de configuración compartida |
| `modules/_administradores/administradores.routes.ts`         | SYSADMIN, ADMIN y ADM_RECEPCION                                |
| `modules/_profesores/profesores.routes.ts`                   | PROFESOR                                                       |
| `modules/_socios/socios.routes.ts`                           | SOCIO_TITULAR y FAMILIAR                                       |

## Rutas públicas y de contexto

| Ruta                   | Protección                                       |
| ---------------------- | ------------------------------------------------ |
| `/login`               | `authGuestGuard`                                 |
| `/registro`            | `authGuestGuard`                                 |
| `/registrate`          | Redirect a `/registro`                           |
| `/forgot-password`     | `authGuestGuard`                                 |
| `/seleccionar-empresa` | `authSessionGuard` y `seleccionEmpresaGuard`     |
| `/inicio`              | Redirect dinámico según el contexto autenticado  |

Después del login, `/seleccionar-empresa` resuelve en una sola page la empresa y, cuando corresponde, el rol activo dentro de ella. Los guards pueden continuar directamente al inicio cuando no hay una elección pendiente.

## Áreas privadas

| Prefijo           | Layout                           | Rol canónico    | Ruta principal             |
| ----------------- | -------------------------------- | --------------- | -------------------------- |
| `/sysadmin`       | `LayoutSysadminComponent`        | `SYSADMIN`      | `/sysadmin/nueva-empresa`  |
| `/admin`          | `LayoutAdministradoresComponent` | `ADMIN`         | `/admin/dashboard`         |
| `/adm-recepcion`  | `LayoutAdministradoresComponent` | `ADM_RECEPCION` | `/adm-recepcion/accesos` |
| `/profesor`       | `LayoutProfesorComponent`        | `PROFESOR`      | `/profesor/eventos`      |
| `/socio-titular`  | `LayoutSociosComponent`          | `SOCIO_TITULAR` | `/socio-titular/credencial`  |
| `/socio-familiar` | `LayoutSociosComponent`          | `FAMILIAR`      | `/socio-familiar/credencial` |

Cada raíz privada declara `authRoleGuard`, `authRoleChildGuard` y `data.roles`. El rol `FAMILIAR` conserva ese nombre en el contrato y usa el prefijo canónico `/socio-familiar`.

## Rutas por perfil

### SYSADMIN

- `/sysadmin/nueva-empresa`
- `/sysadmin/configuracion`

### ADMIN

- `/admin/dashboard`
- `/admin/completar-perfil` (wizard de alta parcial; se abre automáticamente si faltan datos del club)
- `/admin/solicitudes-registro`
- `/admin/socios`
- `/admin/usuarios-recepcion`
- `/admin/profesores`
- `/admin/actividades`
- `/admin/eventos`
- `/admin/eventos-acceso`
- `/admin/tesoreria`
- `/admin/ingresos`
- `/admin/configuracion`

### ADM_RECEPCION

- `/adm-recepcion/accesos`
- `/adm-recepcion/solicitudes-registro`
- `/adm-recepcion/socios`
- `/adm-recepcion/actividades`
- `/adm-recepcion/eventos`
- `/adm-recepcion/eventos-acceso`
- `/adm-recepcion/tesoreria`
- `/adm-recepcion/ingresos`

ADMIN y ADM_RECEPCION reutilizan las pages de solicitudes, socios, actividades, eventos, entradas a eventos, Tesorería e Ingresos. Cada prefijo conserva su propio `data.roles`; los demás datos de ruta expresan diferencias como administración de actividades y cantidad de filas visibles. Las tres áreas administrativas mantienen sus pages juntas en `_administradores/pages`, sin subdividirlas por rol.

### SOCIO_TITULAR y FAMILIAR

Ambos perfiles reutilizan las mismas pages de calendario, credencial y actividades:

- `/socio-titular/{perfil,certificados,credencial,grupo-familiar,cuotas,amenities,actividades,calendario}`
- `/socio-familiar/{perfil,certificados,credencial,actividades,calendario}`

`actividades` comparte la page: titular y familiar ven sus inscripciones vigentes; el catálogo y la inscripción quedan solo para el titular.

`grupo-familiar` es exclusivo del titular. Los componentes de lógica preparan los datos y componen `ui/calendario` y `ui/carnet`.

### PROFESOR

- `/profesor/eventos`
- `/profesor/mis-actividades`
- `/profesor/perfil`
- `/profesor/credencial`
- `/profesor/calendario`

Profesor tiene gestión propia de eventos y asistencias, además de pages específicas para calendario y credencial. El portal no expone Inicio ni Configuración. La asistencia se consulta en `/profesor/asistencias`.

## Configuración compartida

`ConfiguracionPageComponent`, ubicado en `_compartido-perfiles`, se carga en `SYSADMIN` y `ADMIN` mediante
el mismo loader. `ADM_RECEPCION` no expone la página de configuración y tampoco se registra bajo `/profesor`.

## Agregar una pantalla privada

1. Crear la page en la familia propietaria, compartiéndola cuando varios perfiles usan el mismo caso de uso.
2. Reutilizar los componentes documentados en [docs/ui/README.md](../../docs/ui/README.md).
3. Registrar la page en el archivo `*.routes.ts` de la familia.
4. Declarar `SeoRouteData`, `data.roles` y cualquier dato específico de comportamiento.
5. Agregar una opción equivalente a `nav-bar` si la pantalla debe ser navegable.
6. Probar loader, guard, rol permitido y aislamiento entre prefijos.
