import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  QueryList,
  ViewChild,
  ViewChildren,
  effect,
  input,
  output,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroClock } from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-input-hora',
  standalone: true,
  imports: [NgIcon],
  providers: [provideIcons({ heroClock })],
  templateUrl: './input-hora.component.html',
  styleUrl: './input-hora.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputHoraComponent {
  readonly inputId = input('');
  readonly etiqueta = input('');
  readonly valor = input('');
  readonly minimo = input('');
  readonly maximo = input('');
  readonly deshabilitado = input(false);
  readonly requerido = input(false);
  readonly invalido = input(false);
  readonly colorIcono = input('var(--app-accent)');
  readonly ariaLabel = input('Seleccionar hora');
  readonly valorCambiado = output<string>();

  @ViewChild('campoHoraNativo') private readonly campoHoraNativo?: ElementRef<HTMLInputElement>;
  @ViewChildren('segmentoHora') private readonly segmentos?: QueryList<ElementRef<HTMLInputElement>>;

  protected hora = '';
  protected minuto = '';

  constructor() {
    effect(() => this.asignarSegmentos(this.valor()));
  }

  protected abrirSelector(): void {
    if (this.deshabilitado()) return;

    const campo = this.campoHoraNativo?.nativeElement;
    if (!campo) return;

    campo.value = this.esHoraValida(this.valor()) ? this.valor() : '';
    if (typeof campo.showPicker === 'function') {
      campo.showPicker();
      return;
    }

    campo.focus();
    campo.click();
  }

  protected cambiarSegmento(segmento: 'hora' | 'minuto', evento: Event): void {
    const campo = evento.target as HTMLInputElement;
    const valorSegmento = campo.value.replace(/\D/g, '').slice(0, 2);
    campo.value = valorSegmento;
    this[segmento] = valorSegmento;

    if (valorSegmento.length === 2 && segmento === 'hora') {
      this.enfocarSiguiente(campo);
    }

    if (!this.hora && !this.minuto) {
      this.actualizarValidez('');
      this.valorCambiado.emit('');
      return;
    }

    const valor = this.valorSegmentado();
    if (!valor) {
      this.actualizarValidez('Ingresá una hora válida con formato HH:mm.', campo);
      return;
    }

    const mensajeRestriccion = this.mensajeRestriccion(valor);
    if (mensajeRestriccion) {
      this.actualizarValidez(mensajeRestriccion, campo);
      return;
    }

    this.actualizarValidez('');
    this.valorCambiado.emit(valor);
  }

  protected seleccionarHoraNativa(evento: Event): void {
    const campo = evento.target as HTMLInputElement;
    const valor = campo.value.slice(0, 5);

    if (!valor) {
      this.asignarSegmentos('');
      this.actualizarValidez('');
      this.valorCambiado.emit('');
      return;
    }

    const mensaje = this.esHoraValida(valor)
      ? this.mensajeRestriccion(valor)
      : 'Ingresá una hora válida con formato HH:mm.';
    if (mensaje) {
      this.actualizarValidez(mensaje);
      return;
    }

    this.asignarSegmentos(valor);
    this.actualizarValidez('');
    this.valorCambiado.emit(valor);
  }

  protected manejarTeclaSegmento(evento: KeyboardEvent): void {
    const campo = evento.target as HTMLInputElement;
    if (evento.key === 'ArrowLeft') {
      evento.preventDefault();
      this.enfocarSegmento(campo, -1);
    } else if (evento.key === 'ArrowRight') {
      evento.preventDefault();
      this.enfocarSegmento(campo, 1);
    } else if (evento.key === 'Backspace' && !campo.value) {
      evento.preventDefault();
      this.enfocarSegmento(campo, -1);
    }
  }

  protected seleccionarSegmento(evento: FocusEvent | MouseEvent): void {
    (evento.target as HTMLInputElement).select();
  }

  private asignarSegmentos(valor: string): void {
    const coincidencia = this.esHoraValida(valor) ? valor.match(/^(\d{2}):(\d{2})$/) : null;
    this.hora = coincidencia?.[1] ?? '';
    this.minuto = coincidencia?.[2] ?? '';
  }

  private valorSegmentado(): string | null {
    if (!/^\d{2}$/.test(this.hora) || !/^\d{2}$/.test(this.minuto)) return null;

    const valor = `${this.hora}:${this.minuto}`;
    return this.esHoraValida(valor) ? valor : null;
  }

  private esHoraValida(valor: string): boolean {
    const coincidencia = valor.match(/^(\d{2}):(\d{2})$/);
    if (!coincidencia) return false;

    const horas = Number(coincidencia[1]);
    const minutos = Number(coincidencia[2]);
    return horas >= 0 && horas <= 23 && minutos >= 0 && minutos <= 59;
  }

  private mensajeRestriccion(valor: string): string {
    const minimo = this.minimo();
    const maximo = this.maximo();

    if (minimo && valor < minimo) return `La hora mínima permitida es ${minimo}.`;
    if (maximo && valor > maximo) return `La hora máxima permitida es ${maximo}.`;
    return '';
  }

  private actualizarValidez(mensaje: string, campo?: HTMLInputElement): void {
    campo?.setCustomValidity(mensaje);
    this.segmentos?.forEach((segmento) => segmento.nativeElement.setCustomValidity(mensaje));
  }

  private enfocarSiguiente(campo: HTMLInputElement): void {
    this.enfocarSegmento(campo, 1);
  }

  private enfocarSegmento(campo: HTMLInputElement, desplazamiento: number): void {
    const segmentos = this.segmentos?.toArray() ?? [];
    const indice = segmentos.findIndex((segmento) => segmento.nativeElement === campo);
    const siguiente = segmentos[indice + desplazamiento]?.nativeElement;
    if (!siguiente) return;

    siguiente.focus();
    siguiente.select();
  }
}
