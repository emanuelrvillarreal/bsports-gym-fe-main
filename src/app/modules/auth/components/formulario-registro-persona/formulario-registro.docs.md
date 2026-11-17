# FormularioRegistroComponent

`app-formulario-registro` — captura el contrato plano de `POST /member/public/titular` para un usuario nuevo o uno ya existente.

## Uso básico

```typescript
import { Component } from '@angular/core';
import {
  FormularioRegistroComponent,
  FormularioRegistroValor,
} from './formulario-registro.component';

@Component({
  standalone: true,
  imports: [FormularioRegistroComponent],
  template: '<app-formulario-registro (submitted)="registrar($event)" />',
})
export class RegistroPageComponent {
  registrar(valor: FormularioRegistroValor): void {
    console.log(valor);
  }
}
```

## Inputs

| Input                 | Tipo      | Default              | Descripción                                         |
| --------------------- | --------- | -------------------- | --------------------------------------------------- |
| `textoBoton`          | `string`  | `'Enviar solicitud'` | Texto del botón de envío.                           |
| `cargando`            | `boolean` | `false`              | Bloquea el envío y muestra el spinner existente.    |
| `mensajeErrorExterno` | `string`  | `''`                 | Muestra temporalmente un error recibido de la page. |
| `duracionErrorMs`     | `number`  | `5000`               | Duración del error antes de ocultarlo.              |

## Outputs

| Output      | Payload                         | Descripción                                                                                          |
| ----------- | ------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `submitted` | `RegistroTitularPublicoPayload` | Emite nombre, apellido, email y los opcionales informados. Incluye password sólo para usuario nuevo. |

## Variantes / Casos de uso avanzados

- `usuario-nuevo`: exige contraseña de al menos ocho caracteres, una mayúscula y un número.
- `usuario-existente`: omite `password`; el backend reutiliza la cuenta identificada por email.
- DNI, teléfono y fecha de nacimiento son opcionales y se omiten si están vacíos.

## Qué no hacer

- No envolver el payload en `{ user: ... }`: el endpoint recibe `MemberPublicRegistroCommand` plano.
- No intentar consultar si el email existe; la elección es explícita y el backend responde los errores contractuales.
- No resolver el tenant desde una lista pública: la page debe aportar un `companyUuid` validado.

## Relación con el sistema de diseño

Consume tokens globales de superficie, borde, texto y acento, responde a tema claro/oscuro y reutiliza `app-load-spinner`.

## Notas técnicas

Usa signals como fuente de verdad. El error único permanece en el flujo con `visibility: hidden` y su temporizador se limpia en `ngOnDestroy`.
