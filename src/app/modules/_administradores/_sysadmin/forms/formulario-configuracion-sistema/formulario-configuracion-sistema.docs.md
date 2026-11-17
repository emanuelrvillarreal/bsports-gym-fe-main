# FormularioConfiguracionSistemaComponent

`app-formulario-configuracion-sistema` — edita una clave, su valor y su alcance global para el editor interno de SYSADMIN.

## Uso básico

```typescript
import { Component } from '@angular/core';
import { ConfiguracionGuardarPayload } from '../../../../../core/api/interfaces/configuracion.interfaces';
import { FormularioConfiguracionSistemaComponent } from './formulario-configuracion-sistema.component';

@Component({
  imports: [FormularioConfiguracionSistemaComponent],
  template: '<app-formulario-configuracion-sistema (enviado)="guardar($event)" />',
})
export class ConfiguracionSistemaEjemploComponent {
  guardar(payload: ConfiguracionGuardarPayload): void {
    console.log(payload);
  }
}
```

## Inputs

| Input             | Tipo                                  | Default | Descripción                                  |
| ----------------- | ------------------------------------- | ------- | -------------------------------------------- |
| `duracionErrorMs` | `number`                              | `5000`  | Tiempo visible de los errores de validación. |
| `valorInicial`    | `ConfiguracionGuardarPayload \| null` | `null`  | Precarga una configuración para editarla.    |

## Outputs

| Output    | Payload                       | Descripción                                                   |
| --------- | ----------------------------- | ------------------------------------------------------------- |
| `enviado` | `ConfiguracionGuardarPayload` | Emite `{ name, value, global }` con clave y valor recortados. |

## Variantes / Casos de uso avanzados

`valorInicial` puede cambiar durante la vida del componente; un `effect` resincroniza los campos. La clave se limita a 160 caracteres.

## Qué no hacer

- No montar este formulario en la page compartida `/configuracion`; los permisos y la ubicación funcional todavía no están definidos.
- No llamar a `ConfiguracionApiService` ni mantener filas del editor dentro del formulario.

## Relación con el sistema de diseño

Reutiliza `appValidacionFormulario`. Consume `--app-text`, `--app-bg`, `--app-surface-border` y `--app-danger`; responde al tema activo.

## Notas técnicas

Pertenece al editor preservado de SYSADMIN, que actualmente no está conectado a una ruta. Libera el temporizador en `ngOnDestroy`.
