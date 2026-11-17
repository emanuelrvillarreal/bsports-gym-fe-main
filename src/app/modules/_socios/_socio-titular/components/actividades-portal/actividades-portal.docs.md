# Actividades portal

Componente de dominio exclusivo del socio titular. Muestra el catálogo paginado de actividades y permite inscribir al titular o a familiares activos del grupo.

## Dependencias

- `ActividadesApiService.paginar` para el catálogo disponible (`POST /actividad/paginate`, permiso `activity.view` solo del titular).
- `PortalSocioApiService.obtenerGrupoFamiliar` e `inscribirActividad` para el flujo de inscripción.
- `inscripcionConfirmada` avisa a la page para recargar `app-mis-actividades-portal`.
- Componentes UI reutilizables de tabla, paginación, popup, selector, título hero y toast.

El listado "Mis actividades" vive en `app-mis-actividades-portal`, compartido con el familiar.
