# CredencialProfesorComponent

`app-credencial-profesor` — carga la credencial específica del profesor y adapta sus datos a `app-carnet`.

## Uso básico

```typescript
import { Component } from '@angular/core';
import { CredencialProfesorComponent } from './credencial-profesor.component';

@Component({
  imports: [CredencialProfesorComponent],
  template: '<app-credencial-profesor />',
})
export class CredencialProfesorPageComponent {}
```

## Inputs

No expone inputs públicos.

## Outputs

No expone outputs públicos; consulta la credencial al inicializarse.

## Variantes / Casos de uso avanzados

Mientras se consulta el endpoint se mantiene montado `app-carnet` con valores seguros y se activa su input `cargando`, por lo que el componente reutilizable presenta su propio overlay. Si la respuesta no contiene `profesor`, se muestra el estado vacío. DNI, email y fecha de alta se normalizan como cadenas vacías cuando faltan. Una actualización por `POST /user/photo` refresca la foto del carnet montado sin recargar la página.

## Qué no hacer

- No reutilizar `CredencialSociosComponent` ni leer endpoints de socios.
- No persistir el QR, `userUuid` ni los datos personales de la credencial.

## Relación con el sistema de diseño

Reutiliza el estado de carga integrado de `app-carnet` y `app-boton` para el reintento. Consume `--app-text-soft`, `--app-surface` y `--app-surface-border`; responde al tema activo.

## Notas técnicas

Respeta `PerformanceModeService` y delega `altoRendimiento` al carnet. La suscripción se vincula al `DestroyRef`.
