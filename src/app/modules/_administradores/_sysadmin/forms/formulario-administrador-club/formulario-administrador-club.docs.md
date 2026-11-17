# FormularioAdministradorClubComponent

`app-formulario-administrador-club` valida y emite el alta o la edicion de un administrador del club.

## Uso

```html
<app-formulario-administrador-club modo="crear" (enviado)="guardar($event)" />
```

## Inputs

| Input             | Tipo                           | Default   | Descripcion                               |
| ----------------- | ------------------------------ | --------- | ----------------------------------------- |
| `modo`            | `'crear' \| 'editar'`          | `'crear'` | Define el comando y los campos editables. |
| `administrador`   | `AdministradorClubDto \| null` | `null`    | Datos usados para precargar la edicion.   |
| `duracionErrorMs` | `number`                       | `5000`    | Tiempo de visibilidad del error local.    |

## Outputs

| Output    | Payload                                | Descripcion              |
| --------- | -------------------------------------- | ------------------------ |
| `enviado` | `ResultadoFormularioAdministradorClub` | Alta o edicion validada. |

En edicion se emiten nombre, apellido, DNI, email, telefono y fecha de nacimiento. La contrasena
solo aparece en el alta y nunca forma parte del payload de edicion.

El formulario no realiza llamadas HTTP ni agrega acciones de baja o permisos.
