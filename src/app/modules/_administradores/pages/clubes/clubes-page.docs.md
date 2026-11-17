# ClubesPageComponent

`app-clubes-page` presenta la gestión global de clubes disponible para `SYSADMIN` en `/sysadmin/clubes`.

## Uso básico

La ruta carga la page de forma diferida y compone el título estándar con la gestión de clubes:

```html
<app-titulo-hero titulo="Clubes" /> <app-gestion-clubes />
```

## Alcance

La page no realiza HTTP. La coordinación de clubes, perfil, administradores, popup y paginación
pertenece a `GestionClubesComponent`.

## Notas técnicas

- La ruta está protegida para `SYSADMIN`.
- El navbar enlaza a `/sysadmin/clubes`.
- El logo y la configuración CRM se mantienen en sus pantallas existentes.
