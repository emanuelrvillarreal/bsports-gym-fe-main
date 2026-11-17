# PopupComponent

`app-popup` muestra formularios o confirmaciones en un diálogo modal reutilizable que solo puede
cerrarse mediante su botón explícito `Cancelar` o cambiando el input `abierto` tras una operación exitosa.

## Uso básico

```ts
protected readonly popupAbierto = signal(false);
protected readonly guardando = signal(false);
```

```html
<app-popup
  [abierto]="popupAbierto()"
  titulo="Nueva actividad"
  descripcion="Completá los datos obligatorios."
  [cancelarDeshabilitado]="guardando()"
  (cancelar)="popupAbierto.set(false)"
>
  <label>
    <span>Nombre</span>
    <input type="text" />
  </label>

  <app-boton popupAcciones tipo="button" [cargando]="guardando()" (accion)="guardar()">
    Guardar
  </app-boton>
</app-popup>
```

## Inputs

| Input                   | Tipo                                 | Default      | Descripción                                             |
| ----------------------- | ------------------------------------ | ------------ | ------------------------------------------------------- |
| `abierto`               | `boolean`                            | `false`      | Abre o cierra programáticamente el diálogo.             |
| `titulo`                | `string`                             | Requerido    | Título accesible del popup.                             |
| `descripcion`           | `string`                             | `''`         | Contexto opcional asociado mediante `aria-describedby`. |
| `ancho`                 | `'pequeno' \| 'mediano' \| 'grande'` | `'mediano'`  | Ancho máximo del panel.                                 |
| `textoCancelar`         | `string`                             | `'Cancelar'` | Etiqueta del cierre explícito.                          |
| `aparienciaCancelar`    | `'solido' \| 'texto'`                | `'texto'`    | Apariencia del botón de cierre.                         |
| `cancelarDeshabilitado` | `boolean`                            | `false`      | Bloquea Cancelar mientras hay una operación en curso.   |

## Outputs

| Output     | Payload | Descripción                                                 |
| ---------- | ------- | ----------------------------------------------------------- |
| `cancelar` | `void`  | Se emite únicamente al pulsar el botón Cancelar habilitado. |

## Variantes / Casos de uso avanzados

El contenido principal se proyecta normalmente. Los controles de confirmación con el atributo
`popupAcciones` se ubican en el footer, junto a Cancelar.

El popup usa `<dialog>.showModal()`: el navegador mantiene el foco dentro del diálogo e inhabilita
el contenido exterior. El componente también bloquea el scroll del `body` y restaura el foco al
elemento que abrió el popup.

## Qué no hacer

- No agregar botones `X` ni listeners de click al backdrop: el contrato exige cancelación explícita.
- No cerrar con Escape. El componente previene el evento `cancel` nativo.
- No proyectar SVG o HTML proveniente del backend dentro del encabezado.

## Relación con el sistema de diseño

Consume `--app-surface`, `--app-surface-strong`, `--app-surface-border`, `--app-text`,
`--app-text-soft` y `--app-bg`. Reutiliza `app-boton` para Cancelar y responde automáticamente a
los temas claro y oscuro. En móvil ocupa casi todo el viewport y apila las acciones.

## Notas técnicas

El padre conserva el estado y decide cuándo cambiar `abierto` a `false`. Guardados exitosos pueden
cerrarlo programáticamente; los errores deben mantenerlo abierto. No usar `form method="dialog"`,
porque cerraría el popup sin pasar por el flujo controlado.
