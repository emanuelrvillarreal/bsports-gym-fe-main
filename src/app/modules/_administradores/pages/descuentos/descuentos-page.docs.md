# Página Descuentos

La página compone el encabezado reutilizable `app-titulo-hero` con
`app-gestion-descuentos`. No contiene acceso HTTP ni lógica de formularios.

## Rutas y permisos

| Ruta                        | Rol             |
| --------------------------- | --------------- |
| `/admin/descuentos`         | `ADMIN`         |
| `/adm-recepcion/descuentos` | `ADM_RECEPCION` |

Ambas rutas reutilizan exactamente el mismo loader diferido y la misma page. Los guards del
layout administrativo y el `data.roles` de cada ruta controlan el acceso.

## Navegación

El nav-bar muestra la opción **Descuentos** con la clave semántica `descuentos`, resuelta a un
ícono de recibo con porcentaje. La URL se construye con el prefijo del rol activo.

## Arquitectura

- La page permanece liviana y usa `ChangeDetectionStrategy.OnPush`.
- La gestión del catálogo y de sus asignaciones pertenece a `GestionDescuentosComponent`.
- Los contratos y servicios HTTP pertenecen a `core/api`.
- Los componentes de `modules/ui` se consumen sin modificaciones.
