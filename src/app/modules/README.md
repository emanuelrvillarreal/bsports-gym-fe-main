# Arquitectura de `modules`

`src/app/modules` organiza la interfaz por familias funcionales y perfiles. Las pages viven en la carpeta `pages` de su familia.

## Estructura

```text
modules/
├─ auth/
│  ├─ components/
│  ├─ interfaces/
│  ├─ services/
│  └─ pages/{login,registro,recuperar-contrasena}/
├─ layout/
├─ ui/
├─ _administradores/
│  ├─ components/
│  ├─ forms/
│  ├─ pages/{dashboard,actividades,socios,solicitudes-registro,profesores,usuarios-recepcion,tesoreria,nueva-empresa}/
│  ├─ _sysadmin/{components,forms}/
│  ├─ _admin/{components,forms}/
│  └─ _adm-recepcion/{components,forms}/
├─ _socios/
│  ├─ components/
│  ├─ forms/
│  ├─ pages/{calendario,credencial,certificados,actividades,socio-titular,socio-familiar}/
│  ├─ _socio-titular/{components,forms}/
│  └─ _socio-familiar/{components,forms}/
├─ _profesores/
│  ├─ components/
│  └─ pages/{eventos,calendario,credencial}/
└─ _compartido-perfiles/
   └─ pages/{configuracion,seleccionar-empresa}/
```

No se crean carpetas `interfaces` o `services` vacías. Los contratos y servicios HTTP pertenecen a `src/app/core/api`; `auth` conserva únicamente sus servicios e interfaces propios del flujo público.

## Familias y rutas

| Familia o perfil      | Prefijo o ruta                             | Archivo de rutas                                     |
| --------------------- | ------------------------------------------ | ---------------------------------------------------- |
| Auth público          | `/login`, `/registro`, `/forgot-password`  | `auth/auth.routes.ts`                                |
| SYSADMIN              | `/sysadmin`                                | `_administradores/administradores.routes.ts`         |
| ADMIN                 | `/admin`                                   | `_administradores/administradores.routes.ts`         |
| ADM_RECEPCION         | `/adm-recepcion`                           | `_administradores/administradores.routes.ts`         |
| PROFESOR              | `/profesor`                                | `_profesores/profesores.routes.ts`                   |
| SOCIO_TITULAR         | `/socio-titular`                           | `_socios/socios.routes.ts`                           |
| FAMILIAR              | `/socio-familiar`                          | `_socios/socios.routes.ts`                           |
| Selección de contexto | `/seleccionar-empresa` | `_compartido-perfiles/compartido-perfiles.routes.ts` |

`app.routes.ts` compone estas familias. `SeoRouteData` vive en `core/routing/seo-route-data.ts` para evitar dependencias circulares.

## Pages comunes y específicas

- Las pages administrativas viven juntas en `_administradores/pages`, sin subdividirse por rol.
- ADMIN y ADM_RECEPCION comparten dashboard, actividades, socios y solicitudes de registro. Sus diferencias se declaran en `route.data`.
- SYSADMIN usa `nueva-empresa` como page principal y no posee dashboard.
- SOCIO_TITULAR y FAMILIAR comparten calendario, credencial y actividades.
- PROFESOR tiene calendario y credencial propios porque consume otro servicio y otra lógica de portal.
- PROFESOR usa `/profesor/eventos` como entrada y consulta sus actividades asignadas en `/profesor/mis-actividades`.

## Formularios

- Todo formulario no-auth vive en la carpeta `forms` de la familia o del perfil que lo posee.
- El formulario administra campos, validación y un payload tipado mediante `output()`.
- El componente contenedor conserva HTTP, popups, paginación, confirmaciones y mensajes de operación.
- Los formularios administrativos de alta de titular y familiar pertenecen a `_administradores/forms`.
- El alta pública permanece en `auth` y el alta de familiar desde el portal pertenece a `_socios/_socio-titular/forms`.

## Componentes compartidos

- `modules/ui` contiene componentes visuales reutilizables sin lógica de negocio ni HTTP.
- `modules/layout` contiene shells, header y `nav-bar`.
- Los componentes de dominio reutilizables dentro de una familia viven en `[familia]/components`.
- No se copia `ui/calendario` ni `ui/carnet`; los componentes de socio y profesor los componen con sus datos correspondientes.

## Configuración compartida

La page `_compartido-perfiles/pages/configuracion` se carga únicamente bajo los perfiles administrativos. El portal del profesor no expone configuración. `ConfiguracionSistemaComponent` permanece dentro de `_administradores/_sysadmin`, pero no está asociado a una ruta.

## Al agregar funcionalidad

1. Identificar la familia y quién es dueño de la funcionalidad.
2. Reutilizar una page común cuando dos perfiles muestran la misma pantalla con configuración declarativa.
3. Crear una page específica cuando el flujo, el servicio o la evolución esperada difieren.
4. Reutilizar `modules/ui` y los componentes de dominio existentes.
5. Registrar la ruta en el archivo `*.routes.ts` de la familia, con guard, rol y SEO.
6. Agregar o actualizar tests y el archivo `.docs.md` correspondiente.

Usar únicamente las familias, los prefijos y los archivos de rutas documentados en este índice.
