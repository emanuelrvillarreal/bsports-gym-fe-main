# Page Loading Shell

`app-page-loading-shell` es un wrapper de carga para paginas o bloques grandes.

## Uso

```html
<app-page-loading-shell [cargando]="cargando()">
  <section>Contenido real</section>
</app-page-loading-shell>
```

## Alcance

Pensado para:

- cargas iniciales de pagina
- cargas de paneles completos
- shells simples con spinner central

## Inputs

| Input       | Tipo      | Default                  | Descripcion                                       |
| ----------- | --------- | ------------------------ | ------------------------------------------------- |
| `cargando`  | `boolean` | `false`                  | Si es `true`, muestra spinner y oculta contenido. |
| `minHeight` | `string`  | `'calc(100dvh - 10rem)'` | Altura minima del area de carga.                  |

## Outputs

No emite eventos.

## Contenido

Renderiza contenido via `ng-content` cuando `cargando` es `false`.

## Impacto En El Sistema

Usa internamente `app-load-spinner`.

Visualmente toma color del sistema a traves del spinner y del fondo donde se lo monte.

## Relacion Con Performance

Es un componente liviano. No tiene logica compleja propia.
