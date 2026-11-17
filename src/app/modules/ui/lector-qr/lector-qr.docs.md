# Lector QR

`app-lector-qr` lee códigos QR con la cámara y ofrece siempre el mismo flujo alternativo para ingreso manual o lectores USB que escriben el código y envían Enter.

## Uso

```ts
import { LectorQrComponent } from './modules/ui/lector-qr/lector-qr.component';

@Component({
  imports: [LectorQrComponent],
})
export class AccesosComponent {
  protected lectorActivo = true;

  protected procesarCodigo(contenido: string): void {
    // Validar el acceso en la capa de negocio.
  }
}
```

```html
<app-lector-qr
  [activo]="lectorActivo"
  (contenidoLeido)="procesarCodigo($event)"
  (estadoCambiado)="registrarEstado($event)"
/>
```

## Inputs

| Input                   | Tipo      | Default | Descripción                                                         |
| ----------------------- | --------- | ------- | ------------------------------------------------------------------- |
| `activo`                | `boolean` | `false` | Inicia o detiene la cámara sin ocultar el fallback manual/USB.      |
| `intervaloDuplicadosMs` | `number`  | `1500`  | Tiempo durante el que una lectura idéntica no vuelve a ser emitida. |

| `mostrarIngresoManual`  | `boolean` | `true`  | Muestra u oculta el ingreso manual o mediante lector USB.            |

## Outputs

| Output           | Payload          | Descripción                                                      |
| ---------------- | ---------------- | ---------------------------------------------------------------- |
| `contenidoLeido` | `string`         | Contenido QR o manual normalizado, sin espacios en los extremos. |
| `estadoCambiado` | `EstadoLectorQr` | Cambio relevante del estado de la cámara.                        |

```ts
type EstadoLectorQr =
  | 'inactivo'
  | 'iniciando'
  | 'leyendo'
  | 'permiso-denegado'
  | 'sin-camara'
  | 'contexto-no-seguro'
  | 'no-disponible'
  | 'error';
```

## Cámaras y permisos

- Enumera los dispositivos de video y muestra `app-select` solamente cuando existe más de una cámara.
- Prefiere una cámara trasera cuando el navegador informa una etiqueta reconocible.
- Un cambio de cámara detiene el stream anterior antes de iniciar el nuevo.
- Distingue permiso denegado, ausencia de cámara, contexto no seguro y error general.
- La cámara web requiere HTTPS o `localhost`; el ingreso manual/USB funciona aun cuando la cámara no está disponible.

## Lector USB

Los lectores USB suelen comportarse como teclado. El operador debe dejar enfocado el campo `Código`; el Enter enviado por el dispositivo procesa el valor. También puede escribirlo y activar `Procesar código`.

La supresión de duplicados se comparte entre cámara, teclado y lector USB. Si el mismo valor necesita aceptarse consecutivamente, ajustar `[intervaloDuplicadosMs]` según el flujo.

## Accesibilidad

- El video tiene nombre accesible y el marco de encuadre es decorativo.
- Los cambios de estado y resultados se anuncian mediante regiones `aria-live`.
- El fallback usa etiqueta, ayuda asociada y envío de formulario con teclado.
- La selección de cámara reutiliza la navegación accesible de `app-select`.
- Las transiciones se eliminan con `prefers-reduced-motion`.

## Qué no hacer

- No crear un segundo `getUserMedia` en el componente consumidor.
- No ocultar el fallback cuando la cámara está activa o falla.
- No procesar lógica de acceso dentro del lector: escuchar `contenidoLeido` y resolverla en el módulo funcional.
- No mantener `[activo]="true"` cuando la vista deja de usar el lector; desactivarlo permite liberar la cámara inmediatamente.

## Tokens visuales

Consume los tokens globales `--app-bg`, `--app-text`, `--app-text-soft`, `--app-surface`, `--app-surface-strong`, `--app-surface-border`, `--app-accent`, `--app-success`, `--app-success-soft` y `--app-success-border`.

## Notas técnicas

- Es standalone, usa `ChangeDetectionStrategy.OnPush` y carga `@zxing/browser` de forma dinámica solamente en navegador.
- Detiene los controles ZXing y todas las pistas presentes en `video.srcObject` al desactivar, cambiar de cámara o destruir.
- Las operaciones asíncronas se invalidan para impedir que una solicitud tardía reactive un stream después del cierre.
- En SSR renderiza el estado y el fallback sin acceder a APIs de navegador.
