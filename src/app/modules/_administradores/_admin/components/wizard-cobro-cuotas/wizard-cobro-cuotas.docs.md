# WizardCobroCuotasComponent

Si `montoFinal` es válido y distinto de `monto`, se muestra el original tachado y se usa el importe final en los subtotales, el total y la confirmación del cobro.

`app-wizard-cobro-cuotas` coordina el alta de cobros administrativos de una o varias cuotas de un grupo familiar.

## Ownership

Pertenece al perfil `ADMIN`. Consume `SociosApiService` y `TesoreriaApiService`; el contenedor conserva el popup, sus acciones y la recarga de la tabla principal.

## Uso básico

```ts
import { WizardCobroCuotasComponent } from './wizard-cobro-cuotas.component';
```

```html
<app-wizard-cobro-cuotas
  #wizardCobro
  [abierto]="popupAbierto()"
  (cancelar)="cerrar()"
  (cobrosActualizados)="recargarCuotas()"
  (completado)="cerrar()"
/>
```

## Inputs

| Input     | Tipo      | Default | Descripción                                             |
| --------- | --------- | ------- | ------------------------------------------------------- |
| `abierto` | `boolean` | `false` | Activa la carga inicial; al cerrarse reinicia el flujo. |

## Outputs

| Output               | Payload | Descripción                                                                       |
| -------------------- | ------- | --------------------------------------------------------------------------------- |
| `cancelar`           | `void`  | Solicita al contenedor cerrar el popup.                                           |
| `cobrosActualizados` | `void`  | Informa que al menos una cuota fue cobrada y debe recargarse la grilla principal. |
| `completado`         | `void`  | El usuario cerró la pantalla de cobro registrado con **Listo**.                    |

## API de navegación

Expone `pasoActual`, `procesando`, `cargandoSeleccionTotal`, `puedeContinuar`, `puedeConfirmar`, `textoConfirmar`, `anterior()`, `siguiente()`, `solicitarCancelacion()`, `confirmarCobro()`, `iniciarConCuota()`, `cobrarOtroSocio()` y `finalizar()` para que el contenedor proyecte las acciones directamente en `app-popup`.

## Flujo

Los pasos se presentan como preguntas: **¿Quién paga? → ¿Qué paga? → ¿Cómo paga?**, y al terminar una pantalla de **Cobro registrado**.

1. **¿Quién paga?** Pagina titulares y familiares mediante `POST /member/paginate`. Una sola consulta de cuotas impagas (`POST /treasury/cuota/paginate`, hasta 200) completa la columna **Debe** y ordena primero a quienes deben; si hay más cuotas que las consultadas, la columna queda vacía en lugar de mostrar montos incompletos. Cada fila tiene un botón con texto **Elegir**.
2. **¿Qué paga?** Consulta cuotas `PENDIENTE` y `VENCIDA` (las más viejas primero, `VENCIMIENTO_ASC`): usa `titularMemberUuid` para un titular y `personaMemberUuid` para un familiar. **Toda la deuda arranca marcada**; cada cuota es una fila con la casilla a la izquierda y el total queda fijo arriba.
3. **¿Cómo paga?** Efectivo, Transferencia, Mercado Pago y Otro son botones grandes. "Pagó cada cuota con un medio distinto" pasa al modo por cuota (solo medios manuales). El botón final, que expone `textoConfirmar`, dice "Cobrar $X" o "Generar link de $X".
4. Para medios manuales agrupa las cuotas por medio y llama secuencialmente a `POST /treasury/cuota/cobro`. Si el medio es `MERCADO_PAGO`, crea una única preferencia para todas las `cuotaUuids` y muestra QR, copia de enlace y apertura manual.
5. Con todo cobrado pasa a `pasoActual = 'listo'` (no emite `completado`): el contenedor muestra **Cobrar a otro socio** (`cobrarOtroSocio()`) y **Listo** (`finalizar()`, que emite `completado`).

### Cobrar desde la tabla

`iniciarConCuota(cuota)` arranca el flujo con esa persona y esa cuota ya elegidas, directo en "¿Cómo paga?". "Atrás" carga el resto de la deuda de la persona. Es lo que usa el botón **Cobrar** de cada cuota pendiente o vencida en `app-gestion-cuotas`; no hay otro popup de cobro.

## Qué no hacer

- No mover este componente a `modules/ui`: contiene reglas y servicios de Tesorería.
- No ofrecer Mercado Pago en “Un medio por cuota”: produciría varios checkouts simultáneos.
- No cerrar el popup ante un resultado parcial: las cuotas fallidas deben quedar disponibles para reintento.
- No marcar cuotas como pagadas al crear la preferencia: la liquidación depende del webhook.

## Relación con el sistema de diseño

Compone `app-wizard-pasos`, `app-tabla-responsive`, `app-paginacion`, `app-select`, `app-boton` y `app-titulo-hero`. Sus estilos usan tokens `--app-*` y `--semantic-*`.

## Notas técnicas

La selección se guarda por `cuotaUuid` entre páginas. “Seleccionar toda la deuda” toma un snapshot del alcance seleccionado —grupo completo o familiar— y descarta la operación completa si alguna página falla o cambia `totalElements`. Mientras existe un `mercadoPagoPreferenceId` activo se bloquean confirmación, retroceso y cancelación para evitar solicitudes duplicadas.
