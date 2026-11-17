# Asistencias del profesor

La ruta `/profesor/asistencias` permite consultar los slots de actividades asignadas en
tres rangos temporales y registrar asistencia por `slotUuid`.

El historial se consulta para la actividad de la card seleccionada porque el endpoint del
portal exige `actividadUuid`. La planilla usa el endpoint de slot y guarda únicamente los
estados declarados mediante el PUT en lote.
