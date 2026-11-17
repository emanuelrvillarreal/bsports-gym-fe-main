# NuevaEmpresaPageComponent

Antes de mostrar el formulario, la page carga en paralelo los catálogos CRM de provincias y
condiciones impositivas. El alta crea el club sin suscripción inicial; el plan se asigna luego
desde CRM Manager. Si el CRM responde con error, permite reintentar sin enviar un alta
incompleta. Un error de registro conserva abierto el formulario y mantiene sus valores.

Coordina el onboarding reintentable de `/sysadmin/nueva-empresa` para el rol `SYSADMIN`.

## Flujo

1. `POST /sysadmin/clubs — Alta club y administrador inicial` conserva `company.uuid`.
2. `POST /companies/logo — Subir logo del club` envía multipart `file` con `X-Company-Uuid`.
3. `POST /sysadmin/clubs/sync-roles — Sincronizar roles plantilla` completa el proceso.

Cada éxito queda almacenado en el estado de la page. Un error de logo no repite el alta y un error de sincronización no repite ni alta ni logo.

## Estados y errores

- Alta: requiere respuesta 201 con `company.uuid`.
- Logo: permite reintentar el mismo paso; errores HTTP se muestran también en el formulario de archivo.
- Roles: la operación es idempotente, espera 204 y expone una acción de reintento.

## Campos excluidos

- El logo no se agrega a `ClubRegistrationRequestDTO`.
- No se configura Mercado Pago, categorías, amenities ni otros módulos fuera del onboarding.
- La actualización posterior de perfil está disponible en `EmpresaApiService`, pero no duplica los datos recién guardados durante este flujo.

El contrato de referencia está en la [colección Postman de B Sports Club](../../../../../../../postman/bsports-club.postman_collection.json).
