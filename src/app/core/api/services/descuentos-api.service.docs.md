# DescuentosApiService

Servicio del dominio descuentos para el catálogo y las asignaciones recurrentes de cuotas
sociales y de actividad. Los contratos se tomaron de la carpeta `Descuentos` de Postman.

## Contrato

| Operación                                | Endpoint                                            | Identificador del path     |
| ---------------------------------------- | --------------------------------------------------- | -------------------------- |
| Alta de catálogo                         | `POST /descuento`                                   | —                          |
| Editar catálogo                          | `PUT /descuento/{uuid}`                             | `descuentoUuid`            |
| Baja de catálogo                         | `DELETE /descuento/{uuid}`                          | `descuentoUuid`            |
| Paginar catálogo                         | `POST /descuento/catalogo/paginate`                 | —                          |
| Paginar por socio                        | `POST /descuento/paginate`                          | —                          |
| Asignar a socio                          | `POST /descuento/member/{uuid}`                     | `memberUuid`               |
| Borrar/finalizar asignación social       | `/descuento/member-descuento/{uuid}`                | `asignacionUuid`           |
| Asignar a actividad                      | `POST /descuento/inscripcion-actividad/{uuid}`      | `inscripcionActividadUuid` |
| Borrar/finalizar asignación de actividad | `/descuento/inscripcion-actividad-descuento/{uuid}` | `asignacionUuid`           |

Los dos paginados reciben `{ page, size, search }` con página 1-based y reutilizan
`PageResponse<T>`. Todos los requests agregan el contexto de empresa activa. Las mutaciones
configuran feedback de éxito y errores 4xx visibles mediante los interceptores compartidos.

`GuardarDescuentoPayload` conserva ambos campos de valor: el formulario debe enviar
`porcentaje` o `montoFijo` según `tipoValor` y dejar el otro en `null`.

## Restricción del contrato de actividad

`POST /descuento/inscripcion-actividad/{uuid}` necesita el UUID de la inscripción, no el de la
actividad. El paginado `POST /descuento/paginate` devuelve `actividadUuid` pero no
`inscripcionActividadUuid`; por eso una UI no puede crear la primera asignación de una actividad
solo a partir de esa respuesta. Debe obtener `inscripcionActividadUuid` desde el alta o desde
otro listado que lo exponga. Finalizar y borrar sí usan el `asignacionUuid` retornado por el
paginado.

Las bajas de asignaciones son físicas e irreversibles. La baja del catálogo es lógica, pero
elimina físicamente en cascada sus asignaciones; la confirmación pertenece a la capa de UI.
