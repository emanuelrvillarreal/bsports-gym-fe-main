# API de onboarding y registro público

## Servicios

| Servicio                                  | Request Postman                                                 | Rol / contexto                         | Uso                                                    |
| ----------------------------------------- | --------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------ |
| `SysadminApiService.registrarClub`        | `POST /sysadmin/clubs — Alta club y administrador inicial`      | `SYSADMIN`                             | Crea club y admin; retorna `company.uuid`.             |
| `SysadminApiService.sincronizarRoles`     | `POST /sysadmin/clubs/sync-roles — Sincronizar roles plantilla` | `SYSADMIN`                             | Sincronización global idempotente, respuesta 204.      |
| `EmpresaApiService.subirLogo`             | `POST /companies/logo — Subir logo del club`                    | `ADMIN` o `SYSADMIN`, `X-Company-Uuid` | Envía multipart con campo `file`.                      |
| `EmpresaApiService.actualizarPerfil`      | `PUT /companies/profile — Actualizar perfil del club`           | `ADMIN` o `SYSADMIN`, `X-Company-Uuid` | Envía `ClubProfileUpdateRequestDTO` sin admin ni logo. |
| `RegistroPersonaService.registrarPersona` | `POST /member/public/titular — Registro público titular`        | `OMITIR_AUTH`, `X-Company-Uuid`        | Envía un `MemberPublicRegistroCommand` plano.          |

## Perfil institucional del club

`EmpresaApiService.obtenerPerfil` consume `GET /companies/current` con JWT de
`ADMIN` o `SYSADMIN` y contexto `X-Company-Uuid`. Devuelve el perfil completo
para que las ediciones parciales preserven los campos que no se muestran.

## Decisiones contractuales

- Los DTOs canónicos viven en `core/api/interfaces` y no usan index signatures.
- `RegistroEmpresaService` permanece como adaptador retrocompatible hacia `SysadminApiService`.
- El registro público no consulta usuarios por email ni intenta iniciar sesión.
- No se implementan endpoints o campos con contrato parcial.

Fuente contractual: requests y ejemplos vigentes en `postman/`.
