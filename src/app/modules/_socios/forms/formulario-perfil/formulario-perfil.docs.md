# FormularioPerfilComponent

`app-formulario-perfil` — edita los campos modificables del perfil compartido por socio titular y socio familiar.

## Uso básico

```typescript
import { Component } from '@angular/core';
import {
  ActualizarPerfilPortalPayload,
  PerfilPortalDto,
} from '../../../../core/api/interfaces/portal.interfaces';
import { FormularioPerfilComponent } from './formulario-perfil.component';

@Component({
  imports: [FormularioPerfilComponent],
  template: '<app-formulario-perfil [perfil]="perfil" (enviado)="guardar($event)" />',
})
export class PerfilEjemploComponent {
  readonly perfil: PerfilPortalDto = {
    nombre: 'Ana',
    apellido: 'Pérez',
  };

  guardar(payload: ActualizarPerfilPortalPayload): void {
    console.log(payload);
  }
}
```

## Inputs

| Input                 | Tipo              | Default   | Descripción                                                   |
| --------------------- | ----------------- | --------- | ------------------------------------------------------------- |
| `perfil`              | `PerfilPortalDto` | requerido | Perfil que precarga campos editables y datos de sólo lectura. |
| `enviando`            | `boolean`         | `false`   | Bloquea el envío durante la actualización.                    |
| `mensajeErrorExterno` | `string`          | `''`      | Muestra un error devuelto por el componente coordinador.      |
| `duracionErrorMs`     | `number`          | `5000`    | Tiempo visible de los errores internos o externos.            |

## Outputs

| Output    | Payload                         | Descripción                                                                         |
| --------- | ------------------------------- | ----------------------------------------------------------------------------------- |
| `enviado` | `ActualizarPerfilPortalPayload` | Emite nombre, apellido y sólo teléfono/fecha de nacimiento cuando están informados. |

## Variantes / Casos de uso avanzados

Email, DNI y número de socio se muestran como datos de lectura. El mismo componente funciona para titular y familiar porque comparten `PerfilPortalDto`.

## Qué no hacer

- No agregar email, DNI, número de socio o foto al payload de actualización.
- No realizar HTTP ni crear una variante separada para el rol `FAMILIAR`.

## Relación con el sistema de diseño

Reutiliza `app-boton` y `appValidacionFormulario`. Consume `--app-text`, `--app-surface`, `--app-surface-border`, `--app-accent` y `--semantic-danger`; responde al tema activo.

## Notas técnicas

Dos `effect` sincronizan el perfil y el error externo sin crear dependencias reactivas accidentales. El temporizador se libera en `ngOnDestroy`.
