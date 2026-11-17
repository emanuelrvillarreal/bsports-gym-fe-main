# AvisoFacturaPendienteComponent

`app-aviso-factura-pendiente` consulta y presenta una vez por sesión y empresa la factura pendiente más próxima.

## Uso básico

```html
<app-aviso-factura-pendiente />
```

## Inputs

No expone inputs.

## Outputs

No expone outputs.

## Variantes / Casos de uso avanzados

La clave `aviso-factura-pendiente:{companyUuid}` evita repetir el aviso. Ante error HTTP se elimina para permitir un intento posterior.

## Qué no hacer

- No montar el componente fuera de un layout con empresa activa.
- No reemplazar el filtro por una consulta general: el aviso requiere `PENDIENTE` y vencimiento ascendente.

## Relación con el sistema de diseño

Compone el popup, resumen, botón y checkout existentes mediante tokens semánticos del tema.
