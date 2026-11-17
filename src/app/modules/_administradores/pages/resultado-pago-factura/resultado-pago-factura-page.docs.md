# ResultadoPagoFacturaPageComponent

`app-resultado-pago-factura-page` recibe los retornos de Mercado Pago y vuelve a consultar facturas y sesión sin asumir una acreditación inmediata.

## Uso básico

```ts
{
  path: 'pago-factura/exito',
  data: { estadoResultadoFactura: 'exito' },
  loadComponent: () => import('./resultado-pago-factura-page.component').then((m) => m.ResultadoPagoFacturaPageComponent),
}
```

## Inputs

No expone inputs; lee `estadoResultadoFactura` desde `route.data`.

## Outputs

No expone outputs.

## Variantes / Casos de uso avanzados

Acepta `exito`, `fallo` y `pendiente`. El destino de regreso sigue siendo `/club-bloqueado` mientras la empresa activa continúe bloqueada.

## Qué no hacer

- No usar query params para identificar la factura: las URLs de retorno no los garantizan.
- No liberar navegación por un retorno exitoso; solo `companyBlocked === false` habilita volver al manager.

## Relación con el sistema de diseño

Usa el botón y spinner existentes, con superficies y estados definidos por tokens `--app-*`.
