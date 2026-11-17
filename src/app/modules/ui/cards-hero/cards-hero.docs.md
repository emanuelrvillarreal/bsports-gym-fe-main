# Cards Hero

`app-cards-hero` renderiza metricas destacadas en formato dashboard.

## Uso

```ts
import { CardHeroItem } from '../../ui/cards-hero/cards-hero.component';

protected readonly items: readonly CardHeroItem[] = [
  {
    id: 'socios',
    titulo: 'Socios',
    valor: '1240',
    subtitulo: 'Activos este mes',
    icono: 'heroUsers',
    estado: 'ok',
  },
];
```

```html
<app-cards-hero [items]="items" [columnas]="4" />
```

## Alcance

Pensado para:

- dashboards
- resumenes superiores
- KPI cards

## Inputs

| Input             | Tipo                      | Default | Descripcion                                                   |
| ----------------- | ------------------------- | ------- | ------------------------------------------------------------- |
| `items`           | `readonly CardHeroItem[]` | `[]`    | Tarjetas a renderizar.                                        |
| `columnas`        | `number`                  | `4`     | Cantidad maxima de columnas visibles.                         |
| `altoRendimiento` | `boolean`                 | `false` | Omite animación de contadores y efectos del carrusel interno. |

## Modelo

```ts
export interface CardHeroItem {
  readonly id?: string;
  readonly titulo: string;
  readonly valor: string;
  readonly subtitulo: string;
  readonly icono: 'heroUsers' | 'heroExclamationCircle' | 'heroCalendarDays' | 'heroBanknotes';
  readonly estado?: 'ok' | 'warn' | 'info' | 'danger';
}
```

## Outputs

No emite eventos.

## Impacto En El Sistema

Consume tokens del tema:

- `--app-surface`
- `--app-surface-border`
- `--app-text`
- `--app-text-soft`
- `--app-accent`
- `--app-success`
- `--app-warning`

## Relacion Con Performance

Anima valores numericos con `requestAnimationFrame` cuando detecta un valor numerico.

Expone `[altoRendimiento]="true"`: muestra valores finales sin animación y aplica `cards-hero--alto-rendimiento` (también se propaga al carrusel interno si aplica).
