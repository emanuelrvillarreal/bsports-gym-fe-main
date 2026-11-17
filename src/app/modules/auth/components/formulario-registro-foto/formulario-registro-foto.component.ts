import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { NgIcon } from '@ng-icons/core';

import { BotonComponent } from '../../../ui/boton/boton.component';
import { ValidacionFormularioDirective } from '../../../ui/validacion-formulario/validacion-formulario.directive';

const TAMANIO_MAX_FOTO = 5 * 1024 * 1024;
const FORMATOS_PERMITIDOS = ['image/jpeg', 'image/jpg', 'image/png'];
const EXTENSIONES_PERMITIDAS = ['.jpg', '.jpeg', '.png'];
const TOLERANCIA_CUADRADA = 0.3;

export type ModoFormularioRegistroFoto = 'foto-perfil' | 'logo-club';

export interface FormularioRegistroFotoValor {
  readonly foto: File;
  readonly fotoPreview: string;
  readonly ancho: number;
  readonly alto: number;
}

@Component({
  selector: 'app-formulario-registro-foto',
  standalone: true,
  imports: [BotonComponent, NgIcon, ValidacionFormularioDirective],
  templateUrl: './formulario-registro-foto.component.html',
  styleUrl: './formulario-registro-foto.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormularioRegistroFotoComponent implements OnDestroy {
  private urlTemporal: string | null = null;
  private temporizadorErrorFormulario: ReturnType<typeof setTimeout> | null = null;
  private ultimoMensajeErrorExterno = '';

  readonly fotoInicial = input<string | null>(null);
  readonly modo = input<ModoFormularioRegistroFoto>('foto-perfil');
  readonly cargando = input(false);
  readonly mensajeErrorExterno = input('');
  readonly textoBotonConfirmar = input('Confirmar');
  readonly textoBotonRestablecer = input('Restablecer');
  readonly mostrarBotonRestablecer = input(true);
  readonly mostrarBotonEliminar = input(false);
  readonly textoBotonEliminar = input('Eliminar foto');
  readonly submitted = output<FormularioRegistroFotoValor>();
  readonly eliminar = output<void>();

  @ViewChild('fotoInput') private readonly fotoInput?: ElementRef<HTMLInputElement>;

  protected readonly fotoSeleccionada = signal<File | null>(null);
  protected readonly fotoPreview = signal<string | null>(null);
  protected readonly arrastreFotoActivo = signal(false);
  protected readonly validandoFoto = signal(false);
  protected readonly errorFormulario = signal('');
  protected readonly mensajeErrorVisible = signal('');
  protected readonly submitInvalido = signal(false);
  protected readonly dimensionesFoto = signal<{
    readonly ancho: number;
    readonly alto: number;
  } | null>(null);
  protected readonly nombreArchivo = signal('');
  protected readonly previewActual = computed(
    () => this.fotoPreview() || this.fotoInicial() || null,
  );
  protected readonly esLogoClub = computed(() => this.modo() === 'logo-club');
  protected readonly tituloImagen = computed(() =>
    this.esLogoClub() ? 'Logo del gimnasio' : 'Foto de perfil',
  );
  protected readonly textoCarga = computed(() =>
    this.esLogoClub() ? 'Click o arrastrá el logo' : 'Click o arrastrá la foto',
  );
  protected readonly textoAyuda = computed(() =>
    this.esLogoClub()
      ? 'Subí el logo institucional en formato JPG, JPEG o PNG, hasta 5MB.'
      : 'Subí una imagen cuadrada o casi cuadrada. Se acepta JPG, JPEG o PNG, hasta 5MB.',
  );
  protected readonly textoProporcion = computed(() =>
    this.esLogoClub()
      ? 'El logo puede ser rectangular; la vista previa conserva el archivo seleccionado.'
      : 'La proporcion objetivo es 1:1. Se admite hasta un 30% de diferencia entre ancho y alto.',
  );

  constructor() {
    effect(() => {
      this.manejarMensajeErrorExterno(this.mensajeErrorExterno());
    });
  }

  ngOnDestroy(): void {
    this.limpiarTemporizadorErrorFormulario();
    this.limpiarPreviewTemporal();
  }

  protected async seleccionarFoto(evento: Event): Promise<void> {
    const input = evento.target as HTMLInputElement | null;
    await this.aplicarArchivo(input?.files?.[0] ?? null, input);
  }

  protected activarArrastreFoto(evento: DragEvent): void {
    evento.preventDefault();
    this.arrastreFotoActivo.set(true);
  }

  protected desactivarArrastreFoto(evento: DragEvent): void {
    evento.preventDefault();
    this.arrastreFotoActivo.set(false);
  }

  protected async soltarFoto(evento: DragEvent): Promise<void> {
    evento.preventDefault();
    this.arrastreFotoActivo.set(false);
    await this.aplicarArchivo(evento.dataTransfer?.files?.[0] ?? null);
  }

  protected confirmar(): void {
    const archivo = this.fotoSeleccionada();
    const preview = this.fotoPreview();
    const dimensiones = this.dimensionesFoto();

    if (!archivo || !preview || !dimensiones) {
      this.mostrarErrorFormulario(
        `Cargá ${this.esLogoClub() ? 'un logo' : 'una foto'} valido antes de confirmar.`,
      );
      return;
    }

    this.limpiarErrorFormulario();
    this.submitted.emit({
      foto: archivo,
      fotoPreview: preview,
      ancho: dimensiones.ancho,
      alto: dimensiones.alto,
    });
  }

  protected restablecer(): void {
    this.fotoSeleccionada.set(null);
    this.dimensionesFoto.set(null);
    this.nombreArchivo.set('');
    this.fotoPreview.set(null);
    this.validandoFoto.set(false);
    this.limpiarErrorFormulario();
    this.reiniciarInputArchivo();
    this.limpiarPreviewTemporal();
  }

  private async aplicarArchivo(
    archivo: File | null,
    input?: HTMLInputElement | null,
  ): Promise<void> {
    this.limpiarErrorFormulario();

    if (!archivo) {
      this.restablecer();
      return;
    }

    const tipo = archivo.type.trim().toLowerCase();
    const nombre = archivo.name.trim().toLowerCase();
    const extensionValida = EXTENSIONES_PERMITIDAS.some((extension) => nombre.endsWith(extension));
    const formatoValido = FORMATOS_PERMITIDOS.includes(tipo) || extensionValida;

    if (!formatoValido) {
      this.restablecerTrasError(input, 'Formato no valido. Usa JPG, JPEG o PNG.');
      return;
    }

    if (archivo.size > TAMANIO_MAX_FOTO) {
      this.restablecerTrasError(input, 'La foto supera los 5MB.');
      return;
    }

    this.validandoFoto.set(true);

    try {
      const dimensiones = await this.leerDimensionesImagen(archivo);
      const proporcion = dimensiones.ancho / dimensiones.alto;

      if (!this.esLogoClub() && Math.abs(1 - proporcion) > TOLERANCIA_CUADRADA) {
        this.restablecerTrasError(
          input,
          'La foto debe ser casi cuadrada. Se admite hasta un 30% de diferencia entre ancho y alto.',
        );
        return;
      }

      this.fotoSeleccionada.set(archivo);
      this.dimensionesFoto.set(dimensiones);
      this.nombreArchivo.set(archivo.name);
      this.limpiarPreviewTemporal();
      this.urlTemporal = URL.createObjectURL(archivo);
      this.fotoPreview.set(this.urlTemporal);
      this.notificarCambioValidacion();
    } catch {
      this.restablecerTrasError(input, 'No se pudo leer la imagen seleccionada.');
    } finally {
      this.validandoFoto.set(false);
    }
  }

  private async leerDimensionesImagen(
    archivo: File,
  ): Promise<{ readonly ancho: number; readonly alto: number }> {
    const url = URL.createObjectURL(archivo);

    try {
      const dimensiones = await new Promise<{ readonly ancho: number; readonly alto: number }>(
        (resolve, reject) => {
          const imagen = new Image();
          imagen.onload = () => resolve({ ancho: imagen.naturalWidth, alto: imagen.naturalHeight });
          imagen.onerror = () => reject(new Error('No se pudo abrir la imagen.'));
          imagen.src = url;
        },
      );

      return dimensiones;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  private restablecerTrasError(input: HTMLInputElement | null | undefined, mensaje: string): void {
    this.restablecer();
    if (input) {
      input.value = '';
    }
    this.mostrarErrorFormulario(mensaje);
  }

  private reiniciarInputArchivo(): void {
    const input = this.fotoInput?.nativeElement;
    if (input) {
      input.value = '';
    }
  }

  private notificarCambioValidacion(): void {
    this.fotoInput?.nativeElement.dispatchEvent(new Event('input', { bubbles: true }));
  }

  private limpiarPreviewTemporal(): void {
    if (this.urlTemporal) {
      URL.revokeObjectURL(this.urlTemporal);
      this.urlTemporal = null;
    }
  }

  private mostrarErrorFormulario(mensaje: string): void {
    this.limpiarTemporizadorErrorFormulario();
    this.errorFormulario.set(mensaje);
    this.mensajeErrorVisible.set(mensaje);
    this.submitInvalido.set(false);
    queueMicrotask(() => this.submitInvalido.set(true));
    this.temporizadorErrorFormulario = setTimeout(() => {
      this.errorFormulario.set('');
      this.mensajeErrorVisible.set('');
      this.submitInvalido.set(false);
      this.temporizadorErrorFormulario = null;
    }, 5000);
  }

  private limpiarErrorFormulario(): void {
    this.limpiarTemporizadorErrorFormulario();
    this.errorFormulario.set('');
    this.mensajeErrorVisible.set('');
    this.submitInvalido.set(false);
  }

  private limpiarTemporizadorErrorFormulario(): void {
    if (this.temporizadorErrorFormulario) {
      clearTimeout(this.temporizadorErrorFormulario);
      this.temporizadorErrorFormulario = null;
    }
  }

  private manejarMensajeErrorExterno(mensaje: string): void {
    const valor = mensaje.trim();

    if (!valor) {
      this.ultimoMensajeErrorExterno = '';
      if (!this.errorFormulario()) {
        this.mensajeErrorVisible.set('');
      }
      return;
    }

    if (valor === this.ultimoMensajeErrorExterno) {
      return;
    }

    this.ultimoMensajeErrorExterno = valor;
    this.limpiarTemporizadorErrorFormulario();
    this.errorFormulario.set('');
    this.mensajeErrorVisible.set(valor);
    this.temporizadorErrorFormulario = setTimeout(() => {
      this.mensajeErrorVisible.set('');
      this.temporizadorErrorFormulario = null;
    }, 5000);
  }
}
