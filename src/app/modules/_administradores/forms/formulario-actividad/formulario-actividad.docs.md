# FormularioActividadComponent

`app-formulario-actividad` — valida y emite el alta o la edición de una actividad del club.

## Uso básico

```typescript
import { Component } from '@angular/core';
import { GuardarActividadPayload } from '../../../../core/api/interfaces/actividades.interfaces';
import { FormularioActividadComponent } from './formulario-actividad.component';

@Component({
  imports: [FormularioActividadComponent],
  template: '<app-formulario-actividad (enviado)="guardar($event)" />',
})
export class ActividadEjemploComponent {
  guardar(payload: GuardarActividadPayload): void {
    console.log(payload);
  }
}
```

## Inputs

| Input             | Tipo                     | Default | Descripción                                                 |
| ----------------- | ------------------------ | ------- | ----------------------------------------------------------- |
| `duracionErrorMs` | `number`                 | `5000`  | Tiempo visible de los errores de validación.                |
| `actividad`       | `ActividadDto \| null`   | `null`  | Precarga una actividad para edición; `null` activa el alta. |
| `categorias`      | `readonly CategoriaDto[]` | `[]`   | Opciones mostradas mediante `app-select`.                   |

## Outputs

| Output    | Payload                   | Descripción                                                                |
| --------- | ------------------------- | -------------------------------------------------------------------------- |
| `enviado` | `GuardarActividadPayload` | Emite campos normalizados, horarios con segundos y días separados por `;`. |

## Variantes / Casos de uso avanzados

Al intentar guardar datos incompletos o inconsistentes, `appValidacionFormulario` marca los
campos inválidos en rojo, desplaza el contenedor del popup al primero de ellos y le asigna foco.
Los horarios participan de la misma validación, incluso cuando la hora de fin es anterior o igual
a la de inicio.

La selección paginada de profesores pertenece al contenedor `GestionActividadesComponent`, que completa `profesorUuids` antes de llamar al servicio. El formulario mantiene únicamente campos, categoría, días y validaciones.

La selección de categorías es múltiple: cada categoría elegida desaparece del selector y queda en la lista de seleccionadas, donde puede quitarse. El alta y la edición envían los UUID en `categoriaUuids`; si no se elige ninguna, se envía un array vacío.

## Qué no hacer

- No enviar horarios sin segundos ni días como un array; el payload usa `HH:mm:ss` y una cadena con `;`.
- No realizar HTTP ni administrar el popup desde el formulario.

## Relación con el sistema de diseño

Reutiliza `appValidacionFormulario` y `app-select`; consume `--app-text`, `--app-text-soft`, `--app-surface`, `--app-surface-border`, `--app-accent` y `--semantic-danger`.

## Notas técnicas

El campo opcional `diasVencimientoCuota` se precarga al editar y se envía como entero cuando tiene valor; vacío deja que el backend aplique sus 30 días por defecto.

Valida cupo mayor o igual a uno, importe positivo y hora final posterior a la inicial. Un `effect` reinicia el estado al cambiar `actividad`.

El formulario ofrece `SEMANAL`, `MENSUAL`, `BIMESTRAL`, `TRIMESTRAL`, `CUATRIMESTRAL`,
`SEMESTRAL` y `ANUAL`, con etiquetas en español. En alta, y si la actividad editada todavía no
contiene periodicidad, el valor inicial es `MENSUAL`; al editar, precarga el valor recibido.
El payload siempre incluye `periodicidadCuota`. `diasVencimientoCuota` sigue siendo independiente,
opcional y se envía como entero cuando se informa.
