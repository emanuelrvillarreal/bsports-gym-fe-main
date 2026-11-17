# FormularioUsuarioInternoComponent

`app-formulario-usuario-interno` valida y emite datos comunes para crear o editar un recepcionista o un profesor.

## Uso básico

```typescript
import { Component } from '@angular/core';
import {
  FormularioUsuarioInternoComponent,
  ResultadoFormularioUsuarioInterno,
} from './formulario-usuario-interno.component';

@Component({
  imports: [FormularioUsuarioInternoComponent],
  template: '<app-formulario-usuario-interno (enviado)="guardar($event)" />',
})
export class UsuarioInternoEjemploComponent {
  guardar(resultado: ResultadoFormularioUsuarioInterno): void {
    console.log(resultado);
  }
}
```

## Inputs

| Input              | Tipo                         | Default | Descripción                                                              |
| ------------------ | ---------------------------- | ------- | ------------------------------------------------------------------------ |
| `duracionErrorMs`  | `number`  | `5000`  | Tiempo visible de los errores de validación.                             |
| `mostrarFechaAlta` | `boolean` | `true`  | Permite ocultar la fecha cuando el contenedor la genera automáticamente. |
| `modo`             | `'crear' \| 'editar'`        | `crear` | Selecciona campos y contrato de salida.                                  |
| `usuarioInicial`   | `UsuarioInternoBaseDto|null` | `null`  | Datos que se precargan durante edición.                                  |

## Outputs

| Output    | Payload                      | Descripción                                                                  |
| --------- | ---------------------------- | ---------------------------------------------------------------------------- |
| `enviado` | `ResultadoFormularioUsuarioInterno` | Emite una unión discriminada con modo y datos normalizados. |

## Variantes / Casos de uso avanzados

El consumidor decide si el payload se envía al servicio de recepcionistas o al de profesores. El DNI es obligatorio, se muestra formateado y se emite sin separadores; admite entre 7 y 11 dígitos. Teléfono y fechas son opcionales. Nombre y apellido admiten únicamente letras y espacios.

En edición oculta contraseña y fechas, precarga los cinco campos admitidos por backend y emite sólo los modificados. Borrar el teléfono emite `telefono: ''`; una edición sin cambios no genera un request.

El email debe respetar un formato válido. El teléfono reutiliza `telefono-formato.ts` y se emite formateado. En dark mode, todos los campos usan fondo negro.

## Qué no hacer

- No agregar un input de rol: el dominio lo determina `GestionUsuariosInternosComponent` mediante su `tipo`.
- No llamar a la API ni cerrar el popup desde el formulario.

## Relación con el sistema de diseño

Reutiliza `appValidacionFormulario`. Consume `--app-text`, `--app-text-soft`, `--app-surface`, `--app-surface-border`, `--app-accent` y `--semantic-danger`; responde al tema activo.

## Notas técnicas

Convierte el email a minúsculas, omite opcionales vacíos y libera el temporizador en `ngOnDestroy`.
