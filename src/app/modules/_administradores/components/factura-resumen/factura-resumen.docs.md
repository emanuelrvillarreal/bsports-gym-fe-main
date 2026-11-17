# FacturaResumenComponent

`app-factura-resumen` muestra los datos disponibles de una factura CRM sin realizar consultas ni inventar información fiscal.

## Uso básico

```html
<app-factura-resumen [factura]="factura" />
```

## Inputs

| Input | Tipo | Default | Descripción |
| --- | --- | --- | --- |
| `factura` | `FacturaDto` | Requerido | Factura local devuelta por el paginado. |

## Outputs

No expone outputs.

## Variantes / Casos de uso avanzados

Admite facturas sin plan, sin productos o con importe `null`; en este último caso muestra `—`.

## Qué no hacer

- No usar `uuidFacturaCrm` para iniciar pagos; el backend exige `facturaUuid`.
- No agregar números fiscales, impuestos o enlaces PDF que no formen parte de `FacturaDto`.

## Relación con el sistema de diseño

Usa tokens `--app-*` para superficies, texto y estados semánticos, por lo que responde al tema activo.
