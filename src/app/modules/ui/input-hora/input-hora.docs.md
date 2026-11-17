# InputHoraComponent

`app-input-hora` es un campo reutilizable para valores `HH:mm`. Muestra la hora en dos segmentos
numéricos para conservar el formato de 24 horas y permitir la edición por teclado. El botón con
reloj abre el selector nativo cuando el navegador lo permite.

```html
<app-input-hora
  etiqueta="Hora de inicio"
  [valor]="horaInicio()"
  (valorCambiado)="horaInicio.set($event)"
/>
```

| Input | Tipo | Default | Descripción |
| --- | --- | --- | --- |
| `valor` | `string` | `''` | Valor en formato `HH:mm`. |
| `inputId` | `string` | `''` | Identificador del segmento de hora. |
| `colorIcono` | `string` | `var(--app-accent)` | Color CSS del reloj. |
| `invalido` | `boolean` | `false` | Expone el estado inválido para lectores de pantalla. |
| `deshabilitado` | `boolean` | `false` | Deshabilita el campo y el botón. |

| Output | Tipo | Descripción |
| --- | --- | --- |
| `valorCambiado` | `string` | Emite la hora elegida. |

En tema oscuro el fondo del control es negro. No incluye lógica de negocio ni validaciones de dominio.
