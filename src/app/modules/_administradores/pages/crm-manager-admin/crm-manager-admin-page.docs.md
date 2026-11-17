# CrmManagerAdminPageComponent

`app-crm-manager-admin-page` es la page liviana de facturación CRM para el rol ADMIN.

## Uso básico

```ts
loadComponent: () => import('./crm-manager-admin-page.component').then((m) => m.CrmManagerAdminPageComponent)
```

## Inputs

No expone inputs.

## Outputs

No expone outputs.

## Variantes / Casos de uso avanzados

Se monta bajo `/admin/crm-manager`; el acceso desde Configuración se resuelve fuera de la page.

## Qué no hacer

- No montar esta page en el navbar del ADMIN.
- No trasladar llamadas HTTP a la page; pertenecen a `app-gestion-facturas`.

## Relación con el sistema de diseño

Usa `app-titulo-hero` y el coordinador administrativo sin modificar componentes UI.
