# FormularioRegistroEmpresaComponent

`app-formulario-registro-empresa` — construye el `ClubRegistrationRequestDTO` completo requerido por `POST /sysadmin/clubs`.
El formulario genera `path` internamente a partir de `nombreComercial`, normalizándolo como un
segmento de URL (por ejemplo, `B Sport` se convierte en `b-sport`). El payload de alta no incluye
`fax`.

El contenedor entrega los catálogos CRM mediante `provinciasCrm` y
`condicionesImpositivasCrm`. El formulario exige una selección de ambos catálogos fiscales y
emite sus códigos como `codigoProvincia` y `codigoCondicionImpositiva`; no realiza HTTP.
El alta no selecciona ni envía un plan: el club queda sin suscripción inicial y el plan se asigna
posteriormente desde CRM Manager.

## Uso básico

```typescript
import { Component } from '@angular/core';
import { FormularioRegistroEmpresaComponent } from './formulario-registro-empresa.component';
import { RegistroEmpresaPayload } from '../../interfaces/registro-empresa.interface';

@Component({
  standalone: true,
  imports: [FormularioRegistroEmpresaComponent],
  template: '<app-formulario-registro-empresa (submitted)="registrar($event)" />',
})
export class AltaClubPageComponent {
  registrar(payload: RegistroEmpresaPayload): void {
    console.log(payload);
  }
}
```

## Inputs

| Input             | Tipo      | Default            | Descripción                                                          |
| ----------------- | --------- | ------------------ | -------------------------------------------------------------------- |
| `textoBoton`      | `string`  | `'Registrar club'` | Texto del botón principal.                                           |
| `cargando`        | `boolean` | `false`            | Deshabilita el envío y muestra el spinner.                           |
| `mostrarAcciones` | `boolean` | `true`             | Permite ocultar el botón cuando el envío se coordina desde un padre. |

## Outputs

| Output      | Payload                  | Descripción                                               |
| ----------- | ------------------------ | --------------------------------------------------------- |
| `submitted` | `RegistroEmpresaPayload` | Emite el contrato completo y normalizado de alta de club. |

## Variantes / Casos de uso avanzados

- El importe de cuota social se configura luego del alta, desde la gestión de la empresa.
- `periodicidadCuotaSocial` se selecciona entre las periodicidades admitidas y comienza en `MENSUAL`.
- `diasVencimientoMoroso` y `diasInhabilitacion` son opcionales y se omiten del JSON cuando están vacíos.

## Qué no hacer

- No enviar este formulario a `companies/register`: la ruta vigente en `postman/` es `sysadmin/clubs` y requiere credenciales SYSADMIN.
- No agregar `logoUrl` al payload: el logo se carga por separado mediante `POST /companies/logo`.
- No eliminar ninguno de los tres domicilios ni la persona autorizada mínima: son obligatorios para la API.

## Relación con el sistema de diseño

Consume tokens globales de superficie, borde, texto y acento. Conserva el layout responsive del formulario de sysadmin y reutiliza `app-load-spinner`.

## Notas técnicas

El componente normaliza CUIT, teléfonos, emails y espacios antes de emitir. `resetearFormulario()` restaura colores, valores opcionales y una persona autorizada vacía.
