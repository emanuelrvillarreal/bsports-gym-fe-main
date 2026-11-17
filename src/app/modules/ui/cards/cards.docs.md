# Cards (catálogo)

`app-cards` renderiza una tarjeta interactiva genérica para listados o catálogos.

## Uso

```html
<app-cards
  [item]="{
    titulo: 'Plan premium',
    eyebrow: 'Producto',
    metadatos: [{ label: 'Modalidad', value: 'Mensual', icon: 'heroClock' }],
    etiquetas: ['Lun', 'Mié'],
    progreso: { actual: 8, maximo: 10 },
    badge: { text: 'Popular', icon: 'heroBolt' }
  }"
  [altoRendimiento]="modoPerformance()"
  (itemSeleccionado)="abrirDetalle($event)"
/>
```

## Contrato `CatalogCardItem`

| Campo       | Tipo                  | Descripción                            |
| ----------- | --------------------- | -------------------------------------- |
| `titulo`    | `string`              | Título principal (requerido)           |
| `eyebrow`   | `string?`             | Etiqueta superior opcional             |
| `metadatos` | `CatalogCardMeta[]?`  | Filas label/valor con icono opcional   |
| `monto`     | `number?`             | Monto formateado con `formatearMoneda` |
| `etiquetas` | `string[]?`           | Chips inferiores                       |
| `badge`     | `CatalogCardBadge?`   | Badge en el header                     |
| `progreso`  | `{ actual, maximo }?` | Barra de progreso                      |
| `notaPie`   | `string?`             | Texto al pie                           |

## Inputs / outputs

| API                | Tipo                                      |
| ------------------ | ----------------------------------------- |
| `item`             | `CatalogCardItem` (requerido)             |
| `altoRendimiento`  | `boolean` — desactiva animaciones pesadas |
| `itemSeleccionado` | `output<CatalogCardItem>`                 |

## Notas

- Reemplaza el contrato acoplado `ActividadCard` del producto Estudiantes.
- Para contenedores sin lógica de catálogo, preferí `app-card`.
