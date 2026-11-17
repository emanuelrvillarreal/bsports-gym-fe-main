# EventosAccesoApiService

Servicio del dominio de entradas. Centraliza el ABM de `evento-acceso`, el control de acceso,
el cobro unificado y el historial del evento.

## Contrato

Usa los DTO de `eventos-acceso.interfaces.ts`, `PageResponse<T>` para los listados y
`HttpContext` para feedback. El campo de identidad del evento es `uuid`.

| Operación   | Endpoint                                        | Notas                                                                             |
| ----------- | ----------------------------------------------- | --------------------------------------------------------------------------------- |
| Alta        | `POST /evento-acceso`                           | Envía precios para socio al día, moroso e invitado, más ambos permisos explícitos |
| Paginar     | `POST /evento-acceso/paginate`                  | `page`, `size` y `search` opcionales                                              |
| Detalle     | `GET /evento-acceso/{uuid}`                     | Devuelve precios y permisos en el mismo DTO                                       |
| Editar      | `PUT /evento-acceso/{uuid}`                     | Mismo contrato completo que el alta                                               |
| Baja lógica | `DELETE /evento-acceso/{uuid}`                  | Respuesta 204                                                                     |
| Escanear QR | `POST /evento-acceso/{uuid}/scan`               | Siempre informa por 200 mediante `estado`, `motivo` y `montoAPagar`               |
| Cobrar      | `POST /evento-acceso/{uuid}/cobro`              | Unión discriminada `{ tipo: 'SOCIO' \| 'INVITADO', payload }`                     |
| Historial   | `POST /evento-acceso/{uuid}/historial/paginate` | Lista scans y cobros; `search` filtra por nombre                                  |

## Reglas relevantes

- Alta y edición requieren `monto`, `montoMorosos`, `montoInvitados`, `permiteMorosos` y
  `permiteInvitados`; el frontend no depende de defaults del backend.
- `scan` no activa un toast automático de éxito. `ACCESO_PERMITIDO`, `DEBE_PAGAR` y
  `BLOQUEADO` son resultados válidos dentro de una respuesta HTTP 200.
- El cobro `SOCIO` incluye `userUuid` en `payload`; el cobro `INVITADO` admite `nombre` para
  dejar una identidad legible en el historial. Ambos soportan `MANUAL` y `MERCADO_PAGO`.
- La respuesta del cobro se interpreta por `resultado`: `ACCESO_PERMITIDO` ya fue cobrado y
  `DEBE_PAGAR` queda pendiente de Mercado Pago. `movimientoUuid`, `qr` y datos del socio son
  nullable según el tipo y canal.
- `fecha` del historial acepta temporalmente `string | number | readonly number[]` porque el
  backend usa la serialización por defecto de Jackson. La normalización pertenece a la UI.
- Todos los métodos mantienen el contexto de error de “Eventos de acceso”; las mutaciones,
  salvo el scan, mantienen feedback de éxito.
