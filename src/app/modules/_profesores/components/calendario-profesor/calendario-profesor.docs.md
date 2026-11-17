# CalendarioProfesorComponent

`app-calendario-profesor` — carga el calendario específico del profesor y adapta sus slots a `app-calendario`.

## Uso básico

```typescript
import { Component } from '@angular/core';
import { CalendarioProfesorComponent } from './calendario-profesor.component';

@Component({
  imports: [CalendarioProfesorComponent],
  template: '<app-calendario-profesor />',
})
export class CalendarioProfesorPageComponent {}
```

## Inputs

No expone inputs públicos.

## Outputs

No expone outputs públicos; consulta el calendario al crearse y cuando cambia el mes.

## Variantes / Casos de uso avanzados

Los eventos cancelados reciben una clase visual específica. El título prioriza `titulo`, luego `referenciaNombre` y finalmente “Actividad”.

## Qué no hacer

- No reutilizar el calendario de socios: el profesor consume `PortalProfesorApiService` y tiene evolución funcional independiente.
- No agregar acciones docentes a `app-calendario`; la adaptación del portal debe permanecer en este componente.

## Relación con el sistema de diseño

Reutiliza `app-calendario`, `app-card` y `app-boton`. El error usa `--semantic-danger` y la presentación hereda los tokens UI.

## Notas técnicas

Consulta rangos `dd/MM/yyyy`, cancela la solicitud anterior al cambiar de mes y libera la suscripción en `ngOnDestroy`.
