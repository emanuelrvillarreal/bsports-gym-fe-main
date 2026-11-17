import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  PLATFORM_ID,
  QueryList,
  Renderer2,
  ViewChild,
  ViewChildren,
  forwardRef,
  inject,
  input,
  output,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { calcularEstilosPanelSelect } from '../../../helpers/select-panel.helpers';
import { BotonComponent } from '../boton/boton.component';

export interface SelectOption {
  readonly value: string;
  /** Texto completo: se muestra en el control una vez elegida la opción y lo leen los lectores de pantalla. */
  readonly label: string;
  readonly disabled?: boolean;
  /** Opción "rica" (opcional): título principal en el panel. Si falta, se usa `label`. */
  readonly titulo?: string;
  /** Opción "rica" (opcional): segunda línea con más información. */
  readonly detalle?: string;
  /** Opción "rica" (opcional): etiqueta destacada a la derecha, por ejemplo "50%". */
  readonly badge?: string;
}

@Component({
  selector: 'app-select',
  imports: [BotonComponent],
  standalone: true,
  templateUrl: './select.component.html',
  styleUrl: './select.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectComponent),
      multi: true,
    },
  ],
})
export class SelectComponent implements ControlValueAccessor, AfterViewInit, OnDestroy {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly renderer = inject(Renderer2);
  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;
  private contenedorPanel: HTMLElement | null = null;
  private animationFrameId: number | null = null;

  readonly opciones = input<readonly SelectOption[]>([]);
  readonly altoRendimiento = input(false);
  readonly placeholder = input('Seleccionar');
  readonly etiqueta = input('');
  readonly value = input('');
  /** Deshabilita el control sin depender de un formulario reactivo. */
  readonly deshabilitadoExterno = input(false, { alias: 'deshabilitado' });
  /** Limita la altura del panel a la cantidad indicada de opciones visibles. */
  readonly maximoOpcionesVisibles = input<number | null>(null);
  readonly valueChange = output<string>();

  @ViewChild('control', { static: true }) private readonly controlRef?: BotonComponent;
  @ViewChild('panel', { static: true }) private readonly panelRef?: ElementRef<HTMLDivElement>;
  @ViewChildren('opcionBoton') private readonly opcionRefs?: QueryList<BotonComponent>;

  protected valorInterno = '';
  protected abierto = false;
  protected deshabilitado = false;
  protected indiceEnfocado = -1;

  private get esNavegador(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  constructor(private readonly elementRef: ElementRef<HTMLElement>) {}

  ngAfterViewInit(): void {
    this.montarPanelEnPortal();
    this.actualizarPosicionPanel();
  }

  ngOnDestroy(): void {
    this.detenerSeguimientoPosicion();
    this.restaurarPanel();
  }

  protected get valorActual(): string {
    // El valor controlado por el padre debe prevalecer para evitar que el
    // selector muestre una opción anterior después de cambiar el contexto.
    return this.value() || this.valorInterno;
  }

  protected get estaDeshabilitado(): boolean {
    return this.deshabilitado || this.deshabilitadoExterno();
  }

  protected get textoSeleccionado(): string {
    const opcion = this.opciones().find((item) => item.value === this.valorActual);
    return opcion?.label ?? this.placeholder();
  }

  protected alternar(): void {
    if (this.estaDeshabilitado) {
      return;
    }

    this.abierto = !this.abierto;
    this.indiceEnfocado = this.abierto ? this.obtenerIndiceInicial() : -1;
    this.sincronizarPanel();
  }

  protected seleccionar(opcion: SelectOption): void {
    if (opcion.disabled || this.estaDeshabilitado) {
      return;
    }

    this.valorInterno = opcion.value;
    this.abierto = false;
    this.indiceEnfocado = -1;
    this.sincronizarPanel();
    this.onChange(opcion.value);
    this.onTouched();
    this.valueChange.emit(opcion.value);
    this.notificarCambioFormulario();
    this.enfocarControl();
  }

  protected cerrar(): void {
    this.abierto = false;
    this.indiceEnfocado = -1;
    this.sincronizarPanel();
    this.onTouched();
    this.enfocarControl();
  }

  protected marcarTocado(): void {
    this.onTouched();
  }

  writeValue(value: string | null): void {
    this.valorInterno = value ?? '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.deshabilitado = isDisabled;
    if (isDisabled) {
      this.abierto = false;
      this.indiceEnfocado = -1;
    }

    this.sincronizarPanel();
  }

  @HostListener('document:pointerdown', ['$event'])
  protected cerrarDesdeAfuera(evento: PointerEvent): void {
    const objetivo = evento.target as Node | null;
    const panel = this.panelRef?.nativeElement;

    if (
      objetivo &&
      !this.elementRef.nativeElement.contains(objetivo) &&
      !panel?.contains(objetivo)
    ) {
      this.abierto = false;
      this.sincronizarPanel();
    }
  }

  @HostListener('keydown.escape')
  protected manejarEscape(): void {
    this.cerrar();
  }

  protected manejarTecladoControl(evento: KeyboardEvent): void {
    if (this.estaDeshabilitado) {
      return;
    }

    if (evento.key === 'Enter' || evento.key === ' ') {
      evento.preventDefault();
      this.alternar();
      return;
    }

    if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
      evento.preventDefault();

      if (!this.abierto) {
        this.abierto = true;
        this.indiceEnfocado = this.obtenerIndiceInicial(evento.key === 'ArrowUp');
        this.sincronizarPanel();
        return;
      }

      this.moverFoco(evento.key === 'ArrowDown' ? 1 : -1);
    }
  }

  protected manejarTecladoPanel(evento: KeyboardEvent): void {
    if (!this.abierto) {
      return;
    }

    if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
      evento.preventDefault();
      this.moverFoco(evento.key === 'ArrowDown' ? 1 : -1);
      return;
    }

    if (evento.key === 'Home' || evento.key === 'End') {
      evento.preventDefault();
      this.enfocarIndice(this.obtenerIndiceInicial(evento.key === 'End'));
      return;
    }

    if (evento.key === 'Enter' || evento.key === ' ') {
      evento.preventDefault();
      const opcion = this.opciones()[this.indiceEnfocado];
      if (opcion && !opcion.disabled) {
        this.seleccionar(opcion);
      }
    }
  }

  @HostListener('window:resize')
  @HostListener('window:scroll')
  protected actualizarPosicionEnViewport(): void {
    if (this.abierto) {
      this.actualizarPosicionPanel();
    }
  }

  private sincronizarPanel(): void {
    if (!this.esNavegador || !this.panelRef) {
      return;
    }

    if (this.abierto) {
      this.montarPanelEnPortal();
      this.actualizarPosicionPanel();
      this.iniciarSeguimientoPosicion();
      this.enfocarOpcionActiva();
      return;
    }

    this.detenerSeguimientoPosicion();
    this.actualizarPosicionPanel();
  }

  private montarPanelEnPortal(): void {
    const panel = this.panelRef?.nativeElement;
    const contenedor =
      this.elementRef.nativeElement.closest<HTMLDialogElement>('dialog') ?? this.document.body;

    if (
      !this.esNavegador ||
      !this.esElementoDom(panel) ||
      !contenedor ||
      this.contenedorPanel === contenedor
    ) {
      return;
    }

    if (this.contenedorPanel?.contains(panel)) {
      this.renderer.removeChild(this.contenedorPanel, panel);
    }

    this.renderer.appendChild(contenedor, panel);
    this.contenedorPanel = contenedor;
  }

  private restaurarPanel(): void {
    const panel = this.panelRef?.nativeElement;
    const contenedor = this.contenedorPanel;

    if (
      !this.esNavegador ||
      !this.esElementoDom(panel) ||
      !contenedor ||
      !contenedor.contains(panel)
    ) {
      return;
    }

    this.renderer.removeChild(contenedor, panel);
    this.contenedorPanel = null;
  }

  private actualizarPosicionPanel(): void {
    const panel = this.panelRef?.nativeElement;
    const control = this.controlRef?.obtenerElementoNativo();
    const body = this.document.body;
    const view = this.document.defaultView;

    if (
      !this.esNavegador ||
      !this.esElementoDom(panel) ||
      !this.esElementoDom(control) ||
      !body ||
      !view
    ) {
      return;
    }

    const maximoOpcionesVisibles = this.maximoOpcionesVisibles();
    const altoMaximoOpciones = maximoOpcionesVisibles && maximoOpcionesVisibles > 0
      ? maximoOpcionesVisibles * 36 + 8
      : null;
    const altoContenido = altoMaximoOpciones === null
      ? panel.scrollHeight || 0
      : Math.min(panel.scrollHeight || 0, altoMaximoOpciones);
    const estilos = calcularEstilosPanelSelect(
      control.getBoundingClientRect(),
      view.innerWidth,
      view.innerHeight,
      altoContenido,
    );
    const altoMaximo = altoMaximoOpciones === null
      ? estilos.maxHeight
      : `${Math.min(Number.parseFloat(estilos.maxHeight), altoMaximoOpciones)}px`;

    this.renderer.setStyle(panel, 'width', estilos.width);
    this.renderer.setStyle(panel, 'left', estilos.left);
    this.renderer.setStyle(panel, 'top', estilos.top);
    this.renderer.setStyle(panel, 'max-height', altoMaximo);
  }

  private iniciarSeguimientoPosicion(): void {
    if (!this.esNavegador || this.animationFrameId !== null || this.altoRendimiento()) {
      return;
    }

    const view = this.document.defaultView;
    if (!view) {
      return;
    }

    const tick = (): void => {
      if (!this.abierto) {
        this.animationFrameId = null;
        return;
      }

      this.actualizarPosicionPanel();
      this.animationFrameId = view.requestAnimationFrame(tick);
    };

    this.animationFrameId = view.requestAnimationFrame(tick);
  }

  private detenerSeguimientoPosicion(): void {
    const view = this.document.defaultView;
    if (!view || this.animationFrameId === null) {
      return;
    }

    view.cancelAnimationFrame(this.animationFrameId);
    this.animationFrameId = null;
  }

  private esElementoDom(elemento: unknown): elemento is HTMLElement {
    return !!elemento && typeof (elemento as HTMLElement).getBoundingClientRect === 'function';
  }

  private obtenerIndiceInicial(desdeElFinal = false): number {
    const opciones = this.opciones();
    const indiceSeleccionado = opciones.findIndex(
      (opcion) => opcion.value === this.valorActual && !opcion.disabled,
    );

    if (indiceSeleccionado >= 0) {
      return indiceSeleccionado;
    }

    const indices = opciones
      .map((opcion, indice) => ({ opcion, indice }))
      .filter(({ opcion }) => !opcion.disabled)
      .map(({ indice }) => indice);

    if (!indices.length) {
      return -1;
    }

    return desdeElFinal ? indices[indices.length - 1] : indices[0];
  }

  private moverFoco(direccion: 1 | -1): void {
    const opciones = this.opciones();
    if (!opciones.length) {
      return;
    }

    let indice = this.indiceEnfocado;
    if (indice < 0) {
      indice = this.obtenerIndiceInicial(direccion < 0);
    }

    for (let intento = 0; intento < opciones.length; intento += 1) {
      indice = (indice + direccion + opciones.length) % opciones.length;
      if (!opciones[indice]?.disabled) {
        this.enfocarIndice(indice);
        return;
      }
    }
  }

  private enfocarIndice(indice: number): void {
    this.indiceEnfocado = indice;
    this.enfocarOpcionActiva();
  }

  private enfocarOpcionActiva(): void {
    if (!this.esNavegador || this.indiceEnfocado < 0) {
      return;
    }

    queueMicrotask(() => {
      const boton = this.opcionRefs?.get(this.indiceEnfocado);
      boton?.enfocar();
      boton?.obtenerElementoNativo().scrollIntoView?.({ block: 'nearest' });
    });
  }

  private enfocarControl(): void {
    if (!this.esNavegador) {
      return;
    }

    queueMicrotask(() => this.controlRef?.enfocar());
  }

  private notificarCambioFormulario(): void {
    const Evento = this.document.defaultView?.Event;
    if (!Evento) return;

    this.elementRef.nativeElement.dispatchEvent(new Evento('change', { bubbles: true }));
  }
}
