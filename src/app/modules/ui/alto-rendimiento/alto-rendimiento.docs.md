# Alto rendimiento

Panel de configuración del modo performance global (`PerformanceModeService`).

## Uso

```html
<app-alto-rendimiento />
```

## Comportamiento

- Toggle que persiste preferencia en `localStorage`
- Setea `data-ui-high-performance="true"` en `<html>` cuando los efectos visuales están activos
- Los componentes UI leen `[altoRendimiento]` o consultan el servicio para reducir animaciones

## Integración en pages

```typescript
private readonly performanceMode = inject(PerformanceModeService);

protected readonly altoRendimiento = computed(() => !this.performanceMode.desactivado());
```

```html
<app-grafico-barras [altoRendimiento]="altoRendimiento()" />
```

## Cuándo usar input vs servicio

| Enfoque                                          | Cuándo                                                         |
| ------------------------------------------------ | -------------------------------------------------------------- |
| `PerformanceModeService` + `computed` en la page | Propagar el toggle global a varios hijos                       |
| `[altoRendimiento]="true"` fijo                  | Vista crítica (tabla larga, carrusel) independiente del toggle |
| `page-loading-shell`                             | Lee servicio automáticamente si no pasás input                 |

Convención: `altoRendimiento === true` desactiva animaciones costosas; el servicio expone `desactivado()` donde `false` significa performance ON (`data-ui-high-performance`).

## Objetivo Lighthouse

Como referencia de producto, el modo performance apunta a un score mobile mayor o igual a 80 y el modo normal a uno mayor o igual a 70. Volver a medir estos objetivos cuando cambien rutas críticas, assets o animaciones globales.
