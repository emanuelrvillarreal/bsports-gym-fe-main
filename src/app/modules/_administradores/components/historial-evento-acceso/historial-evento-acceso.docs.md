# HistorialEventoAccesoComponent

`app-historial-evento-acceso` muestra los scans y cobros paginados de un evento de acceso.

## Uso básico

```html
<app-historial-evento-acceso
  [abierto]="historialAbierto()"
  [evento]="eventoSeleccionado()!"
  (cerrar)="historialAbierto.set(false)"
/>
```

## Inputs

| Input     | Tipo                     | Default   | Descripción                        |
| --------- | ------------------------ | --------- | ---------------------------------- |
| `abierto` | `boolean`                | `false`   | Controla la visibilidad del popup. |
| `evento`  | `EventoAccesoDetalleDto` | Requerido | Evento cuyo historial se consulta. |

## Outputs

| Output   | Payload | Descripción                                                  |
| -------- | ------- | ------------------------------------------------------------ |
| `cerrar` | `void`  | Solicita cerrar el historial cuando no hay una carga activa. |

## Variantes / Casos de uso avanzados

La búsqueda se envía al backend por nombre y reinicia la página a uno. La fecha acepta string, timestamp o array Jackson; los valores desconocidos se muestran como “Fecha no disponible”.

## Qué no hacer

- No cargar todo el historial para paginar en memoria; el endpoint ya es paginado.
- No parsear la fecha directamente en el template; el contrato admite más de un formato serializado.

## Relación con el sistema de diseño

Reutiliza `app-popup`, `app-titulo-hero`, `app-tabla-responsive`, `app-paginacion` y `app-boton`, con los tokens de superficie y color semántico existentes.
