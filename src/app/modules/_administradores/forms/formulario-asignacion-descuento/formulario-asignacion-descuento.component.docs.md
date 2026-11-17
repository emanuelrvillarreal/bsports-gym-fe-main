# Formulario de asignación de descuento

Formulario común para asignar un descuento del catálogo a una cuota social o a una inscripción de actividad. La identidad del socio o inscripción pertenece al contenedor; este formulario sólo emite `AsignarDescuentoPayload`.

Compone `app-select` y dos `app-input-fecha`. La fecha final es opcional (`null` significa sin límite) y, si se informa, no puede ser anterior al inicio. `fechaMinima` permite al flujo restringir el inicio cuando corresponda.

El botón del popup debe asociarse con `form="formulario-asignacion-descuento"` y `tipo="submit"`.
