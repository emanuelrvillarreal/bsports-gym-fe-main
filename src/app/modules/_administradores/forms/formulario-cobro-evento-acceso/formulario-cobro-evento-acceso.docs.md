# FormularioCobroEventoAccesoComponent

Formulario presentacional standalone, OnPush y basado en signals para el cobro de entradas.

## Contrato

- Recibe `abierto`, `evento`, `modo` (`socio` o `invitado`), `userUuid`, `montoUnitario` y `estadoOperacion`.
- `estadoOperacion` contiene `guardando`, `error` y el `resultado` administrado por el contenedor.
- Emite `solicitudCobro` con `EventoAccesoCobroCommand` y `cerrar` sin payload.
- No inyecta servicios API ni interpreta errores HTTP.

## Comportamiento

- Construye de forma separada los commands discriminados `SOCIO` e `INVITADO`.
- El nombre del invitado es obligatorio, se normaliza y solo se incluye en el payload `INVITADO`.
- Para socios exige el `userUuid` recibido del scan.
- Usa `montoUnitario` para calcular el total: el contenedor entrega `montoAPagar` para socio o `montoInvitados` para invitado.
- La presentación distingue cobro manual y pago pendiente mediante `resultado`, no mediante `movimientoUuid`.
- Un resultado pendiente abre el checkout reutilizable si el QR es válido; si falta, muestra un error controlado.
- Mientras el checkout está abierto no permite cerrar el popup de cobro.
- Usa `app-popup`, `app-boton`, `app-select`, `app-checkout-mercado-pago` y `appValidacionFormulario` sin modificarlos.
