# EventosAdministradoresPageComponent

`app-eventos-administradores-page` separa la gestión de eventos de la administración de actividades.

## Uso

La page reutiliza `app-titulo-hero` como encabezado y `app-gestion-eventos-actividad` para la tabla, filtros, paginación y formulario de eventos.

## Rutas

- `/admin/eventos`
- `/adm-recepcion/eventos`

## Qué no hacer

- No volver a montar la gestión de eventos dentro de la page de actividades.
- No duplicar la lógica de tabla o de integración con backend en esta page.
