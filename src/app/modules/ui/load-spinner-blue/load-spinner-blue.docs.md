# Load Spinner Blue

Spinner SVG animado basado en el logo Blue. Es responsive al contenedor padre: ocupa `width: 100%` y mantiene su proporcion interna con `aspect-ratio`.

## Uso basico

```html
<app-load-spinner-blue />
```

## Personalizar duracion

```html
<app-load-spinner-blue duracion="1.2s" />
```

## Personalizar colores

```html
<app-load-spinner-blue colorInicio="var(--semantic-success)" colorFin="var(--semantic-info)" />
```

## Props

| Prop          | Tipo     | Default      | Descripcion                                                                             |
| ------------- | -------- | ------------ | --------------------------------------------------------------------------------------- |
| `duracion`    | `string` | `'1.65s'`    | Duracion total del ciclo de animacion. Acepta valores CSS como `1s`, `1500ms` o `2.4s`. |
| `ariaLabel`   | `string` | `'Cargando'` | Texto accesible para describir el spinner.                                              |
| `colorInicio` | `string \| null` | `null` | Color inicial explícito. Si falta, usa el primario y luego `#009FE3`.                   |
| `colorFin`    | `string \| null` | `null` | Color final explícito. Si falta, usa el secundario y luego `#2F52A0`.                   |

## Notas

- La paleta activa se obtiene de `ColorThemeService` y se actualiza de forma reactiva.
- Los colores explícitos tienen prioridad; `app-boton` los usa para mantener contraste sobre fondos sólidos.
- No usa JavaScript por frame; la animacion es CSS sobre trazos SVG.
- El tamano se controla desde el contenedor padre.
