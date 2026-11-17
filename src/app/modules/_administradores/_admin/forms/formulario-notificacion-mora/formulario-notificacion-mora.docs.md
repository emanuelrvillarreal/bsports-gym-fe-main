# Formulario de notificación de mora

`app-formulario-notificacion-mora` compone y valida un recordatorio de cuota vencida para abrir correo o WhatsApp desde el dispositivo del operador.

## Uso básico

```html
<app-formulario-notificacion-mora
  [cuota]="cuota"
  [empresa]="empresa"
  (enviado)="abrirCanal($event)"
/>
```

## Inputs

| Input | Tipo | Descripción |
| --- | --- | --- |
| `cuota` | `CuotaNotificacionMora` | Titular y datos de la cuota para precargar el formulario. |
| `empresa` | `ContactoEmpresaNotificacion` | Datos que se incluyen como firma. |

## Outputs

| Output | Payload | Descripción |
| --- | --- | --- |
| `enviado` | `NotificacionMoraPayload` | Se emite con un destinatario validado y el mensaje listo para abrir el canal. |

## Qué no hacer

- No agregar HTTP ni proveedores de mensajería: el contenedor decide cómo abrir el canal.
- No usarlo para comunicaciones que no estén asociadas a una cuota vencida sin revisar la plantilla y el permiso.

## Relación con el sistema de diseño

Usa `--app-*` y tokens semánticos. En modo oscuro los campos tienen fondo negro.

## Notas técnicas

WhatsApp recibe un número normalizado con prefijo `549`; el envío final siempre se confirma en la aplicación del operador.
