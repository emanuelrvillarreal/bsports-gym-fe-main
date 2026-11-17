# GestionEventosAccesoComponent

Contenedor de listado y ABM de eventos de acceso.

- Usa signals y pagina mediante POST con `page: 1`, `size: 10` y `search`.
- La tabla muestra título, descripción y monto del socio al día; ofrece Ver, Ingresar, Editar, Historial y Eliminar.
- Ver, editar e ingresar consultan primero el detalle actualizado.
- El detalle presenta los tres precios y los permisos para morosos e invitados.
- Historial abre el componente paginado de scans y cobros del evento seleccionado.
- Alta y edición comparten `FormularioEventoAccesoComponent`.
- La baja lógica usa un popup propio, nombra el evento, explica la consecuencia y exige marcar la confirmación.
- Cada request usa `takeUntilDestroyed` y `finalize`; los popups bloquean el cierre mientras trabajan.
- Los errores al guardar se muestran mediante `ToastAlertService`; el formulario conserva únicamente
  la validación de campos incompletos o inválidos.
- La fecha del evento se edita con un input de fecha sin hora. La UI normaliza respuestas con formato
  `dd/mm/yyyy` o arrays de componentes y envía la fecha con hora cero al backend.
