# CheckoutMercadoPagoComponent

`app-checkout-mercado-pago` — diálogo presentacional para compartir un checkout mediante QR y, cuando existe, un enlace copiable o apertura manual.

## Uso básico

```typescript
import { CheckoutMercadoPagoComponent } from './modules/ui/checkout-mercado-pago/checkout-mercado-pago.component';
```

```html
<app-checkout-mercado-pago
  [abierto]="true"
  enlace="https://www.mercadopago.com.ar/checkout"
  qr="data:image/png;base64,..."
  resumen="Pago de 2 cuotas"
  monto="$ 25.000"
  subtitulo="El pago se confirmará mediante webhook."
  (abrirCheckout)="abrir()"
  (copiarEnlace)="copiar()"
  (cerrar)="cerrar()"
/>
```

## Contrato

- `abierto`, `enlace`, `qr`, `resumen`, `monto`, `subtitulo`, `mensaje`, `mensajeError` y `copiando` son inputs.
- `mostrarEnlace=false` oculta el input y la copia; `abrirDebajoQr=true` mueve la apertura directa debajo del QR.
- `abrirCheckout`, `copiarEnlace` y `cerrar` son outputs sin payload.
- `subtitulo` conserva por defecto el texto histórico de cuotas.

## Variantes / Casos de uso avanzados

El componente no genera el QR ni accede al portapapeles. El contenedor debe resolver esas operaciones y entregar sus resultados mediante `qr`, `mensaje` y `mensajeError`.
Si `enlace` está vacío funciona en modo QR-only: oculta el campo, copiar y abrir Mercado Pago. Esta variante permite backends que solo devuelven la imagen QR.
El encabezado reutiliza `app-titulo-hero`. El logo horizontal se muestra blanco en modo oscuro y negro en modo claro; el botón de copia permanece junto al campo del enlace.

## Qué no hacer

- No pasar enlaces sin validar; el contenedor debe aceptar únicamente destinos HTTPS.
- No interpretar la creación del QR como confirmación del pago; la confirmación pertenece al webhook.
- No inyectar servicios de pagos o navegación en este componente UI.

## Relación con el sistema de diseño

Consume `--app-surface`, `--app-surface-border`, `--app-surface-strong`, `--app-text`, `--app-text-soft`, `--app-accent`, `--semantic-success` y `--semantic-danger`. Define tokens locales `--checkout-mp-*` y responde a tema claro u oscuro.

## Notas técnicas

Reutiliza `app-popup`, `app-titulo-hero`, `app-boton` y `app-load-spinner-blue`. Funciona desde 320 px y cambia a dos columnas desde 48 rem.
