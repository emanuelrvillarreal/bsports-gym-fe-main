# FinishLoginPageComponent

Ruta pública `/auth/finish-login` que canjea el código de acceso recibido por email.

## Comportamiento

- Lee `code` del query string y elimina el query de la URL antes de iniciar el canje.
- Si el código no existe, muestra que el enlace no es válido o expiró y ofrece volver a `/login`.
- Realiza un único canje con `LoginService`; al completar, navega al destino resuelto por los roles de la sesión.
- Ejecuta el canje solo en el navegador para evitar consumir el código de un solo uso durante SSR.
- Reutiliza `AuthService` para guardar tokens y cargar el usuario. El código no se conserva en historial ni se reintenta automáticamente.

## Contrato

`POST /user/public/finish-login` recibe `{ code }` sin JWT ni `X-Company-Uuid` y responde con el DTO de tokens JWT. Los códigos son de un solo uso y vencen a los 15 minutos.
