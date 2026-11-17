# FormularioRechazoSolicitudComponent

`app-formulario-rechazo-solicitud` — captura el motivo opcional antes de confirmar el rechazo de una solicitud de socio.

## Uso básico

```typescript
import { Component } from '@angular/core';
import {
  FormularioRechazoSolicitudComponent,
  RechazoSolicitudPayload,
} from './formulario-rechazo-solicitud.component';

@Component({
  imports: [FormularioRechazoSolicitudComponent],
  template: '<app-formulario-rechazo-solicitud (enviado)="confirmar($event)" />',
})
export class RechazoSolicitudEjemploComponent {
  confirmar(payload: RechazoSolicitudPayload): void {
    console.log(payload.motivo);
  }
}
```

## Inputs

| Input             | Tipo     | Default | Descripción                                 |
| ----------------- | -------- | ------- | ------------------------------------------- |
| `duracionErrorMs` | `number` | `5000`  | Duración reservada para errores temporales. |

## Outputs

| Output    | Payload                   | Descripción                                                      |
| --------- | ------------------------- | ---------------------------------------------------------------- |
| `enviado` | `RechazoSolicitudPayload` | Emite `{ motivo }`, recortado y con un máximo de 512 caracteres. |

## Variantes / Casos de uso avanzados

El motivo puede quedar vacío; la confirmación irreversible se realiza fuera del formulario.

## Qué no hacer

- No aprobar, rechazar ni cerrar el popup desde este componente.
- No ampliar el límite de 512 caracteres sin cambiar primero el contrato backend.

## Relación con el sistema de diseño

Reutiliza `appValidacionFormulario` y consume `--app-text`, `--app-bg`, `--app-surface-border` y `--semantic-danger`; responde al tema activo.

## Notas técnicas

El textarea se recorta durante la escritura y el temporizador se libera en `ngOnDestroy`.
