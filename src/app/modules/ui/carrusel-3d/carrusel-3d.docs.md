# Carrusel 3D

Carrusel con perspectiva 3D y fallback plano en mobile o modo performance.

## Uso

```html
<app-carrusel-3d
  [items]="items"
  [altoRendimiento]="modoPerformance()"
  (itemSeleccionado)="seleccionar($event)"
>
  <ng-template appCarrusel3dItem let-item>
    <article>{{ item.titulo }}</article>
  </ng-template>
</app-carrusel-3d>
```

## Inputs principales

| Input              | Default      | Descripción                     |
| ------------------ | ------------ | ------------------------------- |
| `items`            | `[]`         | Colección a recorrer            |
| `altoRendimiento`  | `false`      | Desactiva autoplay y efectos 3D |
| `autoplay`         | `false`      | Rotación automática             |
| `modoMovil`        | `'fallback'` | `'fallback'` o `'three-d'`      |
| `mostrarControles` | `false`      | Flechas prev/next               |

## Outputs

- `cambioIndice`
- `itemSeleccionado`

## Performance

Componente costoso en GPU. Usar `[altoRendimiento]="true"` o `modoMovil="fallback"` en rutas Lighthouse críticas.

Directiva requerida: `Carrusel3dItemDirective` (`appCarrusel3dItem`).

En modo 3D se montan únicamente la slide activa y sus vecinas inmediatas. Los indicadores
continúan representando todos los elementos y la ventana visible cambia al navegar.
