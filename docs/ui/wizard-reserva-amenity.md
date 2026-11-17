# Wizard de reserva de amenities

`app-gestion-reserva-amenity` encapsula el cuerpo del popup de alta de reservas administrativas. Recibe `abierto`, la lista de `amenities` y el estado `procesando`; emite `confirmar` con `CrearReservaAmenityCommand` y `cancelar`.

El flujo exige seleccionar un socio titular activo, una instalación y una fecha con horario válido. Consulta socios con paginación propia y sólo emite el comando: el contenedor conserva la responsabilidad de llamar a la API, cerrar el popup y recargar la grilla de reservas.

El indicador de progreso reutiliza `app-wizard-pasos`; la navegación y las validaciones continúan perteneciendo a este componente de dominio.
