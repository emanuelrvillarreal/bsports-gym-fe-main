# Gestion de branding de empresa

`app-gestion-branding-empresa` es el componente de logica exclusivo de `ADMIN` y `SYSADMIN`.
Compone el formulario de logo y `app-color-mod`; concentra permisos, HTTP y estados de operacion.

- El logo acepta JPG/JPEG/PNG de hasta 5 MB y se guarda mediante `POST /companies/logo`.
- Los colores se leen y guardan en el perfil institucional mediante `GET` y `PUT /companies/profile`.
- El componente vuelve a validar el rol activo antes de cada request, aunque la visibilidad se
  determine tambien mediante `route.data`.
- Al completar la carga del logo actualiza el cache contextual y la sesion para refrescar navbar,
  carnets y `/login` sin perder el branding al cerrar sesion.
