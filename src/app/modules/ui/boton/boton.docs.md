# Boton

`app-boton` reemplaza al `button` nativo cuando se necesita una apariencia reutilizable, contraste automatico y estado de carga integrado con el spinner Blue.

## Uso basico

```ts
import { BotonComponent } from './modules/ui/boton/boton.component';

@Component({
  imports: [BotonComponent],
})
export class EjemploComponent {
  protected guardar(): void {
    // Ejecutar la accion de la vista.
  }
}
```

```html
<app-boton (accion)="guardar()">Guardar</app-boton>
```

## Inputs

| Input              | Tipo                        | Default      | Descripcion                                                                                     |
| ------------------ | --------------------------- | ------------ | ----------------------------------------------------------------------------------------------- |
| `tipo`             | `BotonTipo`                 | `'button'`   | Tipo del boton nativo interno: `'button'`, `'submit'` o `'reset'`.                              |
| `form`             | `string \| null`            | `null`       | Id del formulario asociado cuando el boton se renderiza fuera del `<form>`.                     |
| `apariencia`       | `BotonApariencia`           | `'solido'`   | Presentacion del boton: `'solido'` o `'texto'`.                                                 |
| `soloIcono`        | `boolean`                   | `false`      | Aplica dimensiones cuadradas cuando el contenido es solamente un icono.                         |
| `contenidoVertical`| `boolean`                   | `false`      | Apila verticalmente el contenido proyectado dentro del botón.                                   |
| `colorPaleta`      | `ColorPaletaBoton`          | `'primario'` | Color de empresa usado por el botón: `primario`, `secundario` o `terciario`.                     |
| `colorFondo`       | `string \| null`            | `null`       | Color CSS explícito del fondo; tiene prioridad sobre `colorPaleta`.                              |
| `colorInteraccion` | `string \| null`            | `null`       | Color CSS explícito para hover y press; si falta, se deriva del fondo.                           |
| `deshabilitado`    | `boolean`                   | `false`      | Impide la interaccion con el boton.                                                             |
| `cargando`         | `boolean`                   | `false`      | Bloquea el boton, conserva sus dimensiones y reemplaza visualmente el contenido por el spinner. |
| `aria-label`       | `string \| null`            | `null`       | Nombre accesible del boton interno, obligatorio cuando solo contiene un icono.                  |
| `aria-expanded`    | `boolean \| string \| null` | `null`       | Estado expandido que se reenvia al boton nativo.                                                |
| `aria-haspopup`    | `string \| null`            | `null`       | Tipo de popup controlado por el boton.                                                          |
| `aria-checked`     | `boolean \| null`           | `null`       | Estado de seleccion para botones con rol `switch`.                                              |
| `aria-selected`    | `boolean \| null`           | `null`       | Estado seleccionado para botones con rol `option` o `tab`.                                      |
| `role`             | `string \| null`            | `null`       | Rol ARIA opcional que se reenvia al boton nativo.                                               |
| `ariaLabelCarga`   | `string`                    | `'Cargando'` | Descripcion accesible que recibe el spinner durante la carga.                                   |

## Outputs

| Output   | Payload      | Descripcion                                                            |
| -------- | ------------ | ---------------------------------------------------------------------- |
| `accion` | `MouseEvent` | Se emite al activar el boton cuando no esta deshabilitado ni cargando. |
| `blur`   | `FocusEvent` | Se emite cuando el boton nativo interno pierde el foco.                |

## Variantes / Casos de uso avanzados

### Colores personalizados y carga

```html
<app-boton
  colorFondo="#F5C542"
  colorInteraccion="#D7A900"
  [cargando]="guardando()"
  ariaLabelCarga="Guardando cambios"
  (accion)="guardar()"
>
  Guardar cambios
</app-boton>

<app-boton colorPaleta="secundario">Acción secundaria</app-boton>
<app-boton colorPaleta="terciario">Acción terciaria</app-boton>
```

### En un formulario

```html
<form (ngSubmit)="guardar()">
  <app-boton tipo="submit" [deshabilitado]="formulario.invalid" [cargando]="guardando()">
    Confirmar
  </app-boton>
</form>
```

Si el boton vive en el pie de un popup, asociarlo al formulario por id:

```html
<form id="formulario-actividad" (ngSubmit)="guardar()"></form>
<app-boton tipo="submit" form="formulario-actividad">Guardar</app-boton>
```

### Accion de texto o icon-only

```html
<app-boton apariencia="texto" (accion)="cancelar()">Cancelar</app-boton>

<app-boton apariencia="texto" [soloIcono]="true" aria-label="Cerrar" (accion)="cerrar()">
  <ng-icon name="heroXMark" />
</app-boton>
```

## Que no hacer

- No agregar otro spinner dentro del contenido: usar `cargando`, que ya integra `app-load-spinner-blue` y bloquea interacciones duplicadas.
- No calcular manualmente el color del texto en cada consumidor: el componente usa `obtenerColorTextoContraste` para los estados normal e interactivo.
- No usar `(click)` sobre un elemento interno proyectado: escuchar `(accion)` en `app-boton` para respetar los estados bloqueados.

## Relacion con el sistema de diseno

El componente toma por defecto el color primario del motor de branding y usa `#009FE3` como respaldo. Define tokens locales para fondo, interacción, texto, borde, padding, radio, sombra y animación. Los estilos visuales deben configurarse mediante inputs o tokens; el host `<app-boton>` se usa solamente para layout.

Los colores con transparencia se componen sobre una base clara u oscura segun `ThemeModeService`, por lo que el texto y el gradiente del spinner responden al dark mode. El spinner usa como extremos del gradiente los colores de texto calculados para reposo e interaccion.

## Notas tecnicas

- El contenido permanece oculto, pero conserva espacio, mientras se muestra el spinner. Esto evita cambios de ancho durante una operacion asincronica.
- El spinner mide `1.5em` de ancho; por su proporcion interna resulta de aproximadamente `1em` de alto, igual al tamano tipografico heredado por el boton.
- `cargando` tiene prioridad sobre `deshabilitado` para mostrar el cursor de espera sin reducir la opacidad del spinner.
- `enfocar()` y `obtenerElementoNativo()` permiten integrar controles compuestos que necesitan administrar foco o posicionamiento, como `app-select`.
