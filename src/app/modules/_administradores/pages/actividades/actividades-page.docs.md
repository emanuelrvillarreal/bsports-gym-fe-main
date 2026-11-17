# ActividadesAdministradoresPageComponent

`app-actividades-administradores-page` — page compartida que adapta la gestión de actividades al rol administrativo activo mediante `route.data`.

## Uso básico

```typescript
{
  path: 'actividades',
  data: {
    roles: ['ADMIN'],
    puedeAdministrar: true,
    subtituloPagina: 'Administrá las actividades básicas y sus inscripciones.',
  },
  loadComponent: () =>
    import('./pages/actividades/actividades-page.component').then(
      (m) => m.ActividadesAdministradoresPageComponent,
    ),
}
```

## Inputs

No expone inputs públicos.

## Outputs

No expone outputs públicos.

## Variantes / Casos de uso avanzados

ADMIN usa `puedeAdministrar: true`; ADM_RECEPCION usa `false`. `subtituloPagina` permite explicar cada alcance y cae en “Consultá las actividades del club.” cuando no es una cadena.

## Qué no hacer

- No inferir permisos desde la URL ni duplicar la page por rol; usar `route.data` tipado en las rutas.
- No implementar formularios ni llamadas de actividades dentro de esta page.

## Relación con el sistema de diseño

Reutiliza `app-titulo-hero` y `app-gestion-actividades`; hereda los tokens globales de ambos componentes. La gestión de eventos vive en la page independiente `/eventos`.

## Notas técnicas

La page lee un snapshot porque los datos no cambian durante la vida de la ruta. Los guards y el backend validan el acceso efectivo.
