# Tabla Responsive

`plantillasCeldas` permite personalizar de forma opcional el contenido de columnas específicas. Cada template recibe la fila como `$implicit`.

`app-tabla-responsive` renderiza tablas administrativas con acciones, estado vacío, scroll controlado, fila editable (`tr_input`) y footer opcional para filtro temporal.

## Uso Básico

```ts
import {
  AccionTabla,
  ColumnaTabla,
  EventoAccionTabla,
} from '../../ui/tabla-responsive/tabla-responsive.component';

interface MovimientoFila {
  uid: string;
  fecha: string;
  titulo: string;
  tipo: string;
  monto: number;
}

protected readonly columnas: readonly ColumnaTabla<MovimientoFila>[] = [
  { id: 'fecha', titulo: 'Fecha', tipo: 'fecha' },
  { id: 'titulo', titulo: 'Titulo' },
  { id: 'tipo', titulo: 'Tipo' },
  { id: 'monto', titulo: 'Monto', tipo: 'moneda' },
];

protected readonly acciones: readonly AccionTabla<MovimientoFila>[] = ['editar', 'borrar'];

protected manejarAccion(evento: EventoAccionTabla<MovimientoFila>): void {
  if (evento.accion === 'editar') {
    this.editar(evento.fila);
  }
}
```

```html
<app-tabla-responsive
  [columnas]="columnas"
  [filas]="filas"
  [acciones]="acciones"
  [tbody_rows]="5"
  (accionFila)="manejarAccion($event)"
/>
```

## Acciones de fila

La prop `acciones` acepta los presets `agregar`, `borrar`, `editar`, `ver` e `inscribir`.
Cada botón muestra solo su icono y revela el texto debajo mediante un tooltip flotante al
recibir hover o foco.

Los botones `+` de cabecera heredan el color primario mediante `app-boton`; el icono calcula
automáticamente texto claro u oscuro con `color-texto-contraste.ts`.

```ts
protected readonly acciones: readonly AccionTabla<MovimientoFila>[] = [
  'ver',
  'editar',
  'borrar',
];
```

Para agregar una acción nueva se pasan `id`, `texto`, `icono` y `color`. El color debe ser
un token CSS del sistema y puede declararse como valor fijo o como función por fila. `visible` y
`deshabilitada` también pueden ser booleanos o funciones por fila.

```ts
protected readonly acciones: readonly AccionTabla<MovimientoFila>[] = [
  'ver',
  {
    id: 'auditar',
    texto: 'Auditar',
    icono: 'heroClock',
    color: (fila) => fila.tipo === 'CERRADO'
      ? 'var(--app-text-soft)'
      : 'var(--app-accent)',
    deshabilitada: (fila) => fila.tipo === 'CERRADO',
  },
];
```

Un preset también puede configurarse por fila mediante `predefinida`. Además de `visible` y
`deshabilitada`, admite `cargando` para bloquear el botón y reutilizar el spinner de `app-boton`.

```ts
protected readonly acciones: readonly AccionTabla<MovimientoFila>[] = [
  'ver',
  {
    predefinida: 'borrar',
    visible: (fila) => fila.tipo !== 'ARCHIVADO',
    cargando: (fila) => fila.uid === this.procesandoUid(),
  },
];
```

Los iconos de los presets y los ya usados por la tabla están registrados internamente. Un icono
adicional debe registrarse con `provideIcons()` en el componente consumidor antes de usar su nombre.

La prioridad de render es `plantillaAcciones`, luego `acciones` y finalmente el preset iconográfico
`ver`. Esto conserva `verFila` por compatibilidad sin volver al botón textual anterior.

### Menú ⋯ cuando hay muchas acciones

Si una fila tiene más acciones visibles que `maxAccionesVisibles` (2 por defecto), queda a la vista solo la **principal** y el resto pasa a un botón **⋯ Más acciones**, para que la columna fija de acciones no tape los datos:

- La principal es la que tenga `principal: true`; si ninguna lo indica, la primera que no sea destructiva.
- Las destructivas (`destructiva: true`, el preset `borrar` o un `color` con `danger`) van al final del menú, separadas y en rojo.
- El menú se dibuja en la capa superior del navegador (`popover`), así que no lo recorta el scroll de la tabla ni un popup. Abre hacia arriba si no entra abajo y se cierra al desplazar la página o la tabla, al tocar afuera o al elegir una opción.
- Teclado: al abrir, el foco va a la primera opción habilitada; ↑/↓, Inicio y Fin recorren; Escape cierra y devuelve el foco al ⋯.
- Una acción deshabilitada queda en gris y muestra `descripcionDeshabilitada` debajo del texto.

```ts
protected readonly acciones: readonly AccionTabla<CuotaFila>[] = [
  'ver',
  { id: 'cobrar', texto: 'Cobrar', icono: 'heroBanknotes', color: 'var(--app-accent)', principal: true },
  { id: 'anular', texto: 'Anular', icono: 'heroTrash', color: 'var(--semantic-danger)' },
];
```

## Fila Editable

La fila editable se activa con `tr_input` y puede usarse para:

- alta inline
- edición inline reemplazando una fila existente
- alta disparada por botón `+`
- edición con valores externos precargados
- validación visual por campo

Ejemplo:

```html
<app-tabla-responsive
  [columnas]="columnas"
  [filas]="filas"
  [tr_input]="true"
  [tr_input_conmutador]="false"
  [tr_input_boton_agregar]="true"
  [tr_input_boton_agregar_texto]="'Nuevo registro'"
  [tr_input_hold_control]="true"
  [tr_input_visible]="trInputVisible()"
  [tr_input_visible_version]="trInputVisibleVersion()"
  [tr_input_fila_editando_id]="filaEditandoId()"
  [tr_input_valores]="trInputValores()"
  [tr_input_valores_version]="trInputValoresVersion()"
  [tr_input_campos_invalidos]="camposInvalidos()"
  [tr_input_mensaje]="mensajeFormulario()"
  (trInputToggle)="onToggle($event)"
  (trInputChange)="onChange($event)"
  (trInputSubmit)="onSubmit($event)"
  (trInputReset)="onReset()"
  (trInputNuevo)="onNuevo()"
  (trInputHoldChange)="onHold($event)"
/>
```

## Carrusel De Cards En Mobile

En viewports de hasta `800px` inclusive, la tabla conserva el mismo DOM y transforma cada `tr`
en una card dentro de un carrusel horizontal. Se puede navegar con swipe, con los botones
anterior/siguiente o mediante el scroll horizontal; el contador indica la card activa.

- Se muestra una card principal y una pequeña porción de la siguiente; hasta `360px`, cada card
  ocupa el ancho completo.
- El arrastre con mouse o touch avanza como máximo una card por gesto.
- Todas las columnas siguen visibles y usan `titulo` como etiqueta dentro de la card.
- Las acciones estándar y `plantillaAcciones` quedan centradas en el footer de cada card.
- Una alta nueva mediante `tr_input` agrega una card editable al inicio del carrusel.
- Al editar, `tr_input` reemplaza visualmente la card correspondiente sin duplicar la fila.
- `tbody_rows` y `maxFilasVisibles` no limitan la altura en mobile para evitar recortar contenido.

No crear un render alternativo de cards en los consumidores: duplicaría outputs, foco, tooltips y
estado de selección. La adaptación responsive pertenece a `app-tabla-responsive`.

## Configuración De Columnas

`ColumnaTabla<T>` soporta:

| Campo                  | Tipo                                                              | Descripción                                                                                             |
| ---------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `id`                   | `keyof T & string`                                                | Clave visible de la columna.                                                                            |
| `titulo`               | `string`                                                          | Texto del encabezado.                                                                                   |
| `tipo`                 | `texto \| numero \| fecha \| moneda \| estado \| avatar \| chips` | Define render visual de la celda.                                                                       |
| `trInputTipo`          | `input \| select \| chips-multi`                                  | Tipo de control en `tr_input`.                                                                          |
| `trInputKey`           | `string`                                                          | Clave alternativa para escribir en `tr_input` cuando la columna visible no coincide con la del payload. |
| `trInputEditable`      | `boolean`                                                         | Permite bloquear edición en esa columna.                                                                |
| `inputType`            | `text \| number \| date \| time \| datetime-local`                | Tipo del input generado.                                                                                |
| `inputMode`            | `text \| numeric \| decimal \| email \| tel`                      | `inputmode` del control.                                                                                |
| `inputFormatter`       | `dni \| telefono`                                                 | Formateo en vivo para esos campos.                                                                      |
| `maxLength`            | `number`                                                          | Límite máximo de caracteres.                                                                            |
| `min`                  | `string \| number`                                                | Valor mínimo nativo.                                                                                    |
| `max`                  | `string \| number`                                                | Valor máximo nativo.                                                                                    |
| `pattern`              | `string`                                                          | Patrón HTML nativo.                                                                                     |
| `opciones`             | `readonly OpcionInputTabla[]`                                     | Opciones para `select` o `chips-multi`.                                                                 |
| `prioridadMobile`      | `boolean`                                                         | **@deprecated** — sin efecto en render; reservado por compatibilidad.                                   |
| `ancho`                | `string`                                                          | Columna CSS para el grid interno.                                                                       |
| `avatarIniciales`      | `(fila: T) => string`                                             | Override de iniciales en columnas `avatar` (default: `nombre` + `apellido`).                            |
| `avatarNombre`         | `(fila: T) => string`                                             | Override del nombre visible en `avatar`.                                                                |
| `estadoClase`          | `(valor, fila) => string \| null`                                 | Override de clase CSS en columnas `estado`.                                                             |
| `estadoTexto`          | `(valor, fila) => string`                                         | Override del texto mostrado en `estado`, incluso cuando el valor es `null` o `undefined`.                |
| `celdaColor`           | `(valor, fila) => string \| null`                                 | Override de color inline (default automático en columna `monto`).                                       |
| `chipClase`            | `(item, fila) => string \| null`                                  | Override de clases en chips (default automático en `cuposDisponibles`).                                 |
| `trInputAutocompletar` | `(valores, ctx) => void`                                          | Hook post-edición en `tr_input` (ej. `horaInicio` → `horaFin`).                                         |

## Inputs

### Base

| Input                  | Tipo                                    | Default                            | Descripción                                                                                |
| ---------------------- | --------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------ |
| `columnas`             | `readonly ColumnaTabla<T>[]`            | `[]`                               | Configuración de columnas.                                                                 |
| `filas`                | `readonly T[]`                          | `[]`                               | Filas a renderizar.                                                                        |
| `filaClase`            | `((fila: T) => string \| null) \| null` | `null`                             | Clase semántica opcional calculada por fila, sin acoplar la tabla al dominio consumidor.   |
| `cargando`             | `boolean`                               | `false`                            | Muestra `load-spinner-blue` centrado y conserva el alto definido por `tbody_rows`.          |
| `altoRendimiento`      | `boolean`                               | `false`                            | Modo ligero: desactiva tooltips interactivos, animaciones y transiciones costosas.         |
| `max_altura`           | `string \| null`                       | `null`                             | Límite CSS opcional; al definirse, habilita scroll vertical dentro de la tabla.             |
| `idFila`               | `keyof T & string`                      | `'uid'`                            | Clave usada como track/id de fila.                                                         |
| `mensajeVacio`         | `string`                                | `'No hay registros para mostrar.'` | Texto del estado vacío.                                                                    |
| `vacio_reservar_filas` | `boolean`                               | `true`                             | Reserva alto del tbody cuando está vacío y hay `tbody_rows` configurado.                   |
| `plantillaAcciones`    | `TemplateRef<{ $implicit: T }> \| null` | `null`                             | Template custom para la celda de acciones.                                                 |
| `acciones`             | `readonly AccionTabla<T>[]`             | `[]`                               | Presets o acciones personalizadas renderizadas como botones con icono.                     |
| `mostrarAcciones`      | `boolean`                               | `true`                             | Muestra u oculta la columna de acciones.                                                   |
| `tituloAcciones`       | `string`                                | `'Acciones'`                       | Personaliza el encabezado de la columna de acciones o selección.                           |
| `maxAccionesVisibles`  | `number`                                | `2`                                | Acciones que se muestran como botones; si hay más, la principal queda a la vista y el resto va al menú ⋯. |
| `tbody_rows`           | `number \| null`                        | `null`                             | Reserva el alto visual equivalente a esa cantidad de filas y habilita scroll al superarlo. |
| `maxFilasVisibles`     | `number \| null`                        | `null`                             | Alias legado. Se mantiene por compatibilidad; conviene preferir `tbody_rows`.              |

### `tr_input`

| Input                          | Tipo                                       | Default         | Descripción                                                        |
| ------------------------------ | ------------------------------------------ | --------------- | ------------------------------------------------------------------ |
| `tr_input`                     | `boolean`                                  | `false`         | Habilita la fila editable superior.                                |
| `tr_input_conmutador`          | `boolean`                                  | `true`          | Muestra el switch interno de mostrar/ocultar.                      |
| `tr_input_boton_agregar`       | `boolean`                                  | `false`         | Muestra el botón `+`.                                              |
| `tr_input_boton_agregar_modo`  | `'abrir-input' \| 'emitir'`                | `'abrir-input'` | Define si el `+` abre la fila interna o solo emite `trInputNuevo`. |
| `tr_input_boton_agregar_texto` | `string`                                   | `''`            | Texto opcional junto al botón `+`.                                 |
| `accionesCabecera`             | `readonly AccionCabeceraTabla[]`           | `[]`            | Acciones adicionales con texto y botón `+` en la cabecera.         |
| `tr_input_mensaje`             | `string`                                   | `''`            | Feedback nativo del toolbar, del lado izquierdo.                   |
| `tr_input_hold_control`        | `boolean`                                  | `false`         | Muestra el control `HOLD`.                                         |
| `tr_input_hold_label`          | `string`                                   | `'HOLD'`        | Etiqueta del control `HOLD`.                                       |
| `tr_input_visible_inicial`     | `boolean`                                  | `false`         | Estado inicial local de visibilidad.                               |
| `tr_input_visible`             | `boolean \| null`                          | `null`          | Control externo de visibilidad.                                    |
| `tr_input_visible_version`     | `number`                                   | `0`             | Fuerza resincronización del estado visible.                        |
| `tr_input_reset_version`       | `number`                                   | `0`             | Fuerza reset externo del formulario inline.                        |
| `tr_input_fila_editando_id`    | `string \| null`                           | `null`          | Id de la fila que debe ser reemplazada por la fila editable.       |
| `tr_input_valores`             | `Partial<Record<string, ValorInputTabla>>` | `{}`            | Valores externos para precargar la fila editable.                  |
| `tr_input_valores_version`     | `number`                                   | `0`             | Fuerza recarga externa de valores.                                 |
| `tr_input_campos_invalidos`    | `readonly string[]`                        | `[]`            | Lista de claves a marcar como inválidas.                           |

### Filtro Temporal

| Input                        | Tipo                      | Default | Descripción                           |
| ---------------------------- | ------------------------- | ------- | ------------------------------------- |
| `input_filtro_tiempo`        | `boolean`                 | `false` | Muestra footer con filtro de año/mes. |
| `filtro_tiempo_anio`         | `string \| number`        | `''`    | Valor actual del año.                 |
| `filtro_tiempo_mes`          | `string`                  | `''`    | Valor actual del mes.                 |
| `filtro_tiempo_opciones_mes` | `readonly SelectOption[]` | `[]`    | Opciones del selector de mes.         |

## Outputs

| Output                   | Descripción                                                                                                             |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `verFila`                | Emite la fila seleccionada cuando no se usa template de acciones propio.                                                |
| `accionFila`             | Emite `EventoAccionTabla<T>` (`{ accion: string; fila: T }`) al seleccionar una acción configurada mediante `acciones`. |
| `accionCabecera`         | Emite el `id` de una acción adicional de cabecera.                                                                      |
| `trInputToggle`          | Emite cuando cambia la visibilidad del `tr_input`.                                                                      |
| `trInputChange`          | Emite cada cambio de la fila editable.                                                                                  |
| `trInputSubmit`          | Emite confirmación del `tr_input`.                                                                                      |
| `trInputReset`           | Emite al restablecer la fila editable.                                                                                  |
| `trInputNuevo`           | Emite al usar el botón `+`.                                                                                             |
| `trInputHoldChange`      | Emite el estado actual del `HOLD`.                                                                                      |
| `filtroTiempoAnioChange` | Emite cambios del campo año.                                                                                            |
| `filtroTiempoMesChange`  | Emite cambios del selector mes.                                                                                         |
| `filtroTiempoAplicar`    | Emite al confirmar el filtro temporal.                                                                                  |
| `filtroTiempoReset`      | Emite al resetear el filtro temporal.                                                                                   |

## Formatos Y Comportamientos Incluidos

- moneda con formateo visual
- fecha con botón de calendario custom
- hora (`time`) con picker nativo
- fecha y hora (`datetime-local`) con picker nativo
- DNI con máscara visual
- teléfono con máscara visual
- `chips-multi` para selección múltiple inline
- tooltips por celda en modo lectura (omitidos con `[altoRendimiento]="true"`)
- cierre automático de tooltips de celdas y acciones ante scroll del viewport o de cualquier contenedor

## Helpers reutilizables

La lógica de dominio por convención vive en `src/app/helpers/` y el componente la usa por defecto cuando no hay hook en la columna:

| Helper                           | Uso por convención                                            |
| -------------------------------- | ------------------------------------------------------------- |
| `tabla-avatar-nombre.helpers.ts` | Iniciales y nombre desde `nombre` + `apellido`.               |
| `tabla-estado.helpers.ts`        | Estados MOROSO, PRESENTE, DEBE, etc.                          |
| `tabla-monto-color.helpers.ts`   | Color de texto en columna `monto`.                            |
| `tabla-chip-cupo.helpers.ts`     | Variantes danger/warning/success en `cuposDisponibles`.       |
| `tabla-hora-fin.helpers.ts`      | Autocompletar `horaFin` al editar `horaInicio` en `tr_input`. |

Ejemplo de override por columna:

```ts
{
  id: 'estado',
  titulo: 'Estado',
  tipo: 'estado',
  estadoTexto: (valor) => String(valor).toUpperCase(),
  estadoClase: (valor) => (valor === 'CUSTOM' ? 'tabla-responsive__estado--moroso' : null),
}
```

Si el hook devuelve `null`, el componente cae al helper por convención de `id` / `tipo`.

## Extensión por app

Para un template clonable:

1. **Reutilizar helpers** cuando la convención de datos coincide (`monto`, `cuposDisponibles`, `nombre`/`apellido`).
2. **Usar hooks** en `ColumnaTabla` cuando el dominio difiere sin tocar el componente.
3. **Usar `filaClase`** para estados visuales de toda la fila; `tabla-responsive__fila--peligro` aplica un fondo rojo suave.
4. **Activar `[altoRendimiento]="true"`** en listados largos o vistas con muchas tablas simultáneas.
5. **Copiar un helper** a `src/app/helpers/` y ajustarlo si necesitás reglas nuevas compartidas entre pantallas.

## Notas De Uso

- Si una columna visible no coincide con la clave del payload, usar `trInputKey`.
- Para filas derivadas, conviene dejar la columna visible y escribir en otra clave interna. Ejemplo: `actividad` visible + `actividadUuid` como `trInputKey`.
- `tr_input_campos_invalidos` acepta tanto `id` de columna como `trInputKey`.
- Si el `+` debe abrir un popup externo, usar `tr_input_boton_agregar_modo="emitir"` y escuchar `trInputNuevo`.
- No usar SVG crudo ni valores provenientes del backend como `icono`; registrar iconos conocidos mediante `provideIcons()`.
- No usar colores hex en acciones personalizadas; usar tokens como `var(--app-accent)` o `var(--semantic-danger)`.

## Qué no hacer

- No usar `plantillaAcciones` para combinaciones cubiertas por `acciones`; reservar el template como escape hatch para contenido especial.
- No incluir callbacks de negocio dentro de una acción. Escuchar `accionFila` y resolver la operación en el componente consumidor.
- No esconder el texto accesible: cada acción necesita `texto`, porque alimenta tanto el `aria-label` como la etiqueta flotante.

## Relación con el sistema de diseño

Los botones reutilizan `app-boton`, los iconos registrados con `@ng-icons/core` y los tokens
`--app-accent`, `--app-surface`, `--app-text`, `--semantic-success`, `--semantic-warning` y
`--semantic-danger`. Las variantes responden automáticamente al tema claro u oscuro. Las acciones
personalizadas deben recibir un token CSS en `color`; no se agregan colores de dominio dentro de la tabla.
El modificador de estado `tabla-responsive__estado--denegado` usa el tono de peligro para representar
resultados rechazados sin reutilizar estados de otro dominio.

## Limpieza Aplicada

En la revisión actual se extrajo lógica de dominio a helpers, se añadieron hooks opcionales en `ColumnaTabla`, modo `altoRendimiento` y tokens SCSS para estados/chips. El render del tooltip vive en `tabla-responsive-tooltip.renderer.ts`.

Se eliminaron previamente:

- import muerto de `normalizarValorMoneda`
- helper interno sin uso `obtenerOpcionesSeleccionadas`

Se mantuvieron por compatibilidad:

- `maxFilasVisibles`
- `prioridadMobile`
