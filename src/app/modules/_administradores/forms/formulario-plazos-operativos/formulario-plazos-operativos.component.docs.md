# Formulario de periodicidad y plazos operativos

Formulario sin HTTP para editar la periodicidad de la cuota social y los plazos del club. El componente contenedor fusiona el output con el perfil completo y realiza `PUT /companies/profile`.

- La periodicidad usa el catálogo compartido y `MENSUAL` cuando el perfil no informa un valor reconocido.
- El vencimiento de cuota propone 10 días; mora e inhabilitación son opcionales.
- Los campos de días, cuando se completan, deben ser enteros mayores a cero.
- `diasVencimientoCuota` continúa siendo independiente de la periodicidad y determina el vencimiento de cada cuota.
