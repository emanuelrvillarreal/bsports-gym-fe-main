# WizardPasosComponent

`app-wizard-pasos` muestra el progreso accesible de un flujo por pasos y proyecta su contenido sin administrar navegación ni reglas de negocio.

## Uso básico

```ts
import { PasoWizard, WizardPasosComponent } from './wizard-pasos.component';

readonly pasos: readonly PasoWizard[] = [
  { id: 'datos', etiqueta: 'Datos' },
  { id: 'detalle', etiqueta: 'Detalle' },
  { id: 'confirmacion', etiqueta: 'Confirmación' },
];
```

```html
<app-wizard-pasos [pasos]="pasos" pasoActual="detalle" etiquetaProgreso="Progreso del alta">
  <section>Contenido administrado por el componente de dominio.</section>
</app-wizard-pasos>
```

## Inputs

| Input | Tipo | Default | Descripción |
| --- | --- | --- | --- |
| `pasos` | `readonly PasoWizard[]` | requerido | Pasos ordenados del flujo. |
| `pasoActual` | `string` | requerido | Identificador del paso activo. |
| `etiquetaProgreso` | `string` | `'Progreso'` | Nombre accesible del indicador. |

## Outputs

No emite eventos. La navegación pertenece al componente consumidor.

## Variantes / Casos de uso avanzados

El contenido puede cambiar con signals sin recrear el indicador. Los pasos anteriores al activo se representan como completados.

## Qué no hacer

- No inyectar servicios de dominio ni realizar HTTP desde este componente.
- No delegar validaciones o navegación al indicador; deben permanecer en el contenedor.

## Relación con el sistema de diseño

Consume `--app-accent`, `--app-surface`, `--app-surface-border` y `--app-text-soft`. Expone los tokens locales `--wizard-color`, `--wizard-superficie` y `--wizard-borde`.

## Notas técnicas

El paso activo usa `aria-current="step"` y se anuncia mediante una región `aria-live`. Respeta `prefers-reduced-motion`.
