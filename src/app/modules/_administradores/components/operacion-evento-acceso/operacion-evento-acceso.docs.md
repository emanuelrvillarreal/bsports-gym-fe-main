# OperacionEventoAccesoComponent

Popup grande para operar entradas de un evento.

- Inputs: `abierto` y `evento`.
- Outputs: `cerrar` y `operacionCompletada`.
- Activa `app-lector-qr` solo con el popup visible, sin request ni popup de cobro.
- Acepta cámara, UUID plano, JSON, URL e ingreso manual/lector USB.
- Evita requests concurrentes y códigos repetidos durante la sesión abierta.
- Resuelve `ACCESO_PERMITIDO`, `DEBE_PAGAR` y `BLOQUEADO` desde la respuesta 200 del scan; no interpreta errores 402.
- `DEBE_PAGAR` conserva `userUuid` y `montoAPagar`, y ofrece cobrar o cancelar para volver a escanear. Un importe nulo o inválido no bloquea la operación.
- El botón Invitado abre el cobro unificado y queda deshabilitado cuando el evento no admite invitados.
- Coordina `POST /cobro`; el formulario hijo solo valida y emite el command.
- Todos los estados son inline y el scan desactiva los toasts HTTP.
