# FormularioGestionSocioComponent

`app-formulario-gestion-socio` — valida y emite altas de titulares, altas de familiares o ediciones administrativas sin realizar HTTP.

## Uso básico

```typescript
import { Component } from '@angular/core';
import {
  FormularioGestionSocioComponent,
  GestionSocioPayload,
} from './formulario-gestion-socio.component';

@Component({
  imports: [FormularioGestionSocioComponent],
  template: '<app-formulario-gestion-socio modo="titular" (enviado)="guardar($event)" />',
})
export class AltaTitularEjemploComponent {
  guardar(payload: GestionSocioPayload): void {
    console.log(payload);
  }
}
```

## Inputs

| Input             | Tipo                  | Default   | Descripción                                        |
| ----------------- | --------------------- | --------- | -------------------------------------------------- |
| `duracionErrorMs` | `number`              | `5000`    | Tiempo visible de los errores de validación.       |
| `modo`            | `ModoFormularioSocio` | requerido | Selecciona `'titular'`, `'familiar'` o `'editar'`. |
| `socio`           | `SocioDto \| null`    | `null`    | Precarga los campos cuando se edita un socio.      |
| `descuentosDisponibles` | `readonly DescuentoDto[]` | `[]` | Catálogo habilitado para asignar en el alta. |
| `cargandoDescuentos` | `boolean` | `false` | Muestra el spinner UX mientras se obtiene el catálogo. |

## Outputs

| Output    | Payload               | Descripción                                                                  |
| --------- | --------------------- | ---------------------------------------------------------------------------- |
| `enviado` | `GestionSocioPayload` | Emite una unión discriminada con `modo` y el DTO correspondiente en `datos`. |

## Variantes / Casos de uso avanzados

- `titular` emite `AltaTitularPayload`, agrega la fecha local de alta y siempre incluye `password`.
- `familiar` emite `Omit<AltaFamiliarPayload, 'titularMemberUuid'>`; el componente padre agrega el titular seleccionado.
- `editar` emite `ActualizarSocioPayload` y permite editar parentesco cuando corresponde.
- Las dos altas permiten agregar cero, uno o varios descuentos recurrentes. Cada elemento incluye `descuentoUuid`, `fechaDesde` y `fechaHasta`; una fecha final vacía se normaliza a `null`.
- Un borrador completo se incorpora al guardar aunque no se haya pulsado “Agregar descuento”; un borrador incompleto o con rango inválido bloquea el envío para evitar perder datos silenciosamente.

## Qué no hacer

- No agregar `titularMemberUuid` dentro del formulario; pertenece al contexto de la fila seleccionada.
- No realizar altas ni actualizaciones con `HttpClient`; `GestionSociosComponent` decide el endpoint según `modo`.
- No usar este formulario para el registro público de socios; ese flujo vive en `auth`.

## Relación con el sistema de diseño

Reutiliza `app-select`, `app-input-fecha`, `app-boton`, `app-load-spinner-blue` y `appValidacionFormulario`. Consume tokens `--app-*` y los locales `--app-boton-fondo-texto-interaccion` y `--app-boton-radio`; responde al tema activo.

## Notas técnicas

Un `effect` sincroniza los campos al cambiar `socio`. Los opcionales vacíos se omiten y los errores temporales se limpian al destruir el componente.
