# Dashboard financiero hero

`app-dashboard-financiero-hero` presenta la identidad de cobranza y permite seleccionar el período visible del dashboard.

## Uso básico

```html
<app-dashboard-financiero-hero
  empresa="Club ejemplo"
  [periodo]="{ anio: '2026', mes: '07' }"
  [anios]="anios"
  [meses]="meses"
  (periodoCambiado)="cambiarPeriodo($event)"
  (restablecer)="restablecerPeriodo()"
/>
```

## Inputs

| Input      | Tipo                         | Default   | Descripción                                             |
| ---------- | ---------------------------- | --------- | ------------------------------------------------------- |
| `empresa`  | `string`                     | `''`      | Nombre mostrado en el encabezado.                       |
| `periodo`  | `PeriodoDashboardFinanciero` | requerido | Año y mes seleccionados.                                |
| `anios`    | `readonly SelectOption[]`    | `[]`      | Años disponibles.                                       |
| `meses`    | `readonly SelectOption[]`    | `[]`      | Meses disponibles para el año activo.                   |
| `cargando` | `boolean`                    | `false`   | Deshabilita los controles mientras se actualizan datos. |

## Outputs

| Output            | Payload                      | Descripción                        |
| ----------------- | ---------------------------- | ---------------------------------- |
| `periodoCambiado` | `PeriodoDashboardFinanciero` | Emite el período elegido.          |
| `restablecer`     | `void`                       | Solicita volver al período actual. |

## Qué no hacer

- No consumir servicios HTTP ni calcular balances dentro del hero; esa responsabilidad pertenece al contenedor financiero.
- No reemplazar `app-select` o `app-boton` por controles locales.

## Relación con el sistema de diseño

Usa `--app-accent`, `--app-surface`, `--app-bg`, `--app-text` y `--app-surface-border`, por lo que responde al tema y branding activos.
