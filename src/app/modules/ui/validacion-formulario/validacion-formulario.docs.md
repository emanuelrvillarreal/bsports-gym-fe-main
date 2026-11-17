# ValidacionFormularioDirective

`appValidacionFormulario` agrega feedback visual, accesibilidad y navegacion al primer campo invalido sin apropiarse de las reglas de negocio.

## Uso basico

```ts
import { Component, signal } from '@angular/core';
import { ValidacionFormularioDirective } from './validacion-formulario.directive';

@Component({
  standalone: true,
  imports: [ValidacionFormularioDirective],
  template: `
    <form appValidacionFormulario (submit)="$event.preventDefault()">
      <input required [value]="nombre()" />
      <button type="submit">Guardar</button>
    </form>
  `,
})
export class EjemploComponent {
  protected readonly nombre = signal('');
}
```

## Inputs

| Input                     | Tipo      | Default | Descripcion                                                               |
| ------------------------- | --------- | ------- | ------------------------------------------------------------------------- |
| `appValidacionFormulario` | `boolean` | `true`  | Activa la directiva. Al pasar a `false`, limpia marcas y estado de envio. |

## Outputs

No emite outputs.

## Variantes / Casos de uso avanzados

Para validaciones que no puede expresar HTML, usar `data-app-invalido`:

```html
<form appValidacionFormulario>
  <app-select [attr.data-app-invalido]="!categoria() ? 'true' : null" />
</form>
```

Reconoce controles nativos invalidos, controles `.ng-invalid` de Reactive Forms y elementos con `data-app-invalido="true"`.

## Que no hacer

- No usar `data-app-invalido` para errores de API: representa exclusivamente invalidez del campo.
- No llamar manualmente a `scrollIntoView()` desde cada componente.
- No reemplazar las validaciones de dominio por esta directiva: solo presenta el resultado.

## Relacion con el sistema de diseno

La clase global `app-control--invalido` consume `--app-danger`, por lo que responde a los temas del proyecto.

## Notas tecnicas

Es compatible con SSR y espera una microtarea para que Angular actualice las clases de Reactive Forms y los bindings manuales. En controles compuestos busca un descendiente `data-app-form-control` antes de enfocar.
