# FormularioRegistroFotoComponent

`app-formulario-registro-foto` — selecciona, valida y previsualiza una foto de perfil o un logo de club sin realizar HTTP.

## Uso básico

```typescript
import { Component } from '@angular/core';
import {
  FormularioRegistroFotoComponent,
  FormularioRegistroFotoValor,
} from './formulario-registro-foto.component';

@Component({
  standalone: true,
  imports: [FormularioRegistroFotoComponent],
  template: '<app-formulario-registro-foto (submitted)="guardar($event)" />',
})
export class PerfilComponent {
  guardar(valor: FormularioRegistroFotoValor): void {
    console.log(valor.foto);
  }
}
```

## Inputs

| Input                   | Tipo                           | Default         | Descripción                                             |
| ----------------------- | ------------------------------ | --------------- | ------------------------------------------------------- |
| `fotoInicial`           | `string \| null`               | `null`          | URL mostrada hasta seleccionar un archivo.              |
| `modo`                  | `'foto-perfil' \| 'logo-club'` | `'foto-perfil'` | Adapta textos, alt y validación de proporción.          |
| `cargando`              | `boolean`                      | `false`         | Bloquea acciones mientras el padre persiste el archivo. |
| `mensajeErrorExterno`   | `string`                       | `''`            | Error de persistencia mostrado dentro del formulario.   |
| `textoBotonConfirmar`   | `string`                       | `'Confirmar'`   | Texto de la acción principal.                           |
| `textoBotonRestablecer` | `string`                       | `'Restablecer'` | Texto de la acción secundaria.                          |
| `mostrarBotonEliminar`  | `boolean`                      | `false`         | Muestra una acción destructiva opcional junto a restablecer. |
| `textoBotonEliminar`    | `string`                       | `'Eliminar foto'` | Texto de la acción destructiva.                      |

## Outputs

| Output      | Payload                       | Descripción                                                 |
| ----------- | ----------------------------- | ----------------------------------------------------------- |
| `submitted` | `FormularioRegistroFotoValor` | Emite `foto`, `fotoPreview`, `ancho` y `alto` al confirmar. |
| `eliminar`  | `void`                         | Solicita al contenedor eliminar la imagen persistida.       |

## Variantes / Casos de uso avanzados

```html
<app-formulario-registro-foto
  modo="logo-club"
  textoBotonConfirmar="Guardar logo"
  (submitted)="guardarLogo($event)"
/>
```

`foto-perfil` exige una proporción casi cuadrada. `logo-club` acepta imágenes rectangulares y usa `object-fit: contain` en la previsualización.

## Qué no hacer

- No realizar HTTP dentro del componente; el padre decide si sube una foto o un logo y con qué contexto.
- No cambiar el payload de `submitted`: el header existente depende de `foto` y `fotoPreview`.
- No omitir `URL.revokeObjectURL`; el componente ya libera las previsualizaciones temporales.

## Relación con el sistema de diseño

Consume tokens globales de superficie, borde, texto y acento, y reutiliza `app-boton` con su estado de carga integrado. La acción principal hereda el color primario y la secundaria conserva apariencia neutral.

## Notas técnicas

Acepta JPG, JPEG y PNG de hasta 5MB. El modo predeterminado mantiene el comportamiento anterior para consumidores que no declaran `modo`.
