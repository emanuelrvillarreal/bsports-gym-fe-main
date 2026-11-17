# PerfilPortalComponent

`app-perfil-portal` — coordina la consulta y actualización del perfil compartido por socio titular y socio familiar.

## Uso básico

```typescript
import { Component } from '@angular/core';
import { PerfilPortalComponent } from './perfil-portal.component';

@Component({
  imports: [PerfilPortalComponent],
  template: '<app-perfil-portal />',
})
export class PerfilSocioTitularPageComponent {}
```

## Inputs

No expone inputs públicos.

## Outputs

No expone outputs públicos; coordina `FormularioPerfilComponent` y `PortalSocioApiService`.

## Variantes / Casos de uso avanzados

Las pages `/socio-titular/perfil` y `/socio-familiar/perfil` componen el mismo componente. Sólo nombre, apellido, teléfono y fecha de nacimiento son editables.

## Qué no hacer

- No crear una variante para familiar ni duplicar estado HTTP en las pages.
- No enviar email, DNI, número de socio o foto en la actualización.

## Relación con el sistema de diseño

Reutiliza `app-card`, `app-boton`, `app-load-spinner-blue` y `app-formulario-perfil`. Los errores usan `--semantic-danger` y la composición responde al tema activo.

## Notas técnicas

Consume `GET/PUT /portal/member/perfil`; las suscripciones se vinculan al `DestroyRef` y los errores del guardado se delegan al formulario.
