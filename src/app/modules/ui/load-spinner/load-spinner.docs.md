# Load Spinner

Indicador de carga reusable con variantes visual y de imagen.

## Uso

```html
<app-load-spinner /> <app-load-spinner tipo="imagen" [altoRendimiento]="true" />
```

## Inputs

| Input             | Tipo                    | Default     | Descripción                                |
| ----------------- | ----------------------- | ----------- | ------------------------------------------ |
| `tipo`            | `'default' \| 'imagen'` | `'default'` | Estilo del spinner                         |
| `altoRendimiento` | `boolean`               | `false`     | Versión simplificada sin animación costosa |
| `colorPrimario`   | `string`                | `''`        | Override opcional del color principal      |
| `colorSecundario` | `string`                | `''`        | Override opcional del color secundario     |

## Cuándo usarlo

- Placeholders mientras cargan imágenes en tablas o avatares
- Estados de carga dentro de `app-page-loading-shell`

## Performance

Pasá `[altoRendimiento]="true"` cuando `PerformanceModeService` esté activo o en vistas mobile críticas.
