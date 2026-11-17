# CalendarioSociosComponent

`app-calendario-socios` — carga el calendario del portal para socio titular o familiar y adapta sus slots a `app-calendario`.

## Uso básico

```typescript
import { Component } from '@angular/core';
import { CalendarioSociosComponent } from './calendario-socios.component';

@Component({
  imports: [CalendarioSociosComponent],
  template: '<app-calendario-socios />',
})
export class CalendarioSociosPageComponent {}
```

## Inputs

No expone inputs públicos.

## Outputs

No expone outputs públicos; carga y presenta el calendario internamente.

## Variantes / Casos de uso avanzados

La misma page y este mismo componente se reutilizan en `/socio-titular/calendario` y `/socio-familiar/calendario`.

## Qué no hacer

- No crear variantes por rol ni usar `PortalProfesorApiService`; los socios comparten `PortalSocioApiService`.
- No modificar `app-calendario` para adaptar el DTO remoto; la transformación pertenece a este componente.

## Relación con el sistema de diseño

Reutiliza `app-calendario`, `app-card` y `app-boton`. El error usa `--semantic-danger` y el resto de la presentación hereda los tokens de los componentes UI.

## Notas técnicas

Consulta rangos `dd/MM/yyyy`, evita conversiones UTC y cancela la solicitud anterior cuando cambia el mes o se destruye el componente.
