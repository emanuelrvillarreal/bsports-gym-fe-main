# Cuotas del portal

`app-cuotas-portal` carga el desglose de cuotas del titular autenticado y de su grupo familiar.

Usa `PortalSocioApiService.listarCuotasGrupoFamiliar()` para la consulta y `TesoreriaApiService.iniciarCobroMercadoPago()` para iniciar el checkout de una cuota pendiente o vencida. El filtro de familiares se resuelve en memoria. El rango temporal permite elegir entre 1 y 12 meses, siempre hasta el mes actual y sin posibilidad de seleccionar meses futuros; cada cambio actualiza la consulta al backend.

La ventana temporal de las cuotas se evalúa sobre `fechaGeneracion`, no sobre `vencimiento`.

La respuesta de Mercado Pago contiene una URL de Checkout Pro. El componente muestra
`app-checkout-mercado-pago` para escanear un QR, copiar el enlace o abrirlo manualmente
en otra pestaña. Mientras la preferencia está activa no permite crear otra. No cambia el
estado de la cuota localmente: al cerrar el panel vuelve a consultar y el backend solo
la actualiza después del webhook de pago.
