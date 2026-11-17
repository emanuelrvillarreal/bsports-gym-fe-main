# Carrusel Fade

`app-carrusel-fade` muestra un único item a la vez y alterna entre items con una transición breve de opacidad.

## Uso básico

```html
<app-carrusel-fade [items]="personas" altura="20rem">
  <ng-template appCarruselFadeItem let-persona>
    <article>{{ persona.nombre }}</article>
  </ng-template>
</app-carrusel-fade>
```

## Inputs

| Input                             | Tipo           | Default    | Descripción                                                                   |
| --------------------------------- | -------------- | ---------- | ----------------------------------------------------------------------------- |
| `items`                           | `readonly T[]` | `[]`       | Colección de elementos a mostrar.                                             |
| `cargando`                        | `boolean`      | `false`    | Muestra el `app-load-spinner-blue` dentro del viewport sin alterar su altura. |
| `ariaLabel`                       | `string`       | `Carrusel` | Etiqueta accesible del carrusel.                                              |
| `titulo`                          | `string`       | `''`       | Título opcional dentro del viewport.                                          |
| `altura`                          | `string`       | `20rem`    | Altura del viewport.                                                          |
| `alturaAutomatica`                | `boolean`      | `false`    | Usa `altura` como mínimo y permite que el item activo expanda el viewport.    |
| `autoplay`                        | `boolean`      | `false`    | Avanza automáticamente entre items.                                           |
| `autoplayMs`                      | `number`       | `5000`     | Intervalo de autoplay.                                                        |
| `mostrarControles`                | `boolean`      | `true`     | Muestra flechas anterior/siguiente.                                           |
| `navegacionMovilPorDeslizamiento` | `boolean`      | `false`    | En teléfonos oculta las flechas y permite navegar mediante swipe horizontal.  |
| `duracionTransicionMs`            | `number`       | `320`      | Duración de la transición de opacidad.                                        |

## Outputs

| Output             | Payload  | Descripción                              |
| ------------------ | -------- | ---------------------------------------- |
| `cambioIndice`     | `number` | Se emite al cambiar el item activo.      |
| `itemSeleccionado` | `T`      | Se emite al seleccionar el item visible. |

## Qué no hacer

- No usarlo para listas largas: muestra un item por vez y está pensado para colecciones cortas.
- No incluir transiciones costosas dentro del template proyectado; el componente ya anima la opacidad.

## Relación con el sistema de diseño

Usa `--app-surface`, `--app-surface-border`, `--app-text-soft` y `--app-accent`; responde automáticamente al tema activo.

## Notas técnicas

Solo conserva temporalmente el item saliente durante la transición. La animación usa únicamente `opacity`, que el navegador compone eficientemente.
