# Gestión de cuotas

Componente de dominio compartido por `ADMIN` y `ADM_RECEPCION`. Integra paginado y filtros OpenAPI, detalle, cobro
manual individual, Checkout Pro y anulación. Las cuotas anuladas muestran la auditoría de
anulación en el detalle y no permiten nuevas operaciones. Mercado Pago usa el mismo
`POST /treasury/cuota/cobro` del portal. La respuesta abre `app-checkout-mercado-pago` con
QR, copia de enlace y apertura manual de Checkout Pro. La preferencia activa bloquea un
segundo envío y la cuota se actualiza únicamente después del webhook; cerrar el panel
vuelve a consultar el backend.
