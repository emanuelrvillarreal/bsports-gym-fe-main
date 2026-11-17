# LayoutAdministradoresComponent

`app-layout-administradores` es el shell compartido por `ADMIN` y `ADM_RECEPCION`.

| Prefijo          | Rol             | Ruta principal              |
| ---------------- | --------------- | --------------------------- |
| `/admin`         | `ADMIN`         | `/admin/dashboard`          |
| `/adm-recepcion` | `ADM_RECEPCION` | `/adm-recepcion/accesos`  |

Todas las pages administrativas viven directamente en `modules/_administradores/pages/`. Dashboard, solicitudes, socios y actividades se comparten mediante un único loader; los datos de ruta expresan las diferencias de comportamiento y textos entre roles.

No expone inputs ni outputs. Compone `LayoutMainComponent`; los guards y `data.roles` de cada árbol mantienen separados los permisos.

No asumir que ambos roles pueden acceder a las mismas pantallas ni agregar lógica de negocio al layout.
