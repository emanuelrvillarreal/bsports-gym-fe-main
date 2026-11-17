import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
  ViewChildren,
  QueryList,
  effect,
  forwardRef,
  input,
  inject,
  output,
  signal,
} from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroCalendarDays, heroChevronLeft, heroChevronRight } from '@ng-icons/heroicons/outline';

export type ModoInputFecha = 'fecha' | 'fecha-hora' | 'mes';
export type PosicionCalendario = 'arriba' | 'abajo';

@Component({
  selector: 'app-input-fecha',
  standalone: true,
  imports: [NgIcon],
  providers: [
    provideIcons({ heroCalendarDays, heroChevronLeft, heroChevronRight }),
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputFechaComponent),
      multi: true,
    },
  ],
  templateUrl: './input-fecha.component.html',
  styleUrl: './input-fecha.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputFechaComponent implements ControlValueAccessor, OnDestroy {
  readonly etiqueta = input('');
  readonly valorInicial = input('');
  readonly requerido = input(false);
  readonly modo = input<ModoInputFecha>('fecha');
  readonly ariaLabel = input('Seleccionar fecha');
  readonly id = input('');
  readonly minimo = input('');
  readonly maximo = input('');
  readonly diasPermitidos = input<readonly number[]>([]);
  readonly posicionCalendario = input<PosicionCalendario>('abajo');
  /** Muestra el calendario visual de la aplicación en lugar del selector nativo. */
  readonly usarCalendarioCustom = input(false);
  readonly colorPrimario = input('var(--app-accent)');
  readonly valorCambiado = output<string>();

  @ViewChild('campoFecha') private readonly campoFecha?: ElementRef<HTMLInputElement>;
  @ViewChildren('segmento') private readonly segmentos?: QueryList<ElementRef<HTMLInputElement>>;
  @ViewChild('controlCalendario') private readonly controlCalendario?: ElementRef<HTMLElement>;
  @ViewChild('campoCalendarioNativo')
  private readonly campoCalendarioNativo?: ElementRef<HTMLInputElement>;

  protected valor = '';
  protected dia = '';
  protected mes = '';
  protected anio = '';
  protected hora = '';
  protected minuto = '';
  protected deshabilitado = false;
  protected readonly calendarioAbierto = signal(false);
  protected readonly posicionOverlayCalendario = signal({ arriba: 0, izquierda: 0 });
  protected readonly mesVisible = signal(this.inicioDeMes(new Date()));
  private readonly platformId = inject(PLATFORM_ID);
  private readonly documento = inject(DOCUMENT);
  private readonly actualizarPosicionOverlay = () => this.actualizarPosicionCalendario();
  private readonly manejarClickFueraCalendario = (evento: Event) => {
    const control = this.controlCalendario?.nativeElement;
    const objetivo = evento.target;
    if (control && objetivo instanceof Node && !control.contains(objetivo)) {
      this.cerrarCalendario();
    }
  };
  private onChange: (valor: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  constructor() {
    effect(() => this.writeValue(this.valorInicial()));
  }

  ngOnDestroy(): void {
    this.removerListenersOverlay();
  }

  writeValue(valor: string | null): void {
    this.valor = this.esValorValido(valor ?? '') ? valor ?? '' : '';
    this.asignarSegmentos(this.valor);
    if (this.modo() === 'fecha' && this.valor) {
      this.mesVisible.set(this.inicioDeMes(this.crearFecha(this.valor)));
    }
  }

  registerOnChange(fn: (valor: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(deshabilitado: boolean): void {
    this.deshabilitado = deshabilitado;
  }

  protected abrirPicker(): void {
    if (this.deshabilitado || this.modo() === 'mes') return;

    if (this.modo() === 'fecha-hora' || !this.usarCalendarioCustom()) {
      this.abrirPickerNativo();
      return;
    }

    this.mesVisible.set(this.inicioDeMes(this.valor ? this.crearFecha(this.valor) : new Date()));
    if (this.calendarioAbierto()) {
      this.cerrarCalendario();
    } else {
      this.calendarioAbierto.set(true);
      this.agregarListenersOverlay();
      requestAnimationFrame(() => this.actualizarPosicionCalendario());
    }
  }

  protected cambiarSegmento(
    segmento: 'dia' | 'mes' | 'anio' | 'hora' | 'minuto',
    evento: Event,
  ): void {
    const campo = evento.target as HTMLInputElement;
    const maximo = segmento === 'anio' ? 4 : 2;
    const valorSegmento = campo.value.replace(/\D/g, '').slice(0, maximo);
    campo.value = valorSegmento;
    this[segmento] = valorSegmento;
    if (valorSegmento.length === maximo) this.enfocarSiguiente(campo);

    const valor = this.aValorInterno(this.textoSegmentado());

    if (valor === null) {
      this.actualizarValidez(
        this.tieneAlgunSegmento() ? this.mensajeFormatoInvalido() : '',
        campo,
      );
      if (!this.tieneAlgunSegmento()) this.emitirValor('');
      return;
    }

    if (valor && !this.esValorPermitido(valor)) {
      this.actualizarValidez(this.mensajeRestriccion(valor), campo);
      return;
    }

    this.actualizarValidez('', campo);
    this.emitirValor(valor);
  }

  protected manejarTeclaSegmento(evento: KeyboardEvent): void {
    const campo = evento.target as HTMLInputElement;
    if (evento.key === 'ArrowLeft') {
      evento.preventDefault();
      this.enfocarAnterior(campo);
    } else if (evento.key === 'ArrowRight') {
      evento.preventDefault();
      this.enfocarSiguiente(campo);
    } else if (evento.key === 'Backspace' && !campo.value) {
      evento.preventDefault();
      this.enfocarAnterior(campo);
    }
  }

  protected seleccionarSegmento(evento: FocusEvent | MouseEvent): void {
    (evento.target as HTMLInputElement).select();
  }

  protected marcarTocado(): void {
    this.onTouched();
  }

  protected seleccionarDia(fecha: Date): void {
    if (!this.esFechaSeleccionable(fecha)) return;
    this.cerrarCalendario();
    this.emitirValor(this.formatearFecha(fecha));
    this.asignarSegmentos(this.valor);
    this.actualizarValidez('');
    this.onTouched();
  }

  protected seleccionarFechaNativa(evento: Event): void {
    const campo = evento.target as HTMLInputElement;
    const valor = this.modo() === 'fecha-hora'
      ? `${campo.value}T${this.hora && this.minuto ? `${this.hora}:${this.minuto}` : '00:00'}`
      : campo.value;
    if (!valor || !this.esValorPermitido(valor)) {
      campo.value = this.valor;
      this.actualizarValidez(valor ? this.mensajeRestriccion(valor) : '', campo);
      return;
    }

    this.emitirValor(valor);
    this.asignarSegmentos(this.valor);
    this.actualizarValidez('');
    this.onTouched();
  }

  protected cambiarMes(desplazamiento: number): void {
    const mes = this.mesVisible();
    this.mesVisible.set(new Date(mes.getFullYear(), mes.getMonth() + desplazamiento, 1));
  }

  protected diasDelCalendario(): Date[] {
    const primerDia = this.mesVisible();
    const inicio = new Date(primerDia.getFullYear(), primerDia.getMonth(), 1 - primerDia.getDay());
    return Array.from({ length: 42 }, (_, indice) => new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + indice));
  }

  protected esFechaSeleccionable(fecha: Date): boolean {
    return this.esValorPermitido(this.formatearFecha(fecha));
  }

  protected esMesVisible(fecha: Date): boolean {
    return fecha.getMonth() === this.mesVisible().getMonth();
  }

  protected esDiaSeleccionado(fecha: Date): boolean {
    return this.formatearFecha(fecha) === this.valor;
  }

  protected nombreMesVisible(): string {
    const mes = String(this.mesVisible().getMonth() + 1).padStart(2, '0');
    return `${mes}/${this.mesVisible().getFullYear()}`;
  }

  private esValorValido(valor: string): boolean {
    const patron = this.modo() === 'fecha'
      ? /^\d{4}-\d{2}-\d{2}$/
      : this.modo() === 'mes'
        ? /^\d{4}-\d{2}$/
        : /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
    return !valor || patron.test(valor);
  }

  private asignarSegmentos(valor: string): void {
    this.dia = '';
    this.mes = '';
    this.anio = '';
    this.hora = '';
    this.minuto = '';
    if (!valor) return;

    if (this.modo() === 'mes') {
      const coincidenciaMes = valor.match(/^(\d{4})-(\d{2})$/);
      this.anio = coincidenciaMes?.[1] ?? '';
      this.mes = coincidenciaMes?.[2] ?? '';
      return;
    }

    const coincidencia = valor.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/);
    this.anio = coincidencia?.[1] ?? '';
    this.mes = coincidencia?.[2] ?? '';
    this.dia = coincidencia?.[3] ?? '';
    this.hora = coincidencia?.[4] ?? '';
    this.minuto = coincidencia?.[5] ?? '';
  }

  private textoSegmentado(): string {
    if (this.modo() === 'mes') return `${this.mes}/${this.anio}`;
    const fecha = `${this.dia}/${this.mes}/${this.anio}`;
    return this.modo() === 'fecha-hora' ? `${fecha} ${this.hora}:${this.minuto}` : fecha;
  }

  private tieneAlgunSegmento(): boolean {
    return !!(this.dia || this.mes || this.anio || this.hora || this.minuto);
  }

  private actualizarValidez(mensaje: string, campo?: HTMLInputElement): void {
    campo?.setCustomValidity(mensaje);
    this.segmentos?.forEach((segmento) => segmento.nativeElement.setCustomValidity(mensaje));
    const campoPrincipal = this.campoFecha?.nativeElement;
    if (campoPrincipal && campoPrincipal !== campo) campoPrincipal.setCustomValidity(mensaje);
  }

  private enfocarSiguiente(campo: HTMLInputElement): void {
    this.enfocarSegmento(campo, 1);
  }

  private enfocarAnterior(campo: HTMLInputElement): void {
    this.enfocarSegmento(campo, -1);
  }

  private enfocarSegmento(campo: HTMLInputElement, desplazamiento: number): void {
    const segmentos = this.segmentos?.toArray() ?? [];
    const indice = segmentos.findIndex((item) => item.nativeElement === campo);
    const siguiente = segmentos[indice + desplazamiento]?.nativeElement;
    if (!siguiente) return;

    siguiente.focus();
    siguiente.select();
  }

  private aValorInterno(texto: string): string | null {
    if (!texto) return '';
    if (this.modo() === 'mes') return this.aMesInterno(texto);
    if (this.modo() === 'fecha-hora') return this.aFechaHoraInterna(texto);
    return this.aFechaInterna(texto);
  }

  private aFechaInterna(texto: string): string | null {
    const coincidencia = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!coincidencia) return null;

    const [, diaTexto, mesTexto, anioTexto] = coincidencia;
    return this.esFechaReal(anioTexto, mesTexto, diaTexto)
      ? `${anioTexto}-${mesTexto}-${diaTexto}`
      : null;
  }

  private aMesInterno(texto: string): string | null {
    const coincidencia = texto.match(/^(\d{2})\/(\d{4})$/);
    if (!coincidencia) return null;

    const [, mesTexto, anioTexto] = coincidencia;
    const mes = Number(mesTexto);
    const anio = Number(anioTexto);
    return mes >= 1 && mes <= 12 && anio >= 1 ? `${anioTexto}-${mesTexto}` : null;
  }

  private aFechaHoraInterna(texto: string): string | null {
    const coincidencia = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})\s(\d{2}):(\d{2})$/);
    if (!coincidencia) return null;

    const [, diaTexto, mesTexto, anioTexto, horaTexto, minutoTexto] = coincidencia;
    const hora = Number(horaTexto);
    const minuto = Number(minutoTexto);
    if (!this.esFechaReal(anioTexto, mesTexto, diaTexto) || hora > 23 || minuto > 59) return null;

    return `${anioTexto}-${mesTexto}-${diaTexto}T${horaTexto}:${minutoTexto}`;
  }

  private esFechaReal(anioTexto: string, mesTexto: string, diaTexto: string): boolean {
    const anio = Number(anioTexto);
    const mes = Number(mesTexto);
    const dia = Number(diaTexto);
    if (anio < 1 || mes < 1 || mes > 12) return false;

    const fecha = new Date(anio, mes - 1, dia);
    return (
      fecha.getFullYear() === anio &&
      fecha.getMonth() === mes - 1 &&
      fecha.getDate() === dia
    );
  }

  private esValorPermitido(valor: string): boolean {
    if ((this.minimo() && valor < this.minimo()) || (this.maximo() && valor > this.maximo())) {
      return false;
    }

    if (this.modo() !== 'fecha' || !this.diasPermitidos().length) return true;
    return this.diasPermitidos().includes(this.crearFecha(valor).getDay());
  }

  private mensajeFormatoInvalido(): string {
    return this.modo() === 'fecha'
      ? 'Ingresá una fecha válida con formato dd/mm/aaaa.'
      : this.modo() === 'mes'
        ? 'Ingresá un mes válido con formato mm/aaaa.'
        : 'Ingresá una fecha y hora válida con formato dd/mm/aaaa HH:mm.';
  }

  private mensajeRestriccion(valor: string): string {
    if (this.minimo() && valor < this.minimo()) return 'La fecha es anterior al mínimo permitido.';
    if (this.maximo() && valor > this.maximo()) return 'La fecha es posterior al máximo permitido.';
    return 'La fecha no está disponible.';
  }

  private emitirValor(valor: string): void {
    this.valor = valor;
    this.onChange(valor);
    this.valorCambiado.emit(valor);
  }

  private crearFecha(valor: string): Date {
    const [anio, mes, dia] = valor.slice(0, 10).split('-').map(Number);
    return new Date(anio, mes - 1, dia);
  }

  private inicioDeMes(fecha: Date): Date {
    return new Date(fecha.getFullYear(), fecha.getMonth(), 1);
  }

  private formatearFecha(fecha: Date): string {
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
  }

  private abrirPickerNativo(): void {
    const campo = this.campoCalendarioNativo?.nativeElement;
    if (!campo) return;

    campo.value = this.modo() === 'fecha-hora' ? this.valor.slice(0, 10) : this.valor;
    if (typeof campo.showPicker === 'function') {
      campo.showPicker();
      return;
    }
    campo.focus();
    campo.click();
  }

  private cerrarCalendario(): void {
    this.calendarioAbierto.set(false);
    this.removerListenersOverlay();
  }

  private agregarListenersOverlay(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    window.addEventListener('resize', this.actualizarPosicionOverlay);
    window.addEventListener('scroll', this.actualizarPosicionOverlay, true);
    this.documento.addEventListener('pointerdown', this.manejarClickFueraCalendario, true);
  }

  private removerListenersOverlay(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    window.removeEventListener('resize', this.actualizarPosicionOverlay);
    window.removeEventListener('scroll', this.actualizarPosicionOverlay, true);
    this.documento.removeEventListener('pointerdown', this.manejarClickFueraCalendario, true);
  }

  private actualizarPosicionCalendario(): void {
    if (!isPlatformBrowser(this.platformId) || !this.calendarioAbierto()) return;
    const control = this.controlCalendario?.nativeElement;
    if (!control) return;

    const rect = control.getBoundingClientRect();
    const anchoCalendario = Math.min(320, window.innerWidth - 32);
    const izquierda = Math.min(Math.max(16, rect.left), window.innerWidth - anchoCalendario - 16);
    const altoEstimado = 360;
    const usarArriba = this.posicionCalendario() === 'arriba'
      || rect.bottom + altoEstimado > window.innerHeight - 16;
    const arriba = usarArriba
      ? Math.max(16, rect.top - altoEstimado - 7)
      : rect.bottom + 7;

    this.posicionOverlayCalendario.set({ arriba, izquierda });
  }
}
