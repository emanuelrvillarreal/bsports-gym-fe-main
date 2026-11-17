# Select

`app-select` reemplaza al `select` nativo cuando se busca una apariencia consistente con el tema del template y compatibilidad con formularios Angular.

## Uso Con Valor Simple

```ts
protected readonly opcionesEstado = [
  { value: 'todos', label: 'Todos' },
  { value: 'al-dia', label: 'Al dia' },
  { value: 'debe', label: 'Pendientes' },
];
```

```html
<app-select
  [opciones]="opcionesEstado"
  [value]="filtroEstado()"
  (valueChange)="actualizarFiltro($event)"
/>
```

## Uso Con Reactive Forms

```html
<app-select formControlName="instalacion" [opciones]="opcionesInstalacion" />
```

## Alcance

Pensado para:

- filtros
- formularios
- selects visualmente alineados al template

## Inputs

| Input             | Tipo                      | Default         | Descripcion                                                         |
| ----------------- | ------------------------- | --------------- | ------------------------------------------------------------------- |
| `opciones`        | `readonly SelectOption[]` | `[]`            | Lista de opciones visibles.                                         |
| `placeholder`     | `string`                  | `'Seleccionar'` | Texto cuando no hay valor.                                          |
| `etiqueta`        | `string`                  | `''`            | Label superior opcional.                                            |
| `value`           | `string`                  | `''`            | Valor para uso fuera de forms.                                      |
| `deshabilitado`   | `boolean`                 | `false`         | Bloquea el control y evita abrir el panel de opciones.              |
| `altoRendimiento` | `boolean`                 | `false`         | Omite animación de seguimiento del panel (posicionamiento directo). |

## Outputs

| Output        | Descripcion                  |
| ------------- | ---------------------------- |
| `valueChange` | Emite el valor seleccionado. |

## Modelo

```ts
export interface SelectOption {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}
```

## Integracion Con Forms

Implementa `ControlValueAccessor`, por eso funciona con:

- `formControlName`
- `formControl`
- binding simple por `value`

## Impacto En El Sistema

Consume tokens visuales globales del template como acentos, superficie, borde y texto.

## Relacion Con Performance

Expone `[altoRendimiento]="true"` para omitir el seguimiento del panel con `requestAnimationFrame` (posicionamiento inmediato). Aplica la clase `app-select--alto-rendimiento` en el host.

En rutas críticas o con `PerformanceModeService` activo, conviene pasarlo desde el padre o usar el toggle global del template.

## Integracion con validacion de formularios

El boton de control expone `data-app-form-control` para que `appValidacionFormulario` pueda
marcarlo, desplazar la vista y llevarle el foco cuando una regla requerida no se cumple.
Al elegir una opcion tambien emite un evento DOM `change` burbujeante para actualizar el feedback
del formulario que lo contiene.

## Uso En Popups

El panel se monta en `body` en vistas normales y dentro del `dialog` más cercano cuando el select se usa en un popup modal. Así permanece en la misma capa superior y no queda oculto detrás del backdrop.
