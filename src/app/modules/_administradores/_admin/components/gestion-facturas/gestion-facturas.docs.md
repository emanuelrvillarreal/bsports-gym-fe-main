# GestionFacturasComponent

`app-gestion-facturas` coordina el listado, filtro, detalle y pago de las facturas CRM de la empresa activa.

## Uso básico

```html
<app-gestion-facturas />
```

## Inputs

No expone inputs.

## Outputs

No expone outputs.

## Variantes / Casos de uso avanzados

El filtro reinicia la página a 1. Cerrar un checkout vuelve a consultar el listado porque el estado depende del webhook del CRM.

## Qué no hacer

- No asumir que generar o cerrar el checkout convierte una factura a `PAGADA`.
- No calcular el importe cuando el backend devuelve `null`; se muestra `—` como caso esperado.

## Relación con el sistema de diseño

Compone tabla, paginación, popup, select, card y botones existentes sin modificarlos. Los estilos usan tokens `--app-*` y fuerzan fondo negro para inputs locales en dark mode.
