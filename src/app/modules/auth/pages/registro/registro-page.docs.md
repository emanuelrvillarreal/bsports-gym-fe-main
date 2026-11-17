# RegistroPageComponent

Page pública `/registro?companyUuid=<uuid>` para solicitar el alta como socio titular.

## Contrato

- Request Postman: `POST /member/public/titular — Registro público titular`.
- Auth: pública mediante `OMITIR_AUTH`.
- Tenant: `X-Company-Uuid`, obtenido exclusivamente del query param `companyUuid`.
- Resultado: solicitud pendiente; la page no autentica ni inicia sesión.

## Estados y errores

- Sin `companyUuid` o con formato inválido: el formulario queda bloqueado y explica cómo volver a abrir el enlace.
- Usuario nuevo: se envía password.
- Usuario existente: se omite password.
- 400: validación, tenant inválido o password requerido.
- 409: solicitud pendiente o socio ya existente.
- Error de conexión: reutiliza `app-toast-alert`.

## Campos excluidos

No se envían roles, estado, `memberUuid`, `titularMemberUuid`, foto ni un wrapper `{ user: ... }`.

El contrato de referencia está en la [colección Postman de B Sports Club](../../../../../../postman/bsports-club.postman_collection.json).
