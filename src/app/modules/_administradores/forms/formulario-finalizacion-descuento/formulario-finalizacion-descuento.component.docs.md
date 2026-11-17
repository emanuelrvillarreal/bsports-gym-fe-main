# Formulario de finalización de descuento

Cierra la vigencia de una asignación sin eliminar su historial. Recibe `fechaDesde` para impedir fechas anteriores al comienzo y emite `FinalizarDescuentoPayload`; sirve tanto para descuentos sociales como de actividad.

Usa `app-input-fecha` y no realiza HTTP. El botón del popup debe asociarse con `form="formulario-finalizacion-descuento"` y `tipo="submit"`.
