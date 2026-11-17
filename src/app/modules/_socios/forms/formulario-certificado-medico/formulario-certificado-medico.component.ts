import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  input,
  output,
  signal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroDocumentArrowUp } from '@ng-icons/heroicons/outline';

import { BotonComponent } from '../../../ui/boton/boton.component';

const TAMANIO_MAXIMO_ARCHIVO_BYTES = 2 * 1024 * 1024;
const TIPOS_PERMITIDOS = new Set(['image/png', 'image/jpeg', 'application/pdf']);
const EXTENSIONES_PERMITIDAS = /\.(png|jpe?g|pdf)$/i;

@Component({
  selector: 'app-formulario-certificado-medico',
  standalone: true,
  imports: [BotonComponent, NgIcon],
  providers: [provideIcons({ heroDocumentArrowUp })],
  templateUrl: './formulario-certificado-medico.component.html',
  styleUrl: './formulario-certificado-medico.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormularioCertificadoMedicoComponent {
  readonly enviando = input(false);
  readonly seleccionado = output<File>();

  @ViewChild('archivoInput') private readonly archivoInput?: ElementRef<HTMLInputElement>;

  protected readonly archivo = signal<File | null>(null);
  protected readonly mensajeError = signal('');
  protected readonly arrastreActivo = signal(false);

  protected seleccionarArchivo(evento: Event): void {
    if (this.enviando()) return;
    const input = evento.target as HTMLInputElement;
    this.aplicarArchivo(input.files?.item(0) ?? null, input);
  }

  protected activarArrastre(evento: DragEvent): void {
    if (this.enviando()) return;
    evento.preventDefault();
    this.arrastreActivo.set(true);
  }

  protected desactivarArrastre(evento: DragEvent): void {
    evento.preventDefault();
    this.arrastreActivo.set(false);
  }

  protected soltarArchivo(evento: DragEvent): void {
    if (this.enviando()) return;
    evento.preventDefault();
    this.arrastreActivo.set(false);
    this.aplicarArchivo(evento.dataTransfer?.files?.item(0) ?? null);
  }

  private aplicarArchivo(archivo: File | null, input?: HTMLInputElement): void {
    this.archivo.set(null);
    this.mensajeError.set('');

    if (!archivo) return;

    if (!TIPOS_PERMITIDOS.has(archivo.type) && !EXTENSIONES_PERMITIDAS.test(archivo.name)) {
      this.mensajeError.set('Seleccioná un archivo PNG, JPG, JPEG o PDF.');
      this.limpiarInput(input);
      return;
    }

    if (archivo.size > TAMANIO_MAXIMO_ARCHIVO_BYTES) {
      this.mensajeError.set('El archivo no puede superar los 2 MB.');
      this.limpiarInput(input);
      return;
    }

    this.archivo.set(archivo);
  }

  protected enviar(): void {
    if (this.enviando()) return;
    const archivo = this.archivo();
    if (!archivo) {
      this.mensajeError.set('Seleccioná un certificado para continuar.');
      return;
    }

    this.mensajeError.set('');
    this.seleccionado.emit(archivo);
  }

  /** Limpia la selección después de que el contenedor confirma la carga. */
  limpiarSeleccion(): void {
    this.archivo.set(null);
    this.mensajeError.set('');
    this.limpiarInput();
  }

  private limpiarInput(input?: HTMLInputElement): void {
    const campo = input ?? this.archivoInput?.nativeElement;
    if (campo) campo.value = '';
  }
}
