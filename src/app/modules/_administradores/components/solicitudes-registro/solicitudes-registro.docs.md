# SolicitudesRegistroComponent

`app-solicitudes-registro` — permite aprobar o rechazar solicitudes pendientes de socios desde una tabla paginada.

## Uso básico

```typescript
import { Component } from '@angular/core';
import { SolicitudesRegistroComponent } from './solicitudes-registro.component';

@Component({
  selector: 'app-solicitudes-registro-administradores-page',
  imports: [SolicitudesRegistroComponent],
  template: '<app-solicitudes-registro />',
})
export class SolicitudesRegistroAdministradoresPageComponent {}
```

## Inputs

El componente no expone inputs.

## Outputs

El componente no expone outputs; coordina las operaciones mediante `SociosApiService`.

## Variantes / Casos de uso avanzados

- “Aprobar” abre un `app-popup` para confirmar la operación. La aprobación puede enviarse sin
  descuentos o con uno o más descuentos recurrentes del catálogo, cada uno con fecha inicial y
  fecha final opcional.
- El catálogo se pagina internamente hasta recuperar todas las opciones. Cada descuento puede
  agregarse una sola vez y puede quitarse antes de confirmar.
- “Rechazar” abre un `app-popup` con un motivo opcional de hasta 512 caracteres.
- El popup solo se cierra desde “Cancelar” o al completar correctamente el rechazo; no se cierra con backdrop ni Escape.

## Qué no hacer

- No reemplazar las acciones configurables de `app-tabla-responsive` por un `ng-template`; los iconos, colores y estados ya están declarados en el componente.
- No cerrar el popup al iniciar el rechazo; debe permanecer visible y bloqueado hasta conocer el resultado.
- No llamar `HttpClient` directamente; `SociosApiService` conserva el contrato y los contextos de autenticación.

## Relación con el sistema de diseño

Reutiliza `app-card`, `app-tabla-responsive`, `app-popup`, `app-paginacion`, `app-boton`,
`app-titulo-hero`, `app-formulario-filtro-solicitudes`, `app-formulario-asignacion-descuento` y
`app-formulario-rechazo-solicitud`. Las acciones consumen `--semantic-success` y
`--semantic-danger`; el resto de la vista usa tokens `--app-*` y responde al tema activo.

## Notas técnicas

- El paginado es 1-based y usa 10 filas por página.
- El dispatcher de `accionFila` centraliza las acciones `aprobar` y `rechazar`.
- Los endpoints involucrados son los métodos `listarSolicitudes`, `aprobarSolicitud` y `rechazarSolicitud` de `SociosApiService`.
- `aprobarSolicitud` recibe un body tipado. Para conservar el flujo tradicional se envía `{}`;
  cuando hay selecciones se envía `{ descuentos: [...] }`.
