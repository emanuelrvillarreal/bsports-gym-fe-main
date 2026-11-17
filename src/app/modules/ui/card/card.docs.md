# Card

`app-card` es un contenedor visual base para agrupar contenido con encabezado opcional.

## Uso

```html
<app-card titulo="Socios" descripcion="Resumen general" icono="heroUsers">
  <p>Contenido interno</p>
</app-card>
```

## Alcance

Sirve como wrapper visual reusable dentro del template:

- paneles
- bloques de dashboard
- tarjetas de configuracion
- contenedores de formularios o resumenes

## Inputs

| Input               | Tipo      | Default | Descripcion                             |
| ------------------- | --------- | ------- | --------------------------------------- |
| `titulo`            | `string`  | `''`    | Titulo del header.                      |
| `descripcion`       | `string`  | `''`    | Subtitulo superior opcional.            |
| `icono`             | `string`  | `''`    | Icono de `ng-icons` opcional.           |
| `compacto`          | `boolean` | `false` | Reduce padding general.                 |
| `altoRendimiento`   | `boolean` | `false` | Baja el costo visual del contenedor.    |
| `altoImpactoVisual` | `boolean` | `false` | Agrega mas presencia visual via sombra. |

## Outputs

No emite eventos.

## Contenido

Recibe contenido por `ng-content`.

## Impacto En El Sistema

Consume tokens globales:

- `--app-surface`
- `--app-surface-border`
- `--app-text`
- `--app-text-soft`

## Relacion Con Performance

`altoRendimiento` hoy reduce carga visual del contenedor, principalmente quitando sombra extra.
