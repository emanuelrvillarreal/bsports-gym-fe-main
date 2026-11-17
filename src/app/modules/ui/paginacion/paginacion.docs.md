# Paginacion

`app-paginacion` resuelve navegacion entre paginas con resumen opcional y elipsis.

## Uso

```html
<app-paginacion
  [paginaActual]="paginaActual()"
  [totalPaginas]="totalPaginas()"
  (paginaCambiada)="irAPagina($event)"
/>
```

## Alcance

Pensado para:

- listados
- tablas
- grids
- CRUDs

## Inputs

| Input                     | Tipo      | Default | Descripcion                           |
| ------------------------- | --------- | ------- | ------------------------------------- |
| `paginaActual`            | `number`  | `1`     | Pagina activa.                        |
| `totalPaginas`            | `number`  | `1`     | Total de paginas disponibles.         |
| `cantidadBotonesVisibles` | `number`  | `5`     | Limite de botones numericos visibles. |
| `mostrarResumen`          | `boolean` | `true`  | Muestra texto de pagina actual.       |
| `deshabilitado`           | `boolean` | `false` | Bloquea navegacion.                   |

## Outputs

| Output           | Descripcion                             |
| ---------------- | --------------------------------------- |
| `paginaCambiada` | Emite el numero de pagina seleccionado. |

## Impacto En El Sistema

Consume acentos, bordes y texto desde el tema global del template.

## Relacion Con Performance

No tiene logica costosa ni animaciones complejas.
