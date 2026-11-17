# GestionDescuentosComponent

`app-gestion-descuentos` coordina el catálogo y el ciclo de vida de asignaciones recurrentes para ADMIN y ADM_RECEPCION.

## Uso básico

```html
<app-gestion-descuentos />
```

## Responsabilidades

- Pagina el catálogo, socios con asignaciones, actividades e inscripciones.
- El catálogo ofrece el botón nativo `+ Nuevo descuento`, que abre el mismo formulario usado para editar.
- En asignaciones por socio, `Desde` y `Hasta` se muestran como fechas `dd/mm/yyyy`; la tabla no muestra Estado.
- Compone formularios independientes para alta/edición, asignación y finalización.
- Confirma las bajas físicas y advierte la cascada al eliminar un descuento del catálogo.
- Conserva HTTP, popups y paginación fuera de los formularios.

## Inputs y outputs

No expone inputs ni outputs.

## Qué no hacer

- No reemplazar las tablas por cards duplicadas: `app-tabla-responsive` ya resuelve mobile.
- No usar `descuentoUuid` para finalizar o borrar una asignación; esas operaciones requieren `asignacionUuid`.

## Relación con el sistema de diseño

Reutiliza `app-card`, `app-tabla-responsive`, `app-paginacion`, `app-popup`, `app-boton`, `app-titulo-hero` y los formularios compartidos. Los estilos consumen únicamente tokens `--app-*` y `--semantic-*`.
