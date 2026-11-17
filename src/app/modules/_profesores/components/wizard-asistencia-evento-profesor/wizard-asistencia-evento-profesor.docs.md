# WizardAsistenciaEventoProfesorComponent

El popup usa `app-titulo-hero` para presentar el evento y su actividad. Su altura depende del contenido para evitar espacio vacío debajo del footer; solo el contenido que excede el viewport genera scroll.

El contenedor modal bloquea el desborde horizontal y permite únicamente scroll vertical. Las tablas conservan internamente su adaptación responsive.

El primer paso centra el texto y el selector de día. El selector muestra hasta cinco opciones visibles y permite recorrer el resto mediante scroll.

En la planilla, una asistencia con estado `null` conserva el chip amarillo y se presenta como “No informado”.

`app-wizard-asistencia-evento-profesor` coordina el flujo modal para elegir un día de un evento, preparar la asistencia y confirmarla en lote desde el portal del profesor.

## Uso básico

```ts
import { Component, signal } from '@angular/core';
import { EventoActividadDto } from '../../../../core/api/interfaces/actividades.interfaces';
import { WizardAsistenciaEventoProfesorComponent } from './wizard-asistencia-evento-profesor.component';

@Component({
  selector: 'app-ejemplo-asistencia',
  standalone: true,
  imports: [WizardAsistenciaEventoProfesorComponent],
  template: `
    <app-wizard-asistencia-evento-profesor
      [evento]="eventoSeleccionado()"
      (cerrar)="eventoSeleccionado.set(null)"
    />
  `,
})
export class EjemploAsistenciaComponent {
  protected readonly eventoSeleccionado = signal<EventoActividadDto | null>(null);
}
```

## Inputs

| Input    | Tipo                         | Default | Descripción                                                                                      |
| -------- | ---------------------------- | ------- | ------------------------------------------------------------------------------------------------ |
| `evento` | `EventoActividadDto \| null` | `null`  | Evento cuyo rango y actividad determinan los días disponibles. `null` mantiene cerrado el popup. |

## Outputs

| Output   | Payload | Descripción                                                                                     |
| -------- | ------- | ----------------------------------------------------------------------------------------------- |
| `cerrar` | `void`  | Solicita al contenedor limpiar el evento seleccionado luego de cancelar, descartar o confirmar. |

## Flujo y ownership

El componente es dueño del popup, los tres pasos, las lecturas de calendario y planilla, el borrador de asistencia y el guardado final. El contenedor conserva solamente el evento seleccionado y responde a `cerrar` asignando `null`.

1. Consulta `/portal/profesor/calendario` con un día adicional antes y después del evento para contemplar límites inclusivos/exclusivos del endpoint.
2. Conserva únicamente slots `ACTIVIDAD` de la misma `referenciaUuid` cuya fecha esté dentro del evento, descarta UUID vacíos, elimina duplicados y ordena por inicio. Los cancelados se muestran deshabilitados.
3. Obtiene la planilla del `slotUuid` seleccionado. El servicio transforma `alumnos[]` (`memberNombre`/`memberApellido`) a las filas normalizadas de la tabla, y el componente modifica un borrador local mediante las acciones disponibles.
4. Muestra la actividad, fecha, horario y lista de presentes antes de guardar.
5. Envía un lote parcial con las filas cuyo estado no nulo cambió. Si no hubo cambios, cierra sin ejecutar el `PUT`.

Las lecturas activas se cancelan al cambiar el input, cerrar o destruir el componente. Un error de guardado conserva el paso y el borrador para reintentar.

## Variantes / Casos de uso avanzados

- El popup permanece cerrado cuando `evento` es `null`.
- Cerrar con cambios pendientes abre una confirmación de descarte mediante `ToastAlertService`.
- La tabla de edición y la lista final reservan cinco filas visibles en escritorio. En mobile conservan el carrusel responsive provisto por `app-tabla-responsive`.
- Los estados admitidos son `PRESENTE` y `AUSENTE`; un estado inicial `null` no se envía hasta que el profesor lo modifica.

## Qué no hacer

- No pasar un slot ni construir el payload desde el contenedor: el componente resuelve ambos a partir del evento y mantiene un único ownership del borrador.
- No guardar al pulsar una acción de fila: las acciones solo modifican estado local y el `PUT` pertenece al paso de confirmación.
- No usar `eventoUuid` para el endpoint de asistencia: el contrato exige el `slotUuid` recuperado del calendario.
- No cerrar el popup ignorando `cerrar`; el contenedor debe asignar `null` al evento para completar el ciclo controlado.

## Relación con el sistema de diseño

Compone `app-popup`, `app-wizard-pasos`, `app-select`, `app-tabla-responsive` y `app-boton`. Consume `--app-accent`, `--app-text`, `--app-text-soft`, `--app-surface`, `--app-surface-strong`, `--app-surface-border`, `--semantic-success` y `--semantic-danger`, por lo que responde a los temas claro y oscuro. Expone los tokens locales `--wizard-asistencia-superficie` y `--wizard-asistencia-borde`.

## Notas técnicas

El guardado bloquea envíos duplicados y deshabilita el cierre hasta que termina. Los errores permanecen visibles dentro del popup y no destruyen la selección. `tbody_rows="5"` limita la altura de las tablas en escritorio sin agregar estilos sobre el componente compartido.
