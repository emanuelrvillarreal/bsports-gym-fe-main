# MisActividadesPortalComponent

`app-mis-actividades-portal` — muestra las inscripciones vigentes del socio logueado y, si es titular, las de un familiar de su grupo.

## Uso básico

```html
<app-mis-actividades-portal />
```

## Inputs

No recibe inputs.

## Outputs

No emite outputs. Tras una inscripción nueva, la page llama `recargar()`.

## Variantes / Casos de uso avanzados

- `SOCIO_TITULAR`: `GET /portal/member/actividad/inscripcion` y selector con `GET /portal/member/grupo`. Al elegir un familiar usa `GET /portal/member/actividad/inscripcion/familiar/{memberUuid}`.
- `FAMILIAR`: solo el listado propio. No muestra selector ni catálogo.

## Qué no hacer

- No paginar este listado: el contrato devuelve `InscripcionActividadDTO[]` sin `page`/`size`.
- No mostrar `cuotaGenerada`, `cuotaUuid` ni `cuotaAdvertencia`: en el listado llegan vacíos.
- No usar este componente para inscribir o dar de baja: el alta vive en `app-actividades-portal` y es exclusiva del titular.

## Relación con el sistema de diseño

Reutiliza `app-card`, `app-boton`, `app-select` y `app-tabla-responsive`. El error usa `--semantic-danger`.

## Notas técnicas

Vive en `_socios/components` porque titular y familiar comparten el listado. Un 403/404 al consultar un familiar resetea el selector a "Yo" y vuelve a pedir el grupo.
