# Gestión Mercado Pago Empresas

Componente SYSADMIN que pagina comercios con el contrato `POST /companies/paginate-club`, consulta el estado enmascarado y coordina la carga, rotación o deshabilitación de Mercado Pago. Nunca registra ni persiste secretos.

El paginado devuelve `Page<CompanyDTO>` y no incluye el estado de Mercado Pago. La tabla muestra solamente los datos de empresa confirmados por ese contrato; el estado real se obtiene al abrir la configuración mediante `GET /sysadmin/clubs/{companyUuid}/mercado-pago`.

La acción con engranaje abre la configuración. La acción **Bloquear Mercado Pago** solicita confirmación mediante `ToastAlertService` y, al confirmar, ejecuta `PUT /sysadmin/clubs/{companyUuid}/mercado-pago` con `{ habilitado: false }`. El bloqueo impide nuevos cobros sin eliminar las credenciales guardadas.
