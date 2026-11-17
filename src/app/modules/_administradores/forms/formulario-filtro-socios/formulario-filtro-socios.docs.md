# FormularioFiltroSociosComponent

`app-formulario-filtro-socios` — captura la búsqueda y los estados usados para filtrar el padrón administrativo de socios.

## Uso básico

```typescript
import { Component } from '@angular/core';
import {
  FiltroSociosPayload,
  FormularioFiltroSociosComponent,
} from './formulario-filtro-socios.component';

@Component({
  imports: [FormularioFiltroSociosComponent],
  template: '<app-formulario-filtro-socios (enviado)="aplicar($event)" />',
})
export class FiltrosSociosEjemploComponent {
  aplicar(filtro: FiltroSociosPayload): void {
    console.log(filtro);
  }
}
```

## Inputs

| Input             | Tipo      | Default | Descripción                                                 |
| ----------------- | --------- | ------- | ----------------------------------------------------------- |
| `duracionErrorMs` | `number`  | `5000`  | Duración reservada para mensajes temporales del formulario. |
| `cargando`        | `boolean` | `false` | Bloquea la acción de búsqueda durante una carga externa.    |

## Outputs

| Output    | Payload               | Descripción                                                                                      |
| --------- | --------------------- | ------------------------------------------------------------------------------------------------ |
| `enviado` | `FiltroSociosPayload` | Emite `{ busqueda, estados }` con la búsqueda recortada; también se emite al alternar un estado. |

## Variantes / Casos de uso avanzados

`estados` admite `ACTIVO`, `MOROSO`, `INHABILITADO`, `SUSPENDIDO` e `INACTIVO`. Una lista vacía significa “todos”.

## Qué no hacer

- No paginar ni llamar a `SociosApiService` desde este formulario; el consumidor administra la consulta remota.
- No reemplazar `enviado` por eventos separados para búsqueda y estados; el payload debe representar el filtro completo.

## Relación con el sistema de diseño

Reutiliza `app-boton` y `appValidacionFormulario`. Consume `--app-text`, `--app-text-soft`, `--app-bg`, `--app-surface`, `--app-surface-border` y `--app-accent`, por lo que responde al tema activo.

## Notas técnicas

El componente usa signals y libera su temporizador en `ngOnDestroy`.
