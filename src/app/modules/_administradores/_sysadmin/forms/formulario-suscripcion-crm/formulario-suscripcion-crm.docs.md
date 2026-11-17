# Formulario de suscripción CRM

Formulario de dominio exclusivo de SYSADMIN. Recibe el catálogo de planes ya cargado, ordena los
planes por precio y emite la selección elegida; no realiza HTTP.

- En modo `suscribir` y `cambiar-plan` exige un plan.
- Puede sumar opcionalmente un descuento temporal. Sin checkbox activo, el payload emitido se conserva
  como `{ codigoPlan }`.
- El descuento exige tipo, cantidad de meses entera desde `1` y un único valor: monto desde `$ 1` con
  hasta dos decimales, o porcentaje entero entre `1` y `100`.
- El payload de descuento envía en `null` el valor que no corresponde al tipo seleccionado.
- La card principal del carrusel queda seleccionada al abrir el formulario y cambia la selección al
  navegar entre planes.
- Reutiliza `app-carrusel-fade`, `app-cards`, `app-select`, `app-boton` y `appValidacionFormulario`.
- El primer precio mínimo se identifica con “Más económico”.
