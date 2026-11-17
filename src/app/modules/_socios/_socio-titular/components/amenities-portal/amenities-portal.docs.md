# AmenitiesPortalComponent

`app-amenities-portal` permite al socio titular reservar amenities, iniciar o reintentar pagos por Mercado Pago y consultar sus reservas.

## Uso básico

```html
<app-amenities-portal />
```

## Inputs

No recibe inputs.

## Outputs

No emite outputs.

## Qué no hacer

- No usarlo para administración: esa pantalla consume `AmenitiesApiService` y el endpoint `/amenities`.
- No crear una reserva nueva para reintentar un pago: se usa `POST /portal/amenities/reservas/{reservaUuid}/pago` para conservar el turno.
- No interpretar la generación del QR como pago acreditado: el estado se refresca hasta que el webhook confirme la reserva.

## Relación con el sistema de diseño

Reutiliza `app-card`, `app-boton` y `app-tabla-responsive`, junto con el token `--semantic-danger`.

## Notas técnicas

Consume `PortalSocioApiService.listarAmenities()`, `reservarAmenity()` y `reintentarPagoReservaAmenity()`. La tabla muestra monto total, seña y saldo pendiente; este último se presenta en negativo y rojo mientras exista una deuda. La acción Pagar seña sólo se ofrece si el importe de seña es mayor a cero. El popup de QR solicita únicamente el pago total de una reserva pendiente; tras acreditar la seña, oculta el select y prepara directamente el QR del saldo.

Para `SOCIO_TITULAR` también consume `POST /portal/amenities/reservas/paginate` con páginas de 50
registros. La paginación se muestra sólo cuando hay más de una página y limita a tres botones numéricos visibles. Las reservas pendientes permiten elegir entre seña o total al regenerar el checkout; las confirmadas con saldo pendiente ofrecen cobrar únicamente dicho saldo.
