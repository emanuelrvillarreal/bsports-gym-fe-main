# Gestión CRM de empresas

Componente coordinador exclusivo de SYSADMIN. Consume el paginado global de clubes y el catálogo
de planes CRM, conserva búsqueda, página, carga, errores y popups mediante signals, y cancela sus
streams al destruirse.

## Comportamiento

- `suscripcionCrm: null`: muestra únicamente la acción Suscribir.
- Suscripción presente: muestra Cambiar plan y Dar de baja.
- Suscribir y cambiar plan requieren únicamente un plan.
- La card principal visible queda seleccionada al abrir el popup y la navegación del carrusel
  actualiza el plan que se enviará.
- La baja advierte que anula suscripciones, compensa deuda y bloquea inmediatamente el club.
- Los errores 400, 404, 409 y 502 conservan el popup abierto y presentan un mensaje accionable.
- Después de una operación exitosa se recarga la página vigente del listado.

No modifica componentes de `modules/ui` ni replica contratos del backend.
