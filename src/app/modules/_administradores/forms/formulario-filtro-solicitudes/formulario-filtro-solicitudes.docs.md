# FormularioFiltroSolicitudesComponent

`app-formulario-filtro-solicitudes` — captura el texto de búsqueda para el listado administrativo de solicitudes de socios.

## Uso básico

```typescript
import { Component } from '@angular/core';
import {
  FiltroSolicitudesPayload,
  FormularioFiltroSolicitudesComponent,
} from './formulario-filtro-solicitudes.component';

@Component({
  imports: [FormularioFiltroSolicitudesComponent],
  template: '<app-formulario-filtro-solicitudes (enviado)="buscar($event)" />',
})
export class FiltroSolicitudesEjemploComponent {
  buscar(filtro: FiltroSolicitudesPayload): void {
    console.log(filtro.busqueda);
  }
}
```

## Inputs

| Input             | Tipo      | Default | Descripción                                        |
| ----------------- | --------- | ------- | -------------------------------------------------- |
| `cargando`        | `boolean` | `false` | Bloquea el envío mientras el listado se actualiza. |

## Outputs

| Output    | Payload                    | Descripción                                                    |
| --------- | -------------------------- | -------------------------------------------------------------- |
| `enviado` | `FiltroSolicitudesPayload` | Emite `{ busqueda: string }` con espacios laterales removidos. |

## Variantes / Casos de uso avanzados

Una búsqueda vacía solicita el listado sin filtro textual.

## Qué no hacer

- No llamar a la API ni controlar el paginado desde este formulario.
- No emitir el evento nativo del input; el consumidor depende de `FiltroSolicitudesPayload`.

## Relación con el sistema de diseño

Reutiliza `app-boton` y `appValidacionFormulario`. Consume `--app-text`, `--app-bg` y `--app-surface-border`, compatibles con tema claro y oscuro.

## Notas técnicas

El componente usa signals para mantener el texto de búsqueda.
