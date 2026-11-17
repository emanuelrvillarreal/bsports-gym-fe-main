# Gestión de configuración institucional

`app-gestion-configuracion-empresa` coordina la consulta y actualización del perfil completo del club para `ADMIN` y `SYSADMIN`.

- Consume `GET /companies/current` y `PUT /companies/profile` con el contexto de empresa activo.
- Conserva el snapshot completo para que los formularios parciales no borren datos institucionales no expuestos.
- Bloquea guardados simultáneos y delega los campos de contacto a `app-formulario-configuracion-empresa`.
- Conserva los plazos y la periodicidad existentes en el perfil cuando guarda datos de contacto. La edición de periodicidad y plazos vive debajo de la tabla en `/admin/cuota-social` y `/sysadmin/cuota-social`.
