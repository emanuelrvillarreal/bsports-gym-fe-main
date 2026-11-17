# Toast Alert

`app-toast-alert` muestra alertas flotantes, mensajes cortos o confirmaciones.

## Uso Basico

```html
<app-toast-alert
  titulo="Guardado"
  subtitulo="Operacion correcta"
  texto="Los cambios fueron aplicados."
/>
```

## Uso Como Confirmacion

```html
<app-toast-alert
  titulo="Eliminar registro"
  texto="Esta accion no se puede deshacer."
  [confirmacion]="true"
  [duracionMs]="0"
  posicion="centrada"
  (confirmada)="confirmar()"
  (cancelada)="cancelar()"
/>
```

Desde un componente de logica, las eliminaciones irreversibles deben usar el servicio antes de
llamar a la API:

```ts
const confirmado = await this.toastAlert.confirmDanger(
  'El registro se eliminara. Esta accion no se puede deshacer.',
  { titulo: 'Eliminar registro', textoConfirmar: 'Eliminar' },
);

if (!confirmado) return;
this.recursoApi.eliminar(uuid).subscribe();
```

El toast final de exito o error puede centralizarse en el interceptor mediante el contexto HTTP;
no se debe duplicar manualmente en el componente.

Para un aviso de seguimiento que no debe reemplazar el toast HTTP activo, usar
`toastAlertService.encolarInfo(...)`; se mostrará cuando finalice el anterior.

Al confirmar o cancelar, el componente inicia su cierre antes de emitir el evento. Esto evita que
un cierre pendiente de una alerta anterior interfiera con una confirmación posterior.

El contenedor se vuelve a promover a la capa superior cuando el host reemplaza un toast
informativo por una confirmación. Esto permite encadenar confirmaciones sobre popups nativos sin
que el diálogo quede oculto detrás de su fondo.

## Alcance

Pensado para:

- feedback corto
- confirmaciones
- alertas destacadas
- mensajes de cierre automatico o manual

## Inputs

| Input            | Tipo                                    | Default                   | Descripcion                                                    |
| ---------------- | --------------------------------------- | ------------------------- | -------------------------------------------------------------- |
| `variante`       | `'compacto' \| 'normal'`                | `'normal'`                | Tamano visual del toast.                                       |
| `confirmacion`   | `boolean`                               | `false`                   | Muestra botones de confirmar/cancelar.                         |
| `duracionMs`     | `number`                                | `5000`                    | Duracion del cierre automatico. `0` lo deja abierto.           |
| `fondoPeligro`   | `boolean`                               | `false`                   | Activa fondo y paleta de peligro.                              |
| `posicion`       | `'centrada' \| 'inferior' \| 'lateral'` | `'inferior'`              | Ubicacion en pantalla.                                         |
| `performance`    | `boolean`                               | `false`                   | Desactiva animaciones de entrada/salida y simplifica progreso. |
| `icono`          | `string`                                | `'heroInformationCircle'` | Icono visible.                                                 |
| `titulo`         | `string`                                | `''`                      | Titulo principal.                                              |
| `subtitulo`      | `string`                                | `''`                      | Texto superior opcional.                                       |
| `texto`          | `string`                                | `''`                      | Mensaje principal.                                             |
| `textoConfirmar` | `string`                                | `'Confirmar'`             | Texto del boton primario.                                      |
| `textoCancelar`  | `string`                                | `'Cancelar'`              | Texto del boton secundario.                                    |

## Outputs

| Output       | Descripcion                     |
| ------------ | ------------------------------- |
| `cerrada`    | Se emite al terminar de cerrar. |
| `confirmada` | Se emite al confirmar.          |
| `cancelada`  | Se emite al cancelar.           |

## Impacto En El Sistema

Consume:

- `--app-surface`
- `--app-surface-border`
- `--app-text`
- `--app-text-soft`
- `--app-accent`
- `--app-warning`
- `--app-danger`

## Relacion Con Performance

Es el componente mas alineado hoy con el modo performance del template:

- desactiva animaciones visuales
- simplifica la barra de progreso
- reduce el tiempo de cierre final
