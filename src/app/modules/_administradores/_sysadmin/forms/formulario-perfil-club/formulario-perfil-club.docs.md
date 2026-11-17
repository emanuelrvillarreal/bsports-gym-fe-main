# FormularioPerfilClubComponent

`app-formulario-perfil-club` valida y emite el perfil institucional completo editable de un club.

## Uso

```html
<app-formulario-perfil-club [perfil]="perfil" (enviado)="guardar($event)" />
```

## Inputs

| Input             | Tipo                       | Default | Descripcion                                  |
| ----------------- | -------------------------- | ------- | -------------------------------------------- |
| `perfil`          | `PerfilEmpresaDto \| null` | `null`  | Snapshot usado para precargar el formulario. |
| `duracionErrorMs` | `number`                   | `5000`  | Tiempo de visibilidad del error local.       |

## Outputs

| Output    | Payload                    | Descripcion                                                      |
| --------- | -------------------------- | ---------------------------------------------------------------- |
| `enviado` | `PerfilClubEdicionPayload` | Perfil completo validado y normalizado sin `importeCuotaSocial`. |

El formulario utiliza los dos domicilios vigentes y omite los datos de pago a proveedores y Open Data retirados de la API.

La periodicidad de la cuota social se edita con el catálogo compartido de periodicidades. Si el perfil no trae un valor reconocido, se muestra y se envía `MENSUAL` como predeterminado.

El formulario no realiza llamadas HTTP; el contenedor invoca el servicio con el DTO completo.
