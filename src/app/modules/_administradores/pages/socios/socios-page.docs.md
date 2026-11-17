# SociosAdministradoresPageComponent

`app-socios-administradores-page` — page compartida que presenta `app-gestion-socios` bajo los layouts ADMIN y ADM_RECEPCION.

## Uso básico

```typescript
{
  path: 'socios',
  data: {
    roles: ['ADMIN'],
    filasVisiblesTabla: 4,
  },
  loadComponent: () =>
    import('./pages/socios/socios-page.component').then(
      (m) => m.SociosAdministradoresPageComponent,
    ),
}
```

## Inputs

No expone inputs públicos.

## Outputs

No expone outputs públicos.

## Variantes / Casos de uso avanzados

La variante se define con `ActivatedRoute.snapshot.data`: `/admin/socios` usa `filasVisiblesTabla: 4` y `/adm-recepcion/socios` usa `filasVisiblesTabla: 50`. Un valor ausente, no entero o menor que uno cae en `50`.

## Qué no hacer

- No crear pages duplicadas por rol; la diferencia visual se declara en `route.data`.
- No mover formularios, llamadas HTTP ni estado de tabla desde `GestionSociosComponent` a la page.

## Relación con el sistema de diseño

Reutiliza `app-titulo-hero` y `app-gestion-socios`; la page sólo compone componentes y hereda los tokens globales del layout.

## Notas técnicas

Los guards y roles pertenecen a `administradores.routes.ts`; el backend sigue siendo la autoridad final sobre permisos operativos.
