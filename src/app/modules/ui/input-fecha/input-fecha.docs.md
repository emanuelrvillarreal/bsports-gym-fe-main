# InputFechaComponent

`app-input-fecha` es un campo reutilizable para fecha o fecha y hora, con ícono de calendario propio y soporte para formularios reactivos.

## Uso básico

```typescript
import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { InputFechaComponent } from './input-fecha.component';

@Component({
  imports: [InputFechaComponent, ReactiveFormsModule],
  template: '<app-input-fecha etiqueta="Inicio" modo="fecha-hora" [formControl]="inicio" />',
})
export class EjemploFechaComponent {
  readonly inicio = new FormControl('2026-07-20T10:30');
}
```

## Inputs

| Input | Tipo | Default | Descripción |
| --- | --- | --- | --- |
| `etiqueta` | `string` | `''` | Etiqueta visible del campo. |
| `modo` | `ModoInputFecha` | `'fecha'` | Se escribe como `dd/mm/aaaa` y devuelve `YYYY-MM-DD`; `'mes'` usa `mm/aaaa`; `'fecha-hora'` usa `dd/mm/aaaa HH:mm` y devuelve `YYYY-MM-DDTHH:mm`. |
| `ariaLabel` | `string` | `'Seleccionar fecha'` | Etiqueta accesible si no se informa `etiqueta`. |
| `id` | `string` | `''` | Id nativo del input. |
| `colorPrimario` | `string` | `'var(--app-accent)'` | Color para hover y foco del ícono. |
| `usarCalendarioCustom` | `boolean` | `false` | Por defecto, el botón abre el selector nativo del navegador. En `true` usa el calendario visual del componente. |

## Outputs

| Output | Payload | Descripción |
| --- | --- | --- |
| `valorCambiado` | `string` | Emite el valor elegido. |

## Qué no hacer

- No enviar fechas formateadas para visualización; el componente trabaja con los valores ISO nativos del control.
- No enviar valores que no respeten el formato ISO nativo; el componente solo emite fechas con año de cuatro dígitos.
- No activar `usarCalendarioCustom` solo para cambiar el formato de escritura: los segmentos se comportan igual en ambos modos.

## Relación con el sistema de diseño

Usa tokens `--app-*` y `colorPrimario`, por lo que responde a tema claro/oscuro y al color recibido por props.

## Notas técnicas

No depende de la presentación regional de los controles nativos: todos los valores se escriben con números. Implementa `ControlValueAccessor`, conserva los límites `minimo`/`maximo` y los `diasPermitidos`, y solo emite valores ISO completos y válidos. El calendario custom se cierra al hacer click fuera del control.
