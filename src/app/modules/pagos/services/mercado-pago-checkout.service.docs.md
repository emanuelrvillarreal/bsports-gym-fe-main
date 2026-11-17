# MercadoPagoCheckoutService

Centraliza las acciones del checkout a partir de `mercadoPagoInitPoint`.

- `normalizarEnlace()` solo acepta URLs HTTPS válidas.
- `generarQr()` crea localmente una imagen PNG data URL con `qrcode`; el enlace no se envía a terceros.
- `copiarEnlace()` usa el portapapeles del navegador.
- `abrirCheckout()` abre una pestaña únicamente después de una acción explícita.
- Las operaciones devuelven `false` o `null` cuando el navegador o el destino no permiten completarlas.
- No confirma pagos ni modifica datos locales: la liquidación pertenece al webhook.
