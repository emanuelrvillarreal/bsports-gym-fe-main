# FormularioInscripcionActividadComponent

`app-formulario-inscripcion-actividad` — selecciona un socio y emite el payload usado para inscribirlo o dar de baja su inscripción.

## Uso básico

```typescript
import { Component } from '@angular/core';
import { InscripcionActividadPayload } from '../../../../core/api/interfaces/actividades.interfaces';
import { SelectOption } from '../../../ui/select/select.component';
import { FormularioInscripcionActividadComponent } from './formulario-inscripcion-actividad.component';

@Component({
  imports: [FormularioInscripcionActividadComponent],
  template: `
    <app-formulario-inscripcion-actividad [opcionesSocios]="socios" (enviado)="confirmar($event)" />
  `,
})
export class InscripcionEjemploComponent {
  readonly socios: readonly SelectOption[] = [{ value: 'member-uuid', label: 'Ana Pérez' }];

  confirmar(payload: InscripcionActividadPayload): void {
    console.log(payload.memberUuid);
  }
}
```

## Inputs

| Input             | Tipo                      | Default | Descripción                            |
| ----------------- | ------------------------- | ------- | -------------------------------------- |
| `duracionErrorMs` | `number`                  | `5000`  | Tiempo visible del error de selección. |
| `opcionesSocios`  | `readonly SelectOption[]` | `[]`    | Opciones mostradas por `app-select`.   |

## Outputs

| Output    | Payload                       | Descripción                                                |
| --------- | ----------------------------- | ---------------------------------------------------------- |
| `enviado` | `InscripcionActividadPayload` | Emite `{ memberUuid }` cuando existe una selección válida. |

## Variantes / Casos de uso avanzados

El mismo formulario sirve para alta y baja; el componente padre conserva la operación y la actividad seleccionadas.

## Qué no hacer

- No agregar `actividadUuid` al payload del formulario; se obtiene de la fila que abrió el popup.
- No decidir aquí si la operación es alta o baja ni mostrar confirmaciones irreversibles.

## Relación con el sistema de diseño

Reutiliza `app-select` y `appValidacionFormulario`. Consume `--semantic-danger` y hereda los tokens del selector y del popup que lo contiene.

## Notas técnicas

El componente mantiene el UUID seleccionado en un signal y libera su temporizador en `ngOnDestroy`.
