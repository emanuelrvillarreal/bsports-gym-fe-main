# SociosApiService

Servicio único del dominio socios. Consolida solicitudes pendientes, listado, altas, edición, baja lógica e importación Excel.

## Contrato

Usa los DTO de `socios.interfaces.ts`, `PageResponse<T>` para paginados y `HttpContext` para aplicar `X-Company-Uuid` y toasts desde interceptores.

| Operación              | Endpoint                                       | Permiso contractual               |
| ---------------------- | ---------------------------------------------- | --------------------------------- |
| Solicitudes pendientes | `POST /member/solicitudes/paginate`            | `member.view`                     |
| Aprobar/rechazar       | `POST /member/uuid/{uuid}/aprobar-registro`    | `member.create`                   |
| Listar socios          | `POST /member/paginate`                        | `member.view`                     |
| Listar familiares      | `GET /member/uuid/{uuid}/familiares`           | `member.view`                     |
| Alta titular           | `POST /member/titular`                         | `member.create`                   |
| Alta familiar          | `POST /member/familiar`                        | `family.create`                   |
| Actualizar             | `PUT /member/uuid/{uuid}`                      | `member.edit` o `family.edit`     |
| Baja lógica            | `POST /member/uuid/{uuid}/baja`                | `member.edit` o `family.edit`     |
| Actualizar estado      | `PUT /member/uuid/{uuid}/estado`               | `member.edit` o `family.edit`     |
| Iniciar importación    | `POST /member/import`                          | `member.create` y `family.create` |
| Seguir importación     | `GET /member/import/{importId}/progress` (SSE) | Público por `importId`            |

La actualización de estado recibe `{ estado: EstadoSocio }`. La gestión usa este contrato para
reactivar socios `INACTIVO` enviando explícitamente `{ estado: 'ACTIVO' }`.

Las altas administrativas de titular y familiar admiten `descuentos?: AsignarDescuentoPayload[]`.
El servicio reenvía el arreglo sin wrapper para que los descuentos impacten la primera cuota social
generada por el alta. Este campo no forma parte del alta familiar del portal.

La aprobación de una solicitud recibe `AprobarSolicitudRegistroPayload`. El body puede ser `{}`
para conservar el alta sin descuentos o incluir
`{ descuentos: [{ descuentoUuid, fechaDesde, fechaHasta }] }`; `fechaHasta` admite `null`.

La importación responde `202` con `importId` y `filasTotales`. `observarProgresoImportacion`
encapsula `EventSource`, distingue errores de negocio de fallas transitorias de red y cierra el
stream en eventos terminales o al cancelar la suscripción. El SSE no envía JWT ni
`X-Company-Uuid` y no incluye resultados por fila.
