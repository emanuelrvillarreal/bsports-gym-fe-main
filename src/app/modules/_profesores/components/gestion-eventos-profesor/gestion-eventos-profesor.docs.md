# GestionEventosProfesorComponent

Gestiona eventos y actividades asignadas al profesor. Los listados reutilizan las lecturas de actividades y eventos, mientras que las mutaciones usan `PortalProfesorApiService`.

La página presenta dos tablas independientes: eventos asignados y actividades asignadas. La tabla de eventos permite ver, editar y dar de baja; la tabla de actividades permite ver el detalle de la actividad asignada.

La acción principal muestra el texto “Nuevo evento” junto a un botón circular `+`. Abre el formulario dentro de `app-popup`; en alta permite seleccionar cualquiera de las actividades asignadas y conserva como valor inicial el filtro activo cuando existe. En edición mantiene bloqueada la actividad original.

Los selects de actividad del filtro y del alta muestran como máximo cinco opciones; el resto permanece accesible mediante scroll. Las acciones de detalle muestran `app-load-spinner-blue` dentro del botón de la tabla mientras consultan los datos.

Cuando no existen eventos o actividades, cada tabla muestra un estado vacío compacto para evitar altura innecesaria en smartphones.

“Ver evento” abre un popup extra grande con los datos puntuales del evento y los inscriptos de su actividad asociada. La nómina se obtiene mediante el contrato documentado `GET /actividad/{actividadUuid}`; no se consume un endpoint de participantes por evento porque no existe en Postman. “Ver actividad” muestra los datos habituales, cupo e inscriptos de la actividad. Ambas tablas muestran cinco filas en escritorio, habilitan scroll para el resto y ocultan la acción automática “Ver”.

El popup de detalle no fuerza altura completa y compacta localmente su pie de acciones, sin modificar `app-popup`.


Si falla la consulta de los inscriptos de la actividad asociada, el popup conserva los datos del evento y limita el mensaje de error a la tabla de alumnos correspondiente.

Las cargas consecutivas del detalle se cancelan para impedir que una respuesta anterior reemplace el recurso visible.
