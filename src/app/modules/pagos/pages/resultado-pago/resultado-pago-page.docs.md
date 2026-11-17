# ResultadoPagoPageComponent

`app-resultado-pago-page` — presenta el retorno de Checkout Pro y consulta el comprobante mediante la referencia externa.

## Uso básico

El componente se carga desde las rutas públicas `/pago/exito` y `/pago/error`:

```typescript
{
  path: 'exito',
  data: { estadoResultado: 'exito' },
  loadComponent: () => import('./resultado-pago-page.component')
    .then((m) => m.ResultadoPagoPageComponent),
}
```

## Inputs

No expone inputs. Lee `estadoResultado` desde los datos de ruta y `external_reference` desde query params.

## Outputs

No expone outputs. Navega mediante `Router` al destino del rol autenticado.

## Variantes / Casos de uso avanzados

- `exito`: rehidrata la sesión y consulta `GET /pago/{external_reference}`.
- `error`: presenta el rechazo sin consultar el comprobante.
- `ADMIN` vuelve a `/admin/ingresos`.
- `ADM_RECEPCION` vuelve a `/adm-recepcion/ingresos`.
- `SOCIO_TITULAR` o un rol ausente vuelve a `/socio-titular/cuotas`.

## Qué no hacer

- No asumir que el retorno exitoso implica comprobante aprobado; el webhook puede seguir pendiente.
- No construir la ruta de regreso desde parámetros externos; debe derivarse del rol autenticado.

## Relación con el sistema de diseño

Reutiliza `app-boton` y `app-load-spinner-blue`. Los estados visuales consumen tokens `--app-*` y `--semantic-*`.

## Notas técnicas

La referencia externa es opaca. Se conserva con `PagoResultadoService` y se envía sin reinterpretarla a `PagosApiService`.
