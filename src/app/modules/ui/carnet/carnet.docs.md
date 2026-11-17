# CarnetComponent

`app-carnet` muestra el frente y dorso de una credencial visual configurable, sin conocer el dominio ni el origen de sus datos.

## Uso básico

```ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CarnetCampo, CarnetComponent } from './modules/ui/carnet/carnet.component';

@Component({
  selector: 'app-ejemplo-carnet',
  standalone: true,
  imports: [CarnetComponent],
  templateUrl: './ejemplo-carnet.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EjemploCarnetComponent {
  protected readonly campos: readonly CarnetCampo[] = [
    { etiqueta: 'Documento', valor: '28.987.654' },
    { etiqueta: 'Especialidades', valor: ['Natación', 'Funcional'] },
    { etiqueta: 'Contacto', valor: 'persona@example.com' },
  ];
}
```

```html
<app-carnet
  foto="assets/persona.webp"
  nombre="María"
  apellido="González"
  logo="assets/club.svg"
  logoAlt="Logo del club"
  [campos]="campos"
  qrContenido="USUARIO-0001"
/>
```

## Inputs

| Input             | Tipo                            | Default               | Descripción                                                      |
| ----------------- | ------------------------------- | --------------------- | ---------------------------------------------------------------- |
| `foto`            | `string`                        | `''`                  | URL de la foto; si está vacía o falla, muestra las iniciales      |
| `nombre`          | `string`                        | `''`                  | Nombre mostrado en la credencial                                 |
| `apellido`        | `string`                        | `''`                  | Apellido mostrado en la credencial                               |
| `logo`            | `string`                        | `''`                  | URL del logo preparado por el componente contenedor              |
| `logoAlt`         | `string`                        | `'Logo de la empresa'`| Texto alternativo accesible del logo                              |
| `campos`          | `readonly CarnetCampo[]`        | `[]`                  | Filas informativas configurables                                 |
| `qrContenido`     | `string`                        | `'QR-CARNET-0001'`    | Texto asociado al QR y usado como fallback visual                |
| `qrImagen`        | `string`                        | `''`                  | Imagen QR como data URL o contenido PNG en base64                |
| `altoRendimiento` | `boolean`                       | `false`               | Desactiva la animación de giro y reduce efectos visuales         |

`CarnetCampo` contiene `etiqueta: string` y `valor: string | readonly string[]`. Los valores vacíos se muestran como `-` y las listas se unen con comas.

## Outputs

No emite outputs. El usuario alterna frente y dorso mediante los botones internos.

## Variantes / Casos de uso avanzados

### Campos distintos por perfil

```ts
protected readonly camposProfesor: readonly CarnetCampo[] = [
  { etiqueta: 'Legajo', valor: 'PROF-123' },
  { etiqueta: 'Disciplinas', valor: ['Tenis', 'Pádel'] },
];
```

El componente contenedor decide las etiquetas, el orden, el formato y la cantidad de campos. `CarnetComponent` no formatea datos de dominio como DNI o fechas.

### QR provisto por backend

```html
<app-carnet [campos]="campos" [qrImagen]="qrBase64" qrContenido="USUARIO-0001" />
```

`qrImagen` acepta una data URL completa o una cadena base64; en el segundo caso se normaliza como `data:image/png;base64,...`.

### Modo performance

```html
<app-carnet [campos]="campos" [altoRendimiento]="true" />
```

## Qué no hacer

- No inyectar servicios de sesión o negocio en `CarnetComponent`; resolver el logo y los campos en el contenedor.
- No agregar inputs específicos como `dni`, `categoría` o `fechaAlta`; representarlos mediante `campos`.
- No usar el SVG fallback como reemplazo de un QR verificable; enviar `qrImagen` para validación real.
- No duplicar esta credencial para cada rol; cada facade debe configurar el mismo componente visual.

## Relación con el sistema de diseño

Consume los tokens globales `--app-surface`, `--app-surface-strong`, `--app-surface-border`, `--app-text`, `--app-text-soft`, `--app-accent` y `--app-warning`.

Expone tokens locales `--carnet-bg`, `--carnet-bg-strong`, `--carnet-border`, `--carnet-text`, `--carnet-text-soft`, `--carnet-accent`, `--carnet-danger` y `--carnet-foto-col`. Responde al tema claro u oscuro mediante los tokens globales.

## Notas técnicas

- Si `logo` está vacío o falla, usa el logo fallback del proyecto.
- La foto, el logo y el QR muestran `app-load-spinner` mientras cargan.
- Sin `qrImagen`, genera un SVG determinista de respaldo a partir de `qrContenido`; no es un codificador QR estándar.
- `altoRendimiento` cambia de cara sin la animación 3D de giro.
