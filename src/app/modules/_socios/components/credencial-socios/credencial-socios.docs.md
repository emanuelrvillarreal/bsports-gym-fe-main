# CredencialSociosComponent

`app-credencial-socios` — carga la credencial de un socio titular o familiar y adapta los datos a `app-carnet`.

## Uso básico

```typescript
import { Component } from '@angular/core';
import { CredencialSociosComponent } from './credencial-socios.component';

@Component({
  imports: [CredencialSociosComponent],
  template: '<app-credencial-socios />',
})
export class CredencialSociosPageComponent {}
```

## Inputs

No expone inputs públicos.

## Outputs

No expone outputs públicos; consulta la credencial al inicializarse.

## Variantes / Casos de uso avanzados

La misma page se usa en `/socio-titular/credencial` y `/socio-familiar/credencial`. La imagen del socio es opcional y se normaliza como cadena vacía. Si se actualiza con `POST /user/photo` mientras el carnet está montado, se refresca sin recargar la página.

## Qué no hacer

- No persistir `qr`, `userUuid` ni datos personales en el navegador.
- No reutilizar este componente en profesor; ese perfil tiene servicio, DTO adaptado y componente propios.

## Relación con el sistema de diseño

Reutiliza `app-carnet`, `app-page-loading-shell` y `app-boton`. Consume `--app-text-soft`, `--app-surface` y `--app-surface-border`, compatibles con el tema activo.

## Notas técnicas

Respeta `PerformanceModeService` al delegar `altoRendimiento` al carnet. La suscripción se vincula al `DestroyRef`.
