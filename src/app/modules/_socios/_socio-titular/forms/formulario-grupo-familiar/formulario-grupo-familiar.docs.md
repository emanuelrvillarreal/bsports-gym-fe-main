# FormularioGrupoFamiliarComponent

`app-formulario-grupo-familiar` valida y emite datos de alta o edición de un familiar desde el portal del socio titular.

## Uso básico

```typescript
import { Component } from '@angular/core';
import {
  EnvioFormularioGrupoFamiliar,
  FormularioGrupoFamiliarComponent,
} from './formulario-grupo-familiar.component';

@Component({
  imports: [FormularioGrupoFamiliarComponent],
  template: '<app-formulario-grupo-familiar modo="alta" (enviado)="solicitar($event)" />',
})
export class GrupoFamiliarEjemploComponent {
  solicitar(payload: EnvioFormularioGrupoFamiliar): void {
    console.log(payload);
  }
}
```

## Inputs

| Input             | Tipo      | Default | Descripción                                           |
| ----------------- | --------- | ------- | ----------------------------------------------------- |
| `enviando`        | `boolean` | `false` | Evita envíos duplicados durante la solicitud externa. |
| `duracionErrorMs` | `number`  | `5000`  | Tiempo visible de los errores de validación.          |
| `modo`            | `'alta' \| 'edicion'` | `'alta'` | Define el payload y si se solicitan credenciales. |
| `familiar`        | `FamiliarGrupoVista \| null` | `null` | Datos editables para precargar en modo edición. |

## Outputs

| Output    | Payload                     | Descripción                                                               |
| --------- | --------------------------- | ------------------------------------------------------------------------- |
| `enviado` | `EnvioFormularioGrupoFamiliar` | Emite `{ modo, datos }`; en alta incluye contraseña y en edición emite `ActualizarPerfilPortalPayload` sin credenciales. |

## Variantes / Casos de uso avanzados

En modo `alta`, ambos campos de contraseña son obligatorios y deben coincidir. En `edicion` se ocultan; email, DNI y parentesco son de solo lectura porque el contrato portal permite modificar únicamente nombre, apellido, teléfono y fecha de nacimiento. El parentesco usa `CONYUGE`, `HIJO`, `HIJA`, `PADRE`, `MADRE` u `OTRO`.

## Qué no hacer

- No solicitar ni emitir `titularMemberUuid`; el backend resuelve al titular desde la sesión.
- No montar este formulario en páginas del socio familiar ni llamar directamente a la API.

## Relación con el sistema de diseño

Reutiliza `app-select` y `appValidacionFormulario`. Consume `--app-text`, `--app-surface`, `--app-surface-border`, `--app-accent` y `--semantic-danger`; responde al tema activo.

## Notas técnicas

Normaliza el email a minúsculas, limita nombre y apellido a letras, formatea DNI y teléfono durante la edición y los emite sin formato. Omite opcionales vacíos y libera el temporizador en `ngOnDestroy`.
