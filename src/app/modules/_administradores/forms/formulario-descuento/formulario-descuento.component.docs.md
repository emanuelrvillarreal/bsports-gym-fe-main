# Formulario de descuento

Formulario compartido por ADMIN y ADM_RECEPCION para crear o editar un elemento del catálogo. Recibe opcionalmente `descuento` para precargar la edición y emite `GuardarDescuentoPayload`; no realiza HTTP.

Usa `app-select` para el tipo y muestra únicamente el importe correspondiente. Normaliza el título, valida porcentaje en `[0, 100]` o monto positivo y envía el campo no aplicable en `null`.

El botón del popup debe asociarse con `form="formulario-descuento"` y `tipo="submit"`.
