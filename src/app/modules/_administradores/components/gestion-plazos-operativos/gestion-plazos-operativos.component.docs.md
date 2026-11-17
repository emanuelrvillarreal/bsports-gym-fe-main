# Gestión de periodicidad y plazos operativos

Carga el perfil de empresa activo y persiste la periodicidad y los plazos con `PUT /companies/profile`. Se compone debajo del listado de cuota social en las rutas de ADMIN y SYSADMIN.

- Preserva en el payload los campos de perfil que no edita esta sección.
- La periodicidad de cuota social usa el contrato literal compartido; si falta o no es reconocida, el formulario propone `MENSUAL`.
- Conserva la carga, los errores recuperables y el bloqueo durante el guardado.
