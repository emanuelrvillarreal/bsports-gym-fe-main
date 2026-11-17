# FormularioEventoActividadComponent

`app-formulario-evento-actividad` es el formulario presentacional compartido por la gestión administrativa y el portal del profesor. Administra sus campos con signals, valida las fechas y emite un `EventoActividadCommand`; no realiza HTTP ni controla popups.

## Uso básico

```html
<app-formulario-evento-actividad
  formId="formulario-evento"
  [opcionesActividades]="opcionesActividades()"
  [actividadUuidInicial]="actividadUuid()"
  (enviado)="guardar($event)"
/>
```

## Inputs

| Input | Tipo | Default | Descripción |
| --- | --- | --- | --- |
| `formId` | `string` | `'formulario-evento-actividad'` | Identificador para asociar un botón submit externo. |
| `opcionesActividades` | `readonly SelectOption[]` | `[]` | Actividades disponibles en el selector. |
| `actividadUuidInicial` | `string` | `''` | Actividad preseleccionada. |
| `valorInicial` | `EventoActividadCommand \| null` | `null` | Datos usados en edición. |
| `actividadBloqueada` | `boolean` | `false` | Reemplaza el selector por un campo deshabilitado. |
| `reinicioVersion` | `number` | `0` | Reinicia los campos cuando cambia. |

## Outputs

| Output | Payload | Descripción |
| --- | --- | --- |
| `enviado` | `EventoActividadCommand` | Emite el payload validado y normalizado en formato `dd/MM/yyyy HH:mm:ss`. |

## Variantes / Casos de uso avanzados

Al cambiar el inicio, el fin se autocompleta una hora después. El control de fin no admite valores anteriores al inicio y el submit vuelve a validar que inicio sea estrictamente anterior a fin.

En edición se puede usar `[actividadBloqueada]="true"` para impedir que cambie la pertenencia del evento.

## Qué no hacer

- No inyectar servicios HTTP: el componente contenedor procesa `enviado`.
- No duplicar la validación de fechas en cada popup: este formulario es el dueño de esa regla.

## Relación con el sistema de diseño

Consume `--app-text`, `--app-text-soft`, `--app-surface`, `--app-surface-border`, `--app-accent` y los tokens semánticos de error. En modo oscuro, los campos de texto, fecha, descripción y selección usan fondo negro.
