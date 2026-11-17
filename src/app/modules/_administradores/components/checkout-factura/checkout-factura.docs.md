# CheckoutFacturaComponent

`app-checkout-factura` genera y presenta el checkout de Mercado Pago para una factura local.

## Uso básico

```html
<app-checkout-factura [factura]="facturaSeleccionada" (cerrar)="facturaSeleccionada = null" />
```

## Inputs

| Input | Tipo | Default | Descripción |
| --- | --- | --- | --- |
| `factura` | `FacturaDto \| null` | `null` | Factura a pagar; al recibirla inicia la generación del enlace. |

## Outputs

| Output | Payload | Descripción |
| --- | --- | --- |
| `cerrar` | `void` | Solicita cerrar la preparación o el checkout. |
| `pagoGenerado` | `void` | Informa que el backend devolvió un enlace de pago válido. |

## Variantes / Casos de uso avanzados

Ante un enlace inválido o error HTTP conserva la factura y ofrece reintentar.

## Qué no hacer

- No marcar la factura como pagada al crear el enlace; la confirmación llega por webhook.
- No pasar `uuidFacturaCrm`: el componente usa el `facturaUuid` local.

## Relación con el sistema de diseño

Compone `app-popup`, `app-boton`, el spinner y `app-checkout-mercado-pago` sin modificarlos.
