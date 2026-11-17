# GrupoFamiliarPortalComponent

`app-grupo-familiar-portal` — lista los familiares del titular y permite solicitar altas, editar, dar de baja, abrir credenciales y gestionar certificados.

## Uso básico

```typescript
import { Component } from '@angular/core';
import { GrupoFamiliarPortalComponent } from './grupo-familiar-portal.component';

@Component({
  imports: [GrupoFamiliarPortalComponent],
  template: '<app-grupo-familiar-portal />',
})
export class GrupoFamiliarPageComponent {}
```

## Inputs

No expone inputs públicos.

## Outputs

No expone outputs públicos; coordina el listado y `FormularioGrupoFamiliarComponent`.

## Variantes / Casos de uso avanzados

El botón de alta abre un popup no descartable durante el envío. La edición reutiliza el mismo formulario sin contraseña, la baja exige confirmación destructiva y certificados se abre en un popup con el encabezado `app-titulo-hero`.

## Qué no hacer

- No montar este componente en rutas de `FAMILIAR`; sólo pertenece al portal del titular.
- No pedir `titularMemberUuid` ni duplicar los campos del formulario dentro del coordinador.

## Relación con el sistema de diseño

Adapta la respuesta `{ titularMemberUuid, integrantes[] }`, tomando los datos de `integrantes[].member` y excluyendo al titular de la tabla. Reutiliza `app-card`, `app-tabla-responsive`, `app-popup`, `app-titulo-hero`, `app-carnet`, `app-certificados-medicos-portal`, `app-boton`, `app-load-spinner-blue` y `app-formulario-grupo-familiar`. Los errores usan `--semantic-danger`.

## Notas técnicas

Consume `GET /portal/member/grupo` mediante `PortalSocioApiService`. El alta usa `POST /member/portal/familiar` y la edición usa `PUT /portal/member/perfil?memberUuid=...`, respetando los campos editables del portal. La colección Postman actual no publica contratos portal para baja ni solicitud de reactivación; esas acciones no se exponen para evitar usar por error endpoints de backoffice. El error temporal se limpia en `ngOnDestroy`.
