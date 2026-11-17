# CRM Manager de SYSADMIN

Page exclusiva de SYSADMIN prevista para `/sysadmin/crm-manager`. La page es liviana y compone el
título estándar con `GestionCrmEmpresasComponent`; el registro de la ruta y el acceso desde el
navbar pertenecen a la configuración central de navegación.

La gestión pagina clubes sin requerir empresa activa y ofrece acciones según `suscripcionCrm`:
suscribir cuando es `null`, o cambiar plan y dar de baja cuando existe una suscripción vigente.
Reutiliza la tabla, paginación, popup, carrusel, cards, selects, botones y feedback del template sin
modificar `modules/ui`.
