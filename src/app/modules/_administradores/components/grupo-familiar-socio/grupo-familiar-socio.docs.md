# GrupoFamiliarSocioComponent

`app-grupo-familiar-socio` muestra en un popup los familiares del titular seleccionado desde la gestión administrativa.

## Uso básico

```html
<app-grupo-familiar-socio
  [titular]="titularSeleccionado()"
  (cerrar)="cerrarGrupo()"
  (editar)="editarFamiliar($event)"
  (verCertificados)="abrirCertificados($event)"
/>
```

## Inputs

| Input | Tipo | Default | Descripción |
| --- | --- | --- | --- |
| `titular` | `SocioDto \| null` | `null` | Titular cuyo grupo se consulta; controla la apertura del popup. |
| `procesandoMemberUuid` | `string \| null` | `null` | UUID en baja para deshabilitar acciones durante la operación. |
| `versionRecarga` | `number` | `0` | Un cambio dispara una recarga del grupo. |

## Outputs

| Output | Payload | Descripción |
| --- | --- | --- |
| `cerrar` | `void` | Solicita cerrar el popup. |
| `editar` | `SocioDto` | Solicita editar el familiar seleccionado. |
| `verCertificados` | `SocioDto` | Solicita abrir los certificados del familiar seleccionado. |

## Qué no hacer

- No usarlo en el portal de socios: ese flujo usa el componente y endpoint de portal basados en sesión.
- No llamar a `HttpClient` desde el contenedor: la consulta queda centralizada en `SociosApiService`.

## Relación con el sistema de diseño

Reutiliza `app-popup` y `app-tabla-responsive`; la tabla encapsula también su estado de carga y responde a los tokens `--app-*` y al tema activo.

La tabla conserva `parentesco` y muestra `fechaAlta` mediante el renderer de fecha compartido.

## Notas técnicas

Consume `GET /member/uuid/{titularMemberUuid}/familiares`, confirmado en la colección Postman.
