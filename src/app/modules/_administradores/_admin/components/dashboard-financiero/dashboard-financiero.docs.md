# Dashboard financiero

`app-dashboard-financiero` coordina el resumen de Tesorería para el dashboard de `ADMIN`.

## Uso básico

```html
<app-dashboard-financiero />
```

El componente carga el balance actual, el histórico disponible, movimientos recientes y cuotas pendientes mediante `TesoreriaApiService`.

## API pública

No expone inputs ni outputs. La page anfitriona puede usar `periodosDisponibles()`, `periodoSeleccionado()`, `seleccionarPeriodo()` y `restablecerPeriodo()` mediante una referencia al componente para conectarlo con el hero visual.

## Qué no hacer

- No invocar endpoints de Tesorería desde la page; el contenedor concentra carga, errores y reintentos.
- No crear cards o gráficos alternativos: reutiliza `app-cards-hero`, `app-card` y `app-grafico-barras`.

## Relación con el sistema de diseño

Las métricas, paneles y gráfico responden a los tokens de superficie, acento y estados semánticos del tema activo.

## Notas técnicas

El histórico publicado por backend no permite filtrar por un período puntual; el selector ofrece únicamente el mes actual y los períodos incluidos en la respuesta histórica. La comparativa busca el mismo mes del año anterior. El contador de cuotas pendientes es total porque ese contrato no admite filtrar por período.
