# InputPasswordComponent

`app-input-password` es un campo de contraseña reutilizable con visibilidad conmutable y soporte para formularios reactivos.

## Uso básico

```typescript
import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { InputPasswordComponent } from './input-password.component';

@Component({
  imports: [InputPasswordComponent, ReactiveFormsModule],
  template: '<app-input-password etiqueta="Contraseña" [formControl]="password" />',
})
export class EjemploPasswordComponent {
  readonly password = new FormControl('');
}
```

## Inputs

| Input | Tipo | Default | Descripción |
| --- | --- | --- | --- |
| `etiqueta` | `string` | `''` | Etiqueta visible del campo. |
| `placeholder` | `string` | `''` | Texto de ayuda del input. |
| `autocomplete` | `string` | `'current-password'` | Valor HTML de autocompletado. |
| `ariaLabel` | `string` | `'Contraseña'` | Etiqueta accesible si no se informa `etiqueta`. |
| `id` | `string` | `''` | Id nativo del input. |
| `requerido` | `boolean` | `false` | Reenvía la validación requerida al input nativo. |
| `colorPrimario` | `string` | `'var(--app-accent)'` | Color para hover, foco y estado activo del ícono. |

## Outputs

| Output | Payload | Descripción |
| --- | --- | --- |
| `valorCambiado` | `string` | Emite el valor al editar el campo. |

## Qué no hacer

- No guardar ni transformar la contraseña en el componente; esa responsabilidad pertenece al formulario consumidor.
- No reemplazar el ícono con `app-boton`; el control visual propio evita acoplar estilos de acciones generales.

## Relación con el sistema de diseño

Usa tokens `--app-*` para superficie, borde y texto. `colorPrimario` permite heredar el color contextual sin romper el modo oscuro.

## Notas técnicas

Implementa `ControlValueAccessor`, por lo que admite `formControlName`, `[formControl]` y deshabilitado desde el formulario.
