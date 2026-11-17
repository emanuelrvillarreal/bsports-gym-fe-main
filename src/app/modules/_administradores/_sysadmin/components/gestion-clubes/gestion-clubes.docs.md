# GestionClubesComponent

`app-gestion-clubes` lista clubes globales y coordina la edicion completa del perfil y la gestion de
administradores de cada club.

## Uso

```html
<app-gestion-clubes />
```

## Comportamiento

- Consulta `POST /companies/paginate-club` con `page`, `size: 15` y `search`.
- Expone las acciones `Editar empresa`, `Administradores` y `Entrar al club`.
- `Entrar al club` se presenta como un icono con tooltip y solicita una confirmación de peligro
  antes de activar el contexto `ADMIN`; el título de la alerta es `Atención`.
- `Entrar al club` solo se muestra y ejecuta para una sesión con rol global `SYSADMIN`; usa el
  `uuid` del club para establecer `X-Company-Uuid`, activa el contexto `ADMIN` y navega al dashboard.
- Desde el contexto delegado se ofrece volver a SYSADMIN sin cerrar sesión.
- Consulta el perfil completo con `GET /companies/current` y lo envia completo a `PUT /companies/profile`.
- Administra altas y ediciones completas de administradores, sin exponer ni modificar contrasenas.
- Las tablas reservan siete filas visibles y habilitan scroll para el resto.

## Que no hace

- No da de baja administradores.
- No sube logos ni administra suscripciones CRM.
- No autentica nuevamente al usuario ni inventa credenciales de ADMIN: reutiliza la sesión SYSADMIN
  y deja que el backend autorice la operación.

## Notas tecnicas

El UUID del club seleccionado se pasa explicitamente a los servicios. No depende de cambiar la
empresa activa de la sesion del usuario.
