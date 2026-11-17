# B Sports Club

Aplicación Angular para la gestión de clubes, con autenticación, selección de empresa y rol, portales privados por perfil y una biblioteca UI reutilizable.

## Tecnologías principales

- Angular 21 con componentes standalone
- TypeScript 5.9
- Signals y estrategia de detección de cambios `OnPush`
- Angular SSR sobre Express
- SCSS y RxJS
- `@ng-icons`
- Driver.js para recorridos de onboarding
- Vitest para pruebas unitarias
- pnpm 11 como gestor de paquetes

## Requisitos

- Node.js en una versión compatible con Angular 21
- Corepack habilitado o pnpm 11 instalado

El proyecto declara `pnpm@11.1.3`. Para evitar diferencias en el lockfile, no mezclar instalaciones con npm o Yarn.

## Puesta en marcha

```bash
corepack enable
pnpm install
pnpm start
```

La aplicación queda disponible, por defecto, en `http://localhost:4200`.

### Comandos disponibles

| Comando | Uso |
| ------- | --- |
| `pnpm start` | Inicia el servidor de desarrollo |
| `pnpm build` | Genera el build de producción con SSR |
| `pnpm watch` | Compila en modo desarrollo y observa cambios |
| `pnpm test` | Ejecuta las pruebas unitarias |
| `pnpm serve:ssr:bsports-club-fe` | Sirve localmente un build SSR ya generado |

## Flujos públicos y de contexto

| Ruta                   | Uso                                                      |
| ---------------------- | -------------------------------------------------------- |
| `/login`               | Inicio de sesión                                         |
| `/registro`            | Registro público; `/registrate` es un alias              |
| `/forgot-password`     | Recuperación de contraseña                               |
| `/seleccionar-empresa` | Selección unificada de empresa y rol activo               |
| `/inicio`              | Resolución del inicio correspondiente al contexto activo |

Las rutas públicas usan `authGuestGuard`. Las rutas de selección requieren sesión y los árboles privados validan el rol activo mediante `authRoleGuard` y `authRoleChildGuard`.

## Perfiles privados

| Rol canónico    | Prefijo           | Layout                           |
| --------------- | ----------------- | -------------------------------- |
| `SYSADMIN`      | `/sysadmin`       | `LayoutSysadminComponent`        |
| `ADMIN`         | `/admin`          | `LayoutAdministradoresComponent` |
| `ADM_RECEPCION` | `/adm-recepcion`  | `LayoutAdministradoresComponent` |
| `PROFESOR`      | `/profesor`       | `LayoutProfesorComponent`        |
| `SOCIO_TITULAR` | `/socio-titular`  | `LayoutSociosComponent`          |
| `FAMILIAR`      | `/socio-familiar` | `LayoutSociosComponent`          |

Cada perfil tiene `/inicio` y `/configuracion`. La configuración compartida es por ahora una page mínima, sin editor ni permisos finos.

## Estado operativo del club

Cuando la empresa activa se encuentra bloqueada, los perfiles privados se redirigen a
`/club-bloqueado`. Para `SOCIO_TITULAR`, `FAMILIAR` y `PROFESOR`, la pantalla comunica de forma
empática que el club no tiene actividad online temporalmente y recomienda contactarse con el club.

El perfil `ADMIN` conserva las acciones de regularización: puede consultar la factura vencida y
abrir el pago correspondiente.

## Facturación CRM

La ruta `/admin/crm-manager` permite al `ADMIN` consultar las facturas de la suscripción CRM y
gestionar sus pagos. Al ver el detalle o iniciar el pago, el importe se presenta con la aclaración
`(+ IVA)` junto al monto mostrado; esta leyenda es informativa y no altera el valor enviado al medio
de pago.

## Estructura del proyecto

El árbol resume las responsabilidades principales. Se omiten `node_modules/`, `.angular/` y `dist/` porque son dependencias o artefactos generados.

```text
b-sports-club-fe/
├─ .agents/                         # Guías de trabajo para agentes y desarrolladores
├─ docs/
│  ├─ core/                         # Documentación transversal del núcleo
│  └─ ui/                           # Índice de componentes visuales reutilizables
├─ postman/                         # Contratos y colecciones de referencia del backend
├─ public/
│  └─ assets/                       # Imágenes, iconos, fuentes y recursos estáticos
├─ src/
│  ├─ app/
│  │  ├─ core/
│  │  │  ├─ api/                    # Endpoints, interfaces y servicios HTTP
│  │  │  ├─ auth/                   # Roles y modelos base de autorización
│  │  │  ├─ global-services/        # Sesión y servicios globales de autenticación
│  │  │  ├─ guards/                 # Protección y redirección de rutas
│  │  │  ├─ icons/                  # Registro central de iconos
│  │  │  ├─ interceptors/           # Auth, headers, contexto HTTP y feedback
│  │  │  └─ routing/                # Contratos transversales de routing y SEO
│  │  ├─ helpers/                   # Funciones puras de formato y presentación
│  │  ├─ modules/
│  │  │  ├─ auth/                   # Login, registro y recuperación de contraseña
│  │  │  ├─ layout/                 # Shells, header y navegación por perfil
│  │  │  ├─ ui/                     # Sistema visual reutilizable y sin negocio
│  │  │  ├─ _administradores/       # SYSADMIN, ADMIN y ADM_RECEPCION
│  │  │  ├─ _compartido-perfiles/   # Selección de contexto y configuración común
│  │  │  ├─ _profesores/            # Portal del profesor
│  │  │  └─ _socios/                # Portal de titular y familiar
│  │  ├─ app.config.ts              # Providers globales del navegador
│  │  ├─ app.config.server.ts       # Providers exclusivos del servidor
│  │  ├─ app.routes.ts              # Composición de las familias de rutas
│  │  ├─ app.routes.server.ts       # Estrategia de renderizado SSR
│  │  └─ template-starter.config.ts # Configuración funcional del template
│  ├─ environments/                 # URLs y flags por ambiente
│  ├─ main.ts                       # Bootstrap del navegador
│  ├─ main.server.ts                # Bootstrap de Angular en el servidor
│  ├─ server.ts                     # Servidor Express para SSR
│  └─ styles.scss                   # Estilos globales y tokens compartidos
├─ angular.json                     # Build, serve, test, assets y presupuestos
├─ package.json                     # Dependencias y scripts
├─ pnpm-lock.yaml                   # Versiones resueltas de dependencias
└─ tsconfig*.json                   # Configuración TypeScript por destino
```

### Organización de `modules`

```text
modules/
├─ auth/
│  ├─ components/
│  ├─ interfaces/
│  ├─ pages/{login,registro,recuperar-contrasena}/
│  └─ services/
├─ layout/
│  └─ components/
├─ ui/                              # Componentes reutilizables documentados
├─ _administradores/
│  ├─ components/                   # Compartidos por la familia
│  ├─ forms/
│  ├─ pages/                        # Pages comunes y específicas por perfil
│  ├─ _sysadmin/{components,forms}/
│  ├─ _admin/{components,forms}/
│  └─ _adm-recepcion/{components,forms}/
├─ _socios/
│  ├─ components/                   # Compartidos entre socios
│  ├─ forms/
│  ├─ pages/                        # Pages comunes, de titular y de familiar
│  ├─ _socio-titular/{components,forms}/
│  └─ _socio-familiar/{components,forms}/
├─ _profesores/
│  ├─ components/
│  └─ pages/
└─ _compartido-perfiles/
   └─ pages/{configuracion,seleccionar-empresa}/
```

Las familias declaran sus rutas en archivos propios:

- `modules/auth/auth.routes.ts`
- `modules/_administradores/administradores.routes.ts`
- `modules/_socios/socios.routes.ts`
- `modules/_profesores/profesores.routes.ts`
- `modules/_compartido-perfiles/compartido-perfiles.routes.ts`

### Criterios de ubicación

- Los servicios, endpoints y DTO HTTP pertenecen a `core/api`; no se duplican dentro de los módulos.
- Las pages coordinan casos de uso y navegación.
- Los componentes encapsulan presentación reutilizable dentro de su familia.
- Los formularios administran campos y validaciones, y emiten payloads tipados; el contenedor conserva HTTP, confirmaciones y feedback.
- `modules/ui` no contiene lógica de negocio ni consume contratos HTTP.
- `helpers` contiene funciones puras y sin estado.
- Las carpetas con prefijo `_` representan familias o perfiles privados, no rutas técnicas de Angular.

## Sistema visual

La aplicación mantiene separados:

- el esquema claro/oscuro, controlado por `dark-mode`;
- el branding de colores, controlado por `color-mod`;
- el modo performance, controlado por `alto-rendimiento`.

Antes de crear un componente visual nuevo, revisar el [índice UI](docs/ui/README.md). Allí están documentados, entre otros, `app-boton`, `app-select`, `app-calendario`, `app-carnet`, spinners, popups y feedback global.

## Configuración y ambientes

Archivo principal: [template-starter.config.ts](src/app/template-starter.config.ts)

| Campo | Descripción |
| ----- | ----------- |
| `appName` | Nombre mostrado por la aplicación |
| `backend.companyUuid` | UUID usado en endpoints públicos que requieren empresa |
| `authMock.enabled` | Habilita el mock de autenticación en memoria |

La URL base del backend se define mediante `apiBaseUrl`:

| Archivo | Uso |
| ------- | --- |
| `src/environments/environment.ts` | Configuración base |
| `src/environments/environment.develop.ts` | Desarrollo local |
| `src/environments/environment.st7.ts` | Build de producción/staging actual |

Los reemplazos de archivos se encuentran en `angular.json`. No se deben versionar credenciales, tokens ni secretos en estos archivos.

## Backend y contratos

La carpeta `postman/` es la fuente de referencia para endpoints, payloads, respuestas y ejemplos del backend. Antes de modificar un servicio de `core/api`, se debe contrastar su contrato con esa documentación.

## Documentación

- [Guía de arquitectura](src/app/TEMPLATE-GUIDE.md)
- [Organización de módulos](src/app/modules/README.md)
- [Rutas y roles](src/app/app-routes.docs.md)
- [Core](src/app/core/README.md)
- [Roles extensibles](docs/core/roles-extensibles.md)
- [Layouts](src/app/modules/layout/README.md)
- [Índice UI](docs/ui/README.md)
- [Guías para agentes](.agents/)

Los componentes UI incluyen documentación `*.docs.md` junto a su código. Los módulos de dominio siguen la misma convención para pages, componentes y formularios.

---

Desarrollado y documentado por **Brian Fabian Sabatini**.
