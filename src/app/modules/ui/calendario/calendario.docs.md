# Calendario

Grilla mensual/semanal de eventos con detalle en panel lateral o modal.

## Uso

```html
<app-calendario
  [mesActivo]="mesIso"
  [eventos]="eventos"
  [altoRendimiento]="modoPerformance()"
  (cambioMes)="actualizarMes($event)"
/>
```

## Contrato `CalendarioEvento`

| Campo           | Tipo                                           |
| --------------- | ---------------------------------------------- |
| `diaHoraInicio` | `string?` ISO o fecha-hora API                 |
| `diaHoraFin`    | `string?`                                      |
| `titulo`        | `string?`                                      |
| `eventoTitulo`  | `(evento) => string` override opcional         |
| `eventoClase`   | `(evento) => string \| null` override opcional |

## Inputs principales

| Input                  | Descripción                            |
| ---------------------- | -------------------------------------- |
| `mesActivo`            | Mes visible (`YYYY-MM`)                |
| `semanaActiva`         | Semana opcional para vista acotada     |
| `eventos`              | Lista de eventos del periodo           |
| `cargando`             | Reemplaza la grilla por `app-load-spinner-blue` mientras se cargan los eventos. |
| `altoRendimiento`      | Reduce transiciones                    |
| `leyendaVacia`         | Mensaje sin eventos (default genérico) |
| `resolverEventoTitulo` | Hook global para título del evento     |
| `resolverEventoClase`  | Hook global para clase CSS del evento  |

## Outputs

- `mesCambiado`
- `semanaCambiada`

## Helpers

- `calendario-fecha.helpers.ts` — grilla, ISO, formato
- `calendario-evento.helpers.ts` — agrupación, duración, rango horario

## Notas

Componente genérico de calendario. No incluye lógica de reservas de negocio (eso vivía en `calendario-reservas`, fuera del núcleo template).
