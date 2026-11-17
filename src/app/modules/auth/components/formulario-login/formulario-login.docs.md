# FormularioLoginComponent

`app-formulario-login` comparte el acceso entre `/login` y `/:companyName/login`. Abre con el inicio sin contraseña por enlace de correo y permite alternar al login actual con contraseña.

## Inputs

| Input             | Tipo      | Uso                                                                           |
| ----------------- | --------- | ----------------------------------------------------------------------------- |
| `companyName`     | `string`  | Nombre de la empresa para el contexto del login público.                      |
| `companyUuid`     | `string`  | UUID enviado únicamente al login con contraseña.                              |
| `companyPath`     | `string`  | Path usado para branding en el enlace de acceso y para registro/recuperación. |
| `altoRendimiento` | `boolean` | Desactiva la animación del cambio de método.                                  |

## Flujos

- El enlace de acceso envía `email` y, cuando existe, `path` a `POST /user/public/start-login`. Un 200 siempre muestra un mensaje neutro; el cooldown de 5 minutos se guarda por email.
- El switch usa `app-boton` con `role="switch"` y `aria-checked`. La transición respeta `prefers-reduced-motion` y el modo de alto rendimiento.
- El modo con contraseña conserva el payload `{ username, password }`; el campo `username` se etiqueta y valida como email en el flujo actual del producto. La recuperación sigue disponible en este modo.
- El error que indica que el método de enlace no está disponible abre el login con contraseña y oculta el switch durante la visita.

## Reutilización

Usa `app-boton`, `app-input-password`, `appValidacionFormulario` y `app-toast-alert`. No duplica spinner, controles de contraseña ni lógica de sesión.

## Notas técnicas

`LoginService` delega las llamadas públicas y el canje del código a `AuthService`. La ruta `/auth/finish-login` usa el mismo guardado de tokens y carga de usuario del login existente. Los temporizadores de cooldown y mensajes se limpian al destruir el componente.

El login por enlace usa `POST /user/public/start-login` y `POST /user/public/finish-login`, cuyos payloads están reflejados en `core/api/api-routes.docs.md`.
