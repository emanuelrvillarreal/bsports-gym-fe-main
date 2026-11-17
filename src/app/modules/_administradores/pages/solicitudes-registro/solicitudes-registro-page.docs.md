# SolicitudesRegistroAdministradoresPageComponent

`app-solicitudes-registro-administradores-page` — page común que presenta las solicitudes pendientes en ADMIN y ADM_RECEPCION.

## Uso básico

```typescript
{
  path: 'solicitudes-registro',
  data: { roles: ['ADMIN'] },
  loadComponent: () =>
    import('./pages/solicitudes-registro/solicitudes-registro-page.component').then(
      (m) => m.SolicitudesRegistroAdministradoresPageComponent,
    ),
}
```

## Inputs

No expone inputs públicos.

## Outputs

No expone outputs públicos.

## Variantes / Casos de uso avanzados

La misma clase se carga desde `/admin/solicitudes-registro` y `/adm-recepcion/solicitudes-registro`; sólo cambian el layout y `data.roles` definidos por cada ruta padre.

## Qué no hacer

- No crear una page por rol mientras ambas compongan exactamente la misma gestión.
- No duplicar tabla, formularios, confirmaciones o servicios de `SolicitudesRegistroComponent`.

## Relación con el sistema de diseño

Reutiliza `app-titulo-hero` y `app-solicitudes-registro`; hereda los tokens globales del layout.

## Notas técnicas

Los permisos se declaran en `administradores.routes.ts` y se validan nuevamente en backend.
