# LayoutSysadminComponent

`app-layout-sysadmin` es el shell privado de administración global para el rol `SYSADMIN`.

Usa el prefijo `/sysadmin`; sus pages viven directamente en `modules/_administradores/pages/`. El acceso se declara con `authRoleGuard`, `authRoleChildGuard` y `data.roles: ['SYSADMIN']`.

No expone inputs ni outputs. Compone `LayoutMainComponent` y hereda header, nav-bar, tema, toasts y comportamiento responsive.

`/sysadmin/nueva-empresa` es su ruta principal y reutiliza el formulario público de empresa y su servicio. SYSADMIN no tiene dashboard ni ruta `inicio`. `/sysadmin/configuracion` carga la page mínima compartida por perfiles; no renderiza actualmente el editor de configuración del sistema.

No mezclar aquí la administración interna de un club, duplicar el shell base ni consumir endpoints desde el layout.
