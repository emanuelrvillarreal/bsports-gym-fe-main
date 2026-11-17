import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import type { IScannerControls } from '@zxing/browser';
import { formatearDni, limpiarDni } from '../../../helpers/dni-formato';

import { BotonComponent } from '../boton/boton.component';
import { LoadSpinnerBlueComponent } from '../load-spinner-blue/load-spinner-blue.component';
import { SelectComponent, SelectOption } from '../select/select.component';

export type EstadoLectorQr =
  | 'inactivo'
  | 'iniciando'
  | 'leyendo'
  | 'permiso-denegado'
  | 'sin-camara'
  | 'contexto-no-seguro'
  | 'no-disponible'
  | 'error';

interface ResultadoQr {
  getText(): string;
}

@Component({
  selector: 'app-lector-qr',
  standalone: true,
  imports: [BotonComponent, LoadSpinnerBlueComponent, SelectComponent],
  templateUrl: './lector-qr.component.html',
  styleUrl: './lector-qr.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LectorQrComponent implements AfterViewInit, OnDestroy {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly video = viewChild<ElementRef<HTMLVideoElement>>('video');

  /** Enciende o apaga la cámara. El ingreso manual permanece disponible en ambos casos. */
  readonly activo = input(false);
  /** Permite ocultar el ingreso manual cuando el flujo requiere exclusivamente la cámara. */
  readonly mostrarIngresoManual = input(true);
  /** Ventana durante la que se ignora una lectura idéntica. */
  readonly intervaloDuplicadosMs = input(1500);

  readonly contenidoLeido = output<string>();
  readonly contenidoManualEnviado = output<string>();
  readonly estadoCambiado = output<EstadoLectorQr>();
  readonly manualEtiqueta = input('Código');
  readonly manualAyuda = input('Escribilo o enfocá el campo y escanealo con un lector USB.');
  readonly manualPlaceholder = input('Ingresar código');
  readonly manualCargando = input(false);
  readonly manualFormato = input<'ninguno' | 'dni'>('ninguno');

  protected readonly estado = signal<EstadoLectorQr>('inactivo');
  protected readonly camaras = signal<readonly SelectOption[]>([]);
  protected readonly camaraSeleccionada = signal('');
  protected readonly contenidoManual = signal('');
  protected readonly aviso = signal('');

  protected readonly mensajeEstado = computed(() => {
    switch (this.estado()) {
      case 'iniciando':
        return 'Solicitando acceso a la cámara…';
      case 'leyendo':
        return 'Cámara activa. Acercá un código QR al recuadro.';
      case 'permiso-denegado':
        return 'No se pudo acceder a la cámara. Revisá el permiso del navegador.';
      case 'sin-camara':
        return 'No se detectó ninguna cámara disponible.';
      case 'contexto-no-seguro':
        return 'La cámara requiere HTTPS o localhost.';
      case 'no-disponible':
        return 'La cámara no está disponible en este dispositivo o navegador.';
      case 'error':
        return 'No se pudo iniciar la cámara. Podés reintentar o ingresar el código manualmente.';
      default:
        return 'La cámara está desactivada.';
    }
  });

  private controles: IScannerControls | null = null;
  private vistaInicializada = false;
  private destruido = false;
  private operacion = 0;
  private ultimoContenido = '';
  private ultimaLecturaEn = 0;

  constructor() {
    effect(() => {
      const debeEstarActivo = this.activo();
      untracked(() => this.sincronizarActivacion(debeEstarActivo));
    });
  }

  ngAfterViewInit(): void {
    this.vistaInicializada = true;
    this.sincronizarActivacion(this.activo());
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.detenerLector();
  }

  protected seleccionarCamara(camaraId: string): void {
    if (!camaraId || camaraId === this.camaraSeleccionada()) {
      return;
    }

    this.camaraSeleccionada.set(camaraId);
    if (this.activo()) {
      void this.iniciarLector(camaraId);
    }
  }

  protected reintentar(): void {
    if (this.activo()) {
      void this.iniciarLector(this.camaraSeleccionada() || undefined);
    }
  }

  protected actualizarContenidoManual(evento: Event): void {
    const valor = (evento.target as HTMLInputElement).value;
    this.contenidoManual.set(this.manualFormato() === 'dni' ? formatearDni(valor) : valor);
  }

  protected enviarContenidoManual(): void {
    const contenido = this.contenidoManual().trim();
    if (!contenido) {
      this.aviso.set('Ingresá o escaneá un código antes de continuar.');
      return;
    }

    this.contenidoManualEnviado.emit(
      this.manualFormato() === 'dni' ? limpiarDni(contenido) : contenido,
    );
    this.contenidoManual.set('');
  }

  private sincronizarActivacion(debeEstarActivo: boolean): void {
    if (!this.vistaInicializada || this.destruido) {
      return;
    }

    if (debeEstarActivo) {
      void this.iniciarLector(this.camaraSeleccionada() || undefined);
      return;
    }

    this.detenerLector();
  }

  private async iniciarLector(camaraId?: string): Promise<void> {
    const numeroOperacion = ++this.operacion;
    this.liberarRecursos();
    this.aviso.set('');

    if (!isPlatformBrowser(this.platformId)) {
      this.actualizarEstado('no-disponible');
      return;
    }

    const vista = this.document.defaultView;
    if (vista?.isSecureContext === false) {
      this.actualizarEstado('contexto-no-seguro');
      return;
    }

    if (!vista?.navigator.mediaDevices?.getUserMedia) {
      this.actualizarEstado('no-disponible');
      return;
    }

    const elementoVideo = this.video()?.nativeElement;
    if (!elementoVideo) {
      this.actualizarEstado('error');
      return;
    }

    this.actualizarEstado('iniciando');

    try {
      const { BrowserQRCodeReader } = await import('@zxing/browser');
      if (!this.operacionVigente(numeroOperacion)) {
        return;
      }

      const dispositivos = await BrowserQRCodeReader.listVideoInputDevices().catch(() => []);
      if (!this.operacionVigente(numeroOperacion)) {
        return;
      }

      this.actualizarCamaras(dispositivos);
      const camaraActiva = this.resolverCamara(camaraId, dispositivos);
      this.camaraSeleccionada.set(camaraActiva ?? '');

      const lector = new BrowserQRCodeReader();
      const controles = await lector.decodeFromVideoDevice(
        camaraActiva,
        elementoVideo,
        (resultado: ResultadoQr | undefined) => {
          if (resultado && this.operacionVigente(numeroOperacion)) {
            this.emitirSinDuplicar(resultado.getText());
          }
        },
      );

      if (!this.operacionVigente(numeroOperacion)) {
        controles.stop();
        this.detenerStream(elementoVideo);
        return;
      }

      this.controles = controles;
      this.actualizarEstado('leyendo');
      void this.refrescarCamarasTrasPermiso(BrowserQRCodeReader, numeroOperacion);
    } catch (error: unknown) {
      if (!this.operacionVigente(numeroOperacion)) {
        return;
      }

      this.liberarRecursos();
      this.actualizarEstado(this.clasificarError(error));
    }
  }

  private async refrescarCamarasTrasPermiso(
    lector: typeof import('@zxing/browser').BrowserQRCodeReader,
    numeroOperacion: number,
  ): Promise<void> {
    const dispositivos = await lector.listVideoInputDevices().catch(() => []);
    if (this.operacionVigente(numeroOperacion) && dispositivos.length) {
      this.actualizarCamaras(dispositivos);
    }
  }

  private actualizarCamaras(dispositivos: readonly MediaDeviceInfo[]): void {
    this.camaras.set(
      dispositivos.map((dispositivo, indice) => ({
        value: dispositivo.deviceId,
        label: dispositivo.label.trim() || `Cámara ${indice + 1}`,
      })),
    );
  }

  private resolverCamara(
    camaraSolicitada: string | undefined,
    dispositivos: readonly MediaDeviceInfo[],
  ): string | undefined {
    if (
      camaraSolicitada &&
      dispositivos.some((dispositivo) => dispositivo.deviceId === camaraSolicitada)
    ) {
      return camaraSolicitada;
    }

    const camaraTrasera = dispositivos.find((dispositivo) =>
      /back|rear|environment|trasera/i.test(dispositivo.label),
    );
    return camaraTrasera?.deviceId || dispositivos[0]?.deviceId;
  }

  private detenerLector(): void {
    ++this.operacion;
    this.liberarRecursos();
    this.actualizarEstado('inactivo');
  }

  private liberarRecursos(): void {
    this.controles?.stop();
    this.controles = null;

    const elementoVideo = this.video()?.nativeElement;
    if (elementoVideo) {
      this.detenerStream(elementoVideo);
    }
  }

  private detenerStream(elementoVideo: HTMLVideoElement): void {
    const stream = elementoVideo.srcObject;
    if (stream && 'getTracks' in stream && typeof stream.getTracks === 'function') {
      stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
    }

    elementoVideo.pause();
    elementoVideo.srcObject = null;
    elementoVideo.removeAttribute('src');
    elementoVideo.load();
  }

  private emitirSinDuplicar(contenidoOriginal: string): boolean {
    const contenido = contenidoOriginal.trim();
    if (!contenido) {
      return false;
    }

    const ahora = Date.now();
    const intervalo = Math.max(0, this.intervaloDuplicadosMs());
    if (contenido === this.ultimoContenido && ahora - this.ultimaLecturaEn < intervalo) {
      this.aviso.set('Código repetido omitido.');
      return false;
    }

    this.ultimoContenido = contenido;
    this.ultimaLecturaEn = ahora;
    this.aviso.set('Código leído correctamente.');
    this.contenidoLeido.emit(contenido);
    return true;
  }

  private actualizarEstado(estado: EstadoLectorQr): void {
    if (this.estado() === estado) {
      return;
    }

    this.estado.set(estado);
    this.estadoCambiado.emit(estado);
  }

  private clasificarError(error: unknown): EstadoLectorQr {
    const nombre =
      error && typeof error === 'object' && 'name' in error
        ? String((error as { name: unknown }).name)
        : '';

    if (nombre === 'NotAllowedError' || nombre === 'PermissionDeniedError') {
      return 'permiso-denegado';
    }

    if (
      nombre === 'NotFoundError' ||
      nombre === 'DevicesNotFoundError' ||
      nombre === 'OverconstrainedError'
    ) {
      return 'sin-camara';
    }

    if (nombre === 'SecurityError') {
      return 'contexto-no-seguro';
    }

    return 'error';
  }

  private operacionVigente(numeroOperacion: number): boolean {
    return !this.destruido && this.activo() && numeroOperacion === this.operacion;
  }
}
