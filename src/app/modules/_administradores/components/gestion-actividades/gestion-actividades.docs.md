# GestionActividadesComponent

`app-gestion-actividades` administra actividades e inscripciones mediante una tabla paginada y formularios en popups no descartables.

## Uso básico

```typescript
import { GestionActividadesComponent } from './gestion-actividades.component';

@Component({
  imports: [GestionActividadesComponent],
  template: `<app-gestion-actividades [puedeAdministrar]="esAdministrador" />`,
})
export class ActividadesAdministradoresPageComponent {
  protected readonly esAdministrador = true;
}
```

## Inputs

| Input              | Tipo      | Default | Descripción                                    |
| ------------------ | --------- | ------- | ---------------------------------------------- |
| `puedeAdministrar` | `boolean` | `false` | Habilita la creación y edición de actividades. |

## Outputs

El componente no expone outputs. Coordina internamente la tabla, los popups y los servicios del dominio.

## Variantes / Casos de uso avanzados

Con `puedeAdministrar="false"`, el componente oculta el botón `Nueva actividad` y la tabla oculta la acción `Editar`. La acción `Inscribir` continúa disponible y se deshabilita cuando la actividad está completa.

El alta se abre desde el botón `+` de la barra inferior. La búsqueda por nombre o ubicación, el filtro de disponibilidad y el botón `Buscar` comparten la fila superior, con sus labels alineados. La edición e inscripción se disparan desde `accionFila` mediante un único dispatcher. Alta y edición comparten un popup grande; inscripción usa un popup mediano. Todos los popups usan `app-titulo-hero`. Abrir un flujo cierra y limpia el otro para impedir popups simultáneos.

Alta y edición seleccionan profesores con `app-tabla-responsive`, cinco filas visibles y paginado real de 20 registros. La selección se conserva al cambiar de página.

La inscripción consulta socios activos de forma paginada al abrir su popup, con páginas de 100
registros. El buscador filtra por nombre, apellido o DNI, reinicia la primera página y la tabla
conserva cuatro filas visibles con scroll. Cada fila muestra foto (o iniciales), nombre, apellido
y DNI formateado. También muestra la edad calculada desde `fechaNacimiento` en años completos y
días desde el último cumpleaños. La acción `Inscribir` abre un segundo paso dentro del mismo
popup: reutiliza `app-formulario-asignacion-descuento` para acumular opcionalmente uno o varios
descuentos del catálogo y sus respectivas vigencias. El usuario puede confirmar el conjunto,
continuar sin descuentos o volver a elegir otro socio. Cuando existen más de 100 resultados se
muestra `app-paginacion`.

La columna `Cupos` adapta `cantidadInscriptos` y `cupoMaximo` al formato
`inscriptos/cupo` esperado por el chip reutilizable de `app-tabla-responsive`. El
helper compartido resuelve automáticamente las variantes roja, amarilla o verde;
una actividad con `3/3` se presenta en rojo.

La acción `Ver` consume `GET /actividad/{uuid}` y abre un detalle con el nombre y
la descripción de categoría en `app-titulo-hero`, categoría, rango de edad en una
sola card, ubicación, horario con icono de reloj y días. Cuando están configurados
los siete días se resume como `Todos los días`; en los demás casos se muestran
chips individuales. La tabla principal usa chips de días abreviados y un horario
con icono de reloj; el popup termina con un cierre explícito mediante
`app-boton`; esta vista no expone el flujo de consentimiento de menores.

Cada profesor asignado se presenta con foto o iniciales y expone una acción
iconográfica que abre un segundo popup. La grilla muestra hasta seis tarjetas a
la vez y, si existen más profesores, permite desplazarse verticalmente para ver
el resto. El detalle muestra también la foto o las
iniciales junto al título, y prioriza nombre y apellido en
una sola card y muestra DNI, teléfono, email y fecha de alta; UUID y estado se
omiten de esta vista. DNI y teléfono usan los helpers compartidos de formato.
Los inscriptos se renderizan con `app-tabla-responsive`, incluida la foto o el
avatar de iniciales, email y DNI. Cuando el detalle entrega `memberUuid`,
`titularMemberUuid` y una fecha de nacimiento de una persona menor de 14 años,
la fila expone `Registrar consentimiento` con un ícono de documento azul; la operación pide confirmación explícita
y registra al titular como responsable. La tabla conserva cuatro filas visibles y
pagina localmente de a 50 registros; `app-paginacion` sólo aparece cuando el
detalle contiene más de 50 inscriptos. La baja se ejecuta desde la fila del
inscripto, requiere confirmación irreversible mediante toast y recarga el detalle.

Los popups bloquean el cierre por clic exterior y por tecla Escape. El usuario debe usar el botón interno `Cancelar`; mientras se guarda una operación, ese botón queda deshabilitado.

Durante la carga inicial y las recargas por búsqueda, disponibilidad o paginación, la tabla y la paginación permanecen montadas. `app-tabla-responsive` muestra su spinner integrado y reserva el alto equivalente a cinco filas; el botón `Buscar` también comunica el estado de carga y evita envíos duplicados.

## Qué no hacer

- No usar `plantillaAcciones` para botones iconográficos comunes. Se reserva para los checkboxes de selección de profesores e inscriptos.
- No abrir los formularios dentro de la tabla. El `+` de la barra de filtros debe delegar la apertura al popup.
- No abrir flujos de edición o inscripción sobre el detalle. El único popup apilado permitido es el detalle de un profesor, porque depende del contexto de la actividad abierta.
- No prometer que la baja de inscripción anula cuotas ya generadas, porque el contrato actual no lo garantiza.

## Relación con el sistema de diseño

La vista reutiliza `app-card`, `app-tabla-responsive`, `app-popup`, `app-titulo-hero`, `app-select`, `app-boton`, `app-paginacion` y `app-formulario-actividad`. La tabla encapsula el spinner del listado para conservar una experiencia de carga consistente. Los estilos consumen `--app-text`, `--app-text-soft`, `--app-surface`, `--app-surface-border`, `--app-accent`, `--semantic-danger` y `--semantic-success`, por lo que responden al tema activo.

## Notas técnicas

Consume `POST /actividad/paginate` para el listado liviano y `GET /actividad/{uuid}` para edición, profesores y visualización de inscriptos. El servicio normaliza las horas que el backend serializa como arrays (`[HH, mm]`) al formato `HH:mm`, manteniendo estable el DTO consumido por formularios y vistas. `PUT /actividad/{uuid}` recibe el command completo, incluida la selección final de `profesorUuids`. La paginación del detalle es local porque ese GET ya entrega la nómina completa con imagen, email y DNI. Para ejecutar una baja, el componente resuelve el `memberUuid` con búsqueda exacta por DNI antes de llamar al endpoint.

`POST /actividad/{uuid}/inscripcion` recibe `{ memberUuid }` al continuar sin descuento o agrega
`descuentos: [{ descuentoUuid, fechaDesde, fechaHasta }, ...]` al confirmar el formulario opcional.
Este agregado pertenece solo al backoffice; el contrato y las pantallas del portal no se modifican.
