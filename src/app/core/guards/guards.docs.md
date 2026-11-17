# Guards

Los guards de `core` controlan sesión, selección de contexto, rol activo y redirecciones.

| Guard                          | Responsabilidad                                                           |
| ------------------------------ | ------------------------------------------------------------------------- |
| `authGuestGuard`               | Permite páginas públicas sin sesión y rehidrata cuando hay refresh token. |
| `authSessionGuard`             | Exige una sesión autenticada para seleccionar contexto.                   |
| `seleccionEmpresaGuard`        | Resuelve o exige `/seleccionar-empresa` para elegir empresa o rol.        |
| `authRoleGuard`                | Exige sesión, empresa y rol activo compatible con `data.roles`.           |
| `authRoleChildGuard`           | Aplica la misma validación a rutas hijas.                                 |
| `perfilEmpresaAdminGuard`      | Consulta el perfil del club antes de cada ruta hija de ADMIN y dirige al wizard si faltan datos o falla la consulta. |

## Flujo autenticado

1. Después del login se determina la empresa activa.
2. Si debe elegirse, se navega a `/seleccionar-empresa`.
3. Si la empresa ofrece más de un rol, la misma page muestra las opciones de rol sin cambiar de ruta.
4. Con empresa y rol activos, se continúa a la ruta principal definida para ese rol.
5. En ADMIN, el perfil del club debe tener domicilios, contacto, cuatro plazos y el estado de cuota social. La ruta `/admin/completar-perfil` queda accesible para completar o reintentar la carga; la acción de cerrar sesión sigue disponible desde el layout.

`/inicio` permanece como dispatcher global mediante un redirect dinámico que consulta `AuthService`; no requiere un guard específico ni carga una page administrativa ficticia.

Los roles válidos están en [auth-role.ts](../auth/auth-role.ts) y [roles-extensibles.md](../../../../docs/core/roles-extensibles.md). Las rutas privadas deben usar únicamente `SYSADMIN`, `ADMIN`, `ADM_RECEPCION`, `PROFESOR`, `SOCIO_TITULAR` y `FAMILIAR`.

Los guards sólo resuelven acceso y redirección: no deben contener UI, toasts, consumo de dominio ni reglas de negocio.
