# ActividadesApiService

Servicio HTTP administrativo del dominio actividades. Centraliza listado, detalle, alta,
edición, inscripciones, bajas y consentimientos usando las rutas de `API_ROUTES.actividades`.

## Inscripción administrativa

`inscribir(actividadUuid, payload)` consume `POST /actividad/{actividadUuid}/inscripcion`.
`InscripcionActividadPayload` siempre incluye `memberUuid` y puede incorporar
`descuentos?: AsignarDescuentoPayload[] | null`.

Cuando se envían descuentos, cada elemento contiene `descuentoUuid`, `fechaDesde` y
`fechaHasta`. El backend guarda esas asignaciones recurrentes antes de generar la primera cuota.
Omitir `descuentos` conserva el comportamiento administrativo anterior y no asigna descuentos.

El contrato no se aplica a `PortalInscripcionActividadPayload`: el socio nunca puede
autoasignarse descuentos desde el portal.

## Plazo de vencimiento de cuota

Los commands de alta y edición aceptan `diasVencimientoCuota` como número opcional. Si se
omite, el backend utiliza su valor por defecto de 30 días.

La periodicidad se transporta en `periodicidadCuota` con el tipo compartido `PeriodicidadCuota`.
El formulario envía siempre uno de los valores acordados; `diasVencimientoCuota` permanece opcional y
continúa representando el plazo de vencimiento.
