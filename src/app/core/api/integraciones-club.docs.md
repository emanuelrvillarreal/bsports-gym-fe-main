# Integraciones de B Sports Club

Estado del frontend tras la integración progresiva basada en los contratos vigentes de `postman/`.

## Servicios activos

| Servicio                                             | Contratos consumidos                                                             |
| ---------------------------------------------------- | -------------------------------------------------------------------------------- |
| `EmpresaApiService` / `SysadminApiService`           | alta de club, logo, perfil y sincronización de roles                             |
| `RegistroPersonaService`                             | registro público `member/public/titular` con tenant explícito                    |
| `SociosApiService`                                   | solicitudes, paginado, altas, edición, baja, importación y familiar desde portal |
| `RecepcionistasApiService` / `ProfesoresApiService`  | alta, edición, paginado y baja lógica                                            |
| `ActividadesApiService`                              | paginado, alta/edición básica e inscripción/baja                                 |
| `TesoreriaApiService`                                | balance, cuotas, movimientos y anulaciones                                      |
| `EventosAccesoApiService`                            | ABM de eventos de acceso, scan QR, cobro moroso e invitado                      |
| `PortalSocioApiService` / `PortalProfesorApiService` | perfil, credencial, grupo, actividades y calendarios                             |

## Reglas transversales

- Los paginados usan DTOs planos por dominio y página de request 1-based.
- El interceptor agrega JWT y `X-Company-Uuid`; endpoints públicos declaran `OMITIR_AUTH` y tenant explícito.
- `401` puede renovar la sesión; `403` representa permisos insuficientes y no dispara refresh.
- Fechas de calendario usan `dd/MM/yyyy`; perfiles y altas usan `yyyy-MM-dd`.
- Los servicios integran `HttpClient`, `crearApiUrl`, `API_ROUTES` y los DTO tipados de cada dominio.
- `GET/PUT /portal/member/perfil` consulta y actualiza el perfil del socio o profesor desde la sesión. La actualización admite exclusivamente nombre, apellido, teléfono opcional y fecha de nacimiento (`yyyy-MM-dd`).
- `GET /portal/member/actividad/inscripcion` lista las inscripciones vigentes del socio logueado (titular o familiar). `GET /portal/member/actividad/inscripcion/familiar/{memberUuid}` lista las de un familiar del mismo grupo; el selector se arma con `GET /portal/member/grupo` y es exclusivo del titular.
- `POST /portal/member/actividad/inscripcion` permite que el socio titular inscriba al titular de la sesión (`memberUuid: null`) o a un familiar de su grupo. El payload usa `actividadUuid` y `memberUuid`; la respuesta informa la inscripción y la eventual cuota generada o advertencia.
- `AuthService` integra `POST/DELETE /user/photo`, conserva el contexto de sesión y actualiza `imageUrl` sin recargar.

## Exclusiones deliberadas

Mercado Pago, amenities, categorías avanzadas, eventos de actividad completos, asistencia final, roles/permisos funcionales y acciones de profesor sobre eventos siguen bloqueados por alcance o contrato incompleto.

La gestión de cuotas permite consultar, ver detalle, cobrar manualmente y anular cuotas pendientes o vencidas.

## Validación

Las suites unitarias verifican URL, método, payload y contextos principales. La validación E2E contra staging requiere credenciales por rol y no debe guardar tokens, contraseñas ni QR en fixtures o logs.
