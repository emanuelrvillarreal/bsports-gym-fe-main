import { DOCUMENT, NgClass, NgTemplateOutlet } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  NgZone,
  OnDestroy,
  Renderer2,
  RendererFactory2,
  TemplateRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { provideTablaResponsiveIcons } from '../../../core/icons/app-icons.registry';
import { limitarAnio } from '../../../helpers/anio-formato';
import { parsearFechaApi } from '../../../helpers/fecha-api';
import { formatearDni } from '../../../helpers/dni-formato';
import { limpiarDni } from '../../../helpers/dni-formato';
import { formatearMoneda } from '../../../helpers/moneda-formato';
import { formatearTelefono } from '../../../helpers/telefono-formato';
import { limpiarTelefono } from '../../../helpers/telefono-formato';
import {
  obtenerInicialesDesdeNombreApellido,
  obtenerNombreCompletoDesdeNombreApellido,
} from '../../../helpers/tabla-avatar-nombre.helpers';
import { obtenerClaseChipCupo } from '../../../helpers/tabla-chip-cupo.helpers';
import {
  formatearEstadoTabla,
  obtenerClaseEstadoTabla,
  resolverEstadoTabla,
} from '../../../helpers/tabla-estado.helpers';
import { autocompletarHoraFinTrInput } from '../../../helpers/tabla-hora-fin.helpers';
import { obtenerColorTextoMonto } from '../../../helpers/tabla-monto-color.helpers';
import type { TooltipTablaState } from '../../../helpers/tabla-tooltip.helpers';
import { LoadSpinnerComponent } from '../load-spinner/load-spinner.component';
import { LoadSpinnerBlueComponent } from '../load-spinner-blue/load-spinner-blue.component';
import {
  destruirTooltipTablaEnBody,
  renderizarTooltipTablaEnBody,
} from './tabla-responsive-tooltip.renderer';
import { SelectComponent, SelectOption } from '../select/select.component';
import { BotonComponent } from '../boton/boton.component';

export type TipoColumnaTabla =
  | 'texto'
  | 'numero'
  | 'fecha'
  | 'moneda'
  | 'estado'
  | 'avatar'
  | 'chips'
  | 'horario';
export type FilaTabla = object;
export type ValorInputTabla = string | number | boolean | readonly string[] | readonly number[];
export type AccionTablaPredefinida = 'agregar' | 'borrar' | 'editar' | 'ver' | 'inscribir';

export type EstadoAccionTabla<T extends FilaTabla> = boolean | ((fila: T) => boolean);
export type ColorAccionTabla<T extends FilaTabla> = string | ((fila: T) => string);

export interface AccionTablaPredefinidaConfigurada<T extends FilaTabla = FilaTabla> {
  readonly predefinida: AccionTablaPredefinida;
  readonly visible?: EstadoAccionTabla<T>;
  readonly deshabilitada?: EstadoAccionTabla<T>;
  readonly cargando?: EstadoAccionTabla<T>;
  /** Acción que queda a la vista cuando el resto pasa al menú ⋯. Por defecto, la primera no destructiva. */
  readonly principal?: boolean;
  /** Acción irreversible (baja, borrar): va al final del menú, en rojo y separada. */
  readonly destructiva?: boolean;
}

export interface AccionTablaPersonalizada<T extends FilaTabla = FilaTabla> {
  readonly id: string;
  readonly texto: string;
  /** Nombre de un icono registrado en `@ng-icons/core`. */
  readonly icono: string;
  /** Asset opcional para conservar el botón nativo con una marca externa. */
  readonly imagenIcono?: string;
  /** Pinta el asset con el gradiente de marca mediante máscara CSS. */
  readonly imagenIconoConGradiente?: boolean;
  /** Muestra el texto de la acción dentro del botón, además del tooltip accesible. */
  readonly mostrarTexto?: boolean;
  /** Token CSS recomendado, por ejemplo `var(--app-accent)`. */
  readonly color: ColorAccionTabla<T>;
  readonly visible?: EstadoAccionTabla<T>;
  readonly deshabilitada?: EstadoAccionTabla<T>;
  /** Explicación visible al pasar sobre una acción deshabilitada. */
  readonly descripcionDeshabilitada?: string;
  readonly cargando?: EstadoAccionTabla<T>;
  /** Acción que queda a la vista cuando el resto pasa al menú ⋯. Por defecto, la primera no destructiva. */
  readonly principal?: boolean;
  /** Acción irreversible (baja, borrar): va al final del menú, en rojo y separada. */
  readonly destructiva?: boolean;
}

export type AccionTabla<T extends FilaTabla = FilaTabla> =
  | AccionTablaPredefinida
  | AccionTablaPredefinidaConfigurada<T>
  | AccionTablaPersonalizada<T>;

export interface EventoAccionTabla<T extends FilaTabla = FilaTabla> {
  readonly accion: string;
  readonly fila: T;
}

export interface AccionCabeceraTabla {
  readonly id: string;
  readonly texto: string;
  readonly deshabilitada?: boolean;
  readonly abreDialogo?: boolean;
}

export interface FiltroCabeceraTabla {
  readonly id: string;
  readonly texto: string;
  readonly activo: boolean;
  readonly deshabilitado?: boolean;
  /** Variante visual para controles binarios que deben convivir con HOLD. */
  readonly variante?: 'switch' | 'hold';
  /** Acento opcional para la variante HOLD. */
  readonly acento?: 'primario';
  /** Mantiene el estado visual hasta que el contenedor confirme el cambio. */
  readonly confirmacionRequerida?: boolean;
}

export interface EventoFiltroCabeceraTabla {
  readonly id: string;
  readonly activo: boolean;
}

type VarianteAccionTabla = 'accent' | 'custom' | 'danger' | 'neutral' | 'success' | 'warning';

interface AccionTablaResuelta<T extends FilaTabla> {
  readonly id: string;
  readonly predefinida?: AccionTablaPredefinida;
  readonly texto: string;
  readonly icono: string;
  readonly imagenIcono?: string;
  readonly imagenIconoConGradiente?: boolean;
  readonly mostrarTexto?: boolean;
  readonly variante: VarianteAccionTabla;
  readonly color?: ColorAccionTabla<T>;
  readonly visible?: EstadoAccionTabla<T>;
  readonly deshabilitada?: EstadoAccionTabla<T>;
  readonly descripcionDeshabilitada?: string;
  readonly cargando?: EstadoAccionTabla<T>;
  readonly principal?: boolean;
  readonly destructiva?: boolean;
}

/** Menú ⋯ abierto para una fila: se dibuja en la capa superior, junto al botón que lo abrió. */
interface MenuAccionesTabla<T extends FilaTabla> {
  readonly fila: T;
  readonly filaId: string;
  readonly acciones: readonly AccionTablaResuelta<T>[];
  readonly top: number;
  readonly left: number;
  readonly haciaArriba: boolean;
}

const ACCIONES_TABLA_PREDEFINIDAS: Record<
  AccionTablaPredefinida,
  Pick<AccionTablaResuelta<FilaTabla>, 'texto' | 'icono' | 'variante'>
> = {
  agregar: { texto: 'Agregar', icono: 'heroPlus', variante: 'success' },
  borrar: { texto: 'Borrar', icono: 'heroTrash', variante: 'danger' },
  editar: { texto: 'Editar', icono: 'heroPencilSquare', variante: 'warning' },
  ver: { texto: 'Ver', icono: 'heroEye', variante: 'neutral' },
  inscribir: { texto: 'Inscribir', icono: 'heroUserPlus', variante: 'accent' },
};

/** `:popover-open` no existe en navegadores viejos ni en jsdom: ahí el menú se considera cerrado. */
function popoverAbierto(elemento: HTMLElement): boolean {
  try {
    return elemento.matches(':popover-open');
  } catch {
    return false;
  }
}

const MEDIA_CARDS_TABLA = '(max-width: 800px)';

export interface OpcionInputTabla {
  readonly value: string;
  readonly label: string;
}

export interface ColumnaTabla<T extends FilaTabla = FilaTabla> {
  readonly id: keyof T & string;
  readonly titulo: string;
  readonly tipo?: TipoColumnaTabla;
  readonly avatarMostrarNombre?: boolean;
  readonly trInputTipo?: 'input' | 'select' | 'chips-multi';
  readonly trInputKey?: string;
  readonly trInputEditable?: boolean;
  /** Determina si la columna se muestra mientras se completa una fila editable. */
  readonly trInputVisible?: (
    valores: Partial<Record<string, ValorInputTabla>>,
  ) => boolean;
  readonly inputType?: 'text' | 'number' | 'date' | 'time' | 'datetime-local';
  readonly inputMode?: 'text' | 'numeric' | 'decimal' | 'email' | 'tel';
  readonly inputFormatter?: 'dni' | 'telefono';
  readonly maxLength?: number;
  readonly min?: string | number;
  readonly max?: string | number;
  readonly pattern?: string;
  readonly opciones?: readonly OpcionInputTabla[];
  /** @deprecated Sin efecto en render; reservado por compatibilidad. */
  readonly prioridadMobile?: boolean;
  readonly ancho?: string;
  /** Override: iniciales avatar (default nombre + apellido). */
  readonly avatarIniciales?: (fila: T) => string;
  /** Override: nombre visible avatar (default nombre + apellido). */
  readonly avatarNombre?: (fila: T) => string;
  /** Override: clase CSS estado (default convenciones cuotas/asistencia). */
  readonly estadoClase?: (valor: unknown, fila: T) => string | null;
  /** Override: texto estado (default formatearEstadoTabla). */
  readonly estadoTexto?: (valor: unknown, fila: T) => string;
  /** Override: color celda (default columna `monto`). */
  readonly celdaColor?: (valor: unknown, fila: T) => string | null;
  /** Clase CSS condicional para el texto visible de la celda. */
  readonly celdaClase?: (valor: unknown, fila: T) => string | null;
  /** Override: texto visible de la celda. */
  readonly formatearTexto?: (valor: unknown, fila: T) => string;
  /** Override: clase chip (default columna `cuposDisponibles`). */
  readonly chipClase?: (item: string, fila: T) => string | null;
  /** Override: autocompletar valores tr_input tras editar celda. */
  readonly trInputAutocompletar?: (
    valores: Partial<Record<string, ValorInputTabla>>,
    contexto: { clave: string; valor: ValorInputTabla },
  ) => void;
}

@Component({
  selector: 'app-tabla-responsive',
  standalone: true,
  imports: [
    BotonComponent,
    NgClass,
    NgIcon,
    NgTemplateOutlet,
    SelectComponent,
    LoadSpinnerComponent,
    LoadSpinnerBlueComponent,
  ],
  providers: [provideTablaResponsiveIcons()],
  templateUrl: './tabla-responsive.component.html',
  styleUrl: './tabla-responsive.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TablaResponsiveComponent<T extends FilaTabla = FilaTabla>
  implements AfterViewInit, OnDestroy
{
  readonly columnas = input<readonly ColumnaTabla<T>[]>([]);
  readonly filas = input<readonly T[]>([]);
  readonly filaClase = input<((fila: T) => string | null) | null>(null);
  readonly cargando = input(false);
  readonly altoRendimiento = input(false);
  /** Límite CSS opcional para habilitar scroll vertical dentro de la tabla. */
  readonly maxAltura = input<string | null>(null, { alias: 'max_altura' });
  readonly maxFilasVisibles = input<number | null>(null);
  readonly tbodyRows = input<number | null>(null, { alias: 'tbody_rows' });
  readonly vacioReservarFilas = input(true, { alias: 'vacio_reservar_filas' });
  readonly idFila = input<keyof T & string>('uid' as keyof T & string);
  readonly mensajeVacio = input('No hay registros para mostrar.');
  /** Plantillas opcionales para reemplazar el contenido de columnas puntuales. */
  readonly plantillasCeldas = input<
    Partial<Record<keyof T & string, TemplateRef<{ $implicit: T }>>>
  >({});
  readonly plantillaAcciones = input<TemplateRef<{ $implicit: T }> | null>(null);
  readonly acciones = input<readonly AccionTabla<T>[]>([]);
  readonly mostrarAcciones = input(true);
  readonly tituloAcciones = input('Acciones');
  /**
   * Cuántas acciones se muestran como botones en cada fila. Si la fila tiene más, queda visible
   * la principal y el resto se agrupa en un menú ⋯ para no tapar las columnas de datos.
   */
  readonly maxAccionesVisibles = input(2);
  readonly trInput = input(false, { alias: 'tr_input' });
  readonly trInputConmutador = input(true, { alias: 'tr_input_conmutador' });
  readonly trInputBotonAgregar = input(false, { alias: 'tr_input_boton_agregar' });
  readonly trInputBotonAgregarModo = input<'abrir-input' | 'emitir'>('abrir-input', {
    alias: 'tr_input_boton_agregar_modo',
  });
  readonly trInputBotonAgregarTexto = input('', { alias: 'tr_input_boton_agregar_texto' });
  readonly accionesCabecera = input<readonly AccionCabeceraTabla[]>([]);
  readonly filtrosCabecera = input<readonly FiltroCabeceraTabla[]>([]);
  readonly trInputMensaje = input('', { alias: 'tr_input_mensaje' });
  /** Muestra el progreso en Confirmar y evita envíos duplicados del formulario inline. */
  readonly trInputCargando = input(false, { alias: 'tr_input_cargando' });
  readonly trInputHoldControl = input(false, { alias: 'tr_input_hold_control' });
  readonly trInputHoldLabel = input('HOLD', { alias: 'tr_input_hold_label' });
  readonly trInputVisibleInicial = input(false, { alias: 'tr_input_visible_inicial' });
  readonly trInputVisible = input<boolean | null>(null, { alias: 'tr_input_visible' });
  readonly trInputVisibleVersion = input(0, { alias: 'tr_input_visible_version' });
  readonly trInputResetVersion = input(0, { alias: 'tr_input_reset_version' });
  /** Cierra la fila al cancelar, salvo que el control HOLD esté activo. */
  readonly trInputCerrarAlRestablecer = input(false, {
    alias: 'tr_input_cerrar_en_restablecer',
  });
  /** Texto opcional para la acción que limpia la fila de inputs. */
  readonly trInputTextoRestablecer = input('', { alias: 'tr_input_texto_restablecer' });
  /** Estado HOLD controlado desde fuera cuando la barra de alta no se renderiza en la tabla. */
  readonly trInputMantenerAbierto = input(false, { alias: 'tr_input_mantener_abierto' });
  readonly trInputFilaEditandoId = input<string | null>(null, {
    alias: 'tr_input_fila_editando_id',
  });
  readonly trInputValores = input<Partial<Record<string, ValorInputTabla>>>(
    {},
    {
      alias: 'tr_input_valores',
    },
  );
  readonly trInputValoresVersion = input(0, { alias: 'tr_input_valores_version' });
  readonly trInputCamposInvalidos = input<readonly string[]>([], {
    alias: 'tr_input_campos_invalidos',
  });
  readonly inputFiltroTiempo = input(false, { alias: 'input_filtro_tiempo' });
  readonly filtroTiempoAnio = input<string | number>('', { alias: 'filtro_tiempo_anio' });
  readonly filtroTiempoMes = input('', { alias: 'filtro_tiempo_mes' });
  readonly filtroTiempoOpcionesMes = input<readonly SelectOption[]>([], {
    alias: 'filtro_tiempo_opciones_mes',
  });
  readonly verFila = output<T>();
  /** Con `filaClickeable`, tocar la fila (fuera de botones y campos) la emite en `filaSeleccionada`. */
  readonly filaClickeable = input(false);
  readonly filaSeleccionada = output<T>();
  readonly accionFila = output<EventoAccionTabla<T>>();
  readonly trInputToggle = output<boolean>();
  readonly trInputChange = output<Partial<Record<string, ValorInputTabla>>>();
  readonly trInputSubmit = output<Partial<Record<string, ValorInputTabla>>>();
  readonly trInputReset = output<void>();
  readonly trInputNuevo = output<void>();
  readonly accionCabecera = output<string>();
  readonly filtroCabeceraCambiado = output<EventoFiltroCabeceraTabla>();
  readonly trInputHoldChange = output<boolean>();
  readonly filtroTiempoAnioChange = output<string>();
  readonly filtroTiempoMesChange = output<string>();
  readonly filtroTiempoAplicar = output<void>();
  readonly filtroTiempoReset = output<void>();

  protected readonly valoresTrInput = signal<Partial<Record<string, ValorInputTabla>>>({});
  protected readonly versionTrInput = signal(0);
  protected readonly filaInputVisible = signal(false);
  protected readonly trInputHoldActivo = signal(false);
  protected readonly tooltipActual = signal<TooltipTablaState | null>(null);
  protected readonly indiceCardActiva = signal(0);
  protected readonly accionesResueltas = computed<readonly AccionTablaResuelta<T>[]>(() => {
    const acciones = this.acciones();
    const accionesConFallback: readonly AccionTabla<T>[] = acciones.length ? acciones : ['ver'];
    return accionesConFallback.map((accion) => this.resolverAccion(accion));
  });
  protected readonly menuAcciones = signal<MenuAccionesTabla<T> | null>(null);
  private readonly menuAccionesElemento = viewChild<ElementRef<HTMLElement>>('menuAcciones');
  private disparadorMenuAcciones: HTMLElement | null = null;
  private readonly estadosFoto = signal<
    Record<string, { readonly src: string; readonly cargando: boolean; readonly error: boolean }>
  >({});
  private readonly document = inject(DOCUMENT);
  private readonly hostElement = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly carruselFilas = viewChild<ElementRef<HTMLTableSectionElement>>('carruselFilas');
  private readonly ngZone = inject(NgZone);
  private readonly renderer: Renderer2;
  private reinicioExternoInicializado = false;
  private visibilidadExternaInicializada = false;
  private valoresExternosInicializados = false;
  private visibilidadInicialAplicada = false;
  private tooltipElement: HTMLElement | null = null;
  private readonly tooltipElementRef = { current: null as HTMLElement | null };
  private actionHoverElement: HTMLElement | null = null;
  private actionHoverOwner: HTMLElement | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private mutationObserver: MutationObserver | null = null;
  private anchoAccionesFrame: number | null = null;
  private carruselScrollFrame: number | null = null;
  private indiceCardObjetivo: number | null = null;
  private arrastreCarrusel: {
    readonly pointerId: number;
    readonly inicioX: number;
    readonly scrollLeftInicial: number;
    readonly indiceInicial: number;
    readonly inicioEnCeldaTooltip: boolean;
    desplazado: boolean;
  } | null = null;
  private omitirSiguienteTooltipCarrusel = false;
  private omitirTooltipTimer: ReturnType<typeof setTimeout> | null = null;
  private anchoAccionesActual = 0;
  private readonly cerrarOverlaysConScrollCapturado = (): void => this.cerrarOverlaysFlotantes();
  private readonly cerrarOverlaysAlCerrarPopup = (): void => this.cerrarOverlaysFlotantes();

  constructor() {
    this.renderer = inject(RendererFactory2).createRenderer(null, null);

    // El menú ⋯ se muestra en la capa superior recién cuando su elemento ya está en el DOM.
    effect(() => {
      const menu = this.menuAcciones();
      const elemento = this.menuAccionesElemento()?.nativeElement;
      if (!menu || !elemento || popoverAbierto(elemento)) {
        return;
      }
      elemento.showPopover?.();
      untracked(() => this.itemsMenuAcciones()[0]?.focus());
    });

    effect(() => {
      const habilitado = this.trInput();

      if (!habilitado) {
        this.filaInputVisible.set(false);
        this.visibilidadInicialAplicada = false;
        return;
      }

      const visibleInicial = this.trInputVisibleInicial();
      if (!this.visibilidadInicialAplicada) {
        this.filaInputVisible.set(visibleInicial);
        this.visibilidadInicialAplicada = true;
      }
    });

    effect(() => {
      const filaEditandoId = this.trInputFilaEditandoId();
      if (this.trInput() && filaEditandoId) {
        this.filaInputVisible.set(true);
      }
    });

    effect(() => {
      const version = this.trInputVisibleVersion();
      const visible = this.trInputVisible();

      if (!this.visibilidadExternaInicializada) {
        this.visibilidadExternaInicializada = true;
        if (typeof visible === 'boolean') {
          this.filaInputVisible.set(visible);
        }
        return;
      }

      void version;
      if (typeof visible === 'boolean') {
        this.filaInputVisible.set(visible);
      }
    });

    effect(() => {
      const version = this.trInputResetVersion();

      if (!this.reinicioExternoInicializado) {
        this.reinicioExternoInicializado = true;
        return;
      }

      this.restablecerValoresTrInput(false);
    });

    effect(() => {
      const version = this.trInputValoresVersion();
      const valores = this.trInputValores();

      if (!this.valoresExternosInicializados) {
        this.valoresExternosInicializados = true;
        if (Object.keys(valores).length) {
          this.valoresTrInput.set({ ...valores });
        }
        return;
      }

      void version;
      this.valoresTrInput.set({ ...valores });
    });

    effect(() => {
      const filas = this.filas();
      const filaEditandoId = this.trInputFilaEditandoId();
      const filaInputVisible = this.mostrarFilaInput();
      const cantidadCards = this.cantidadCards();
      let indiceSiguiente = Math.min(
        untracked(() => this.indiceCardActiva()),
        Math.max(0, cantidadCards - 1),
      );

      if (filaInputVisible && !filaEditandoId) {
        indiceSiguiente = 0;
      } else if (filaInputVisible && filaEditandoId) {
        const idFila = this.idFila();
        const indiceEdicion = filas.findIndex(
          (fila) => String(fila[idFila]) === filaEditandoId,
        );
        indiceSiguiente = Math.max(0, indiceEdicion);
      }

      this.indiceCardActiva.set(indiceSiguiente);
      this.irACard(indiceSiguiente);
    });
  }

  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      const host = this.hostElement.nativeElement;

      if (typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(() => this.programarActualizacionAnchoAcciones());
        this.resizeObserver.observe(host);
      }

      if (typeof MutationObserver !== 'undefined') {
        this.mutationObserver = new MutationObserver(() =>
          this.programarActualizacionAnchoAcciones(),
        );
        this.mutationObserver.observe(host, { childList: true, subtree: true });
      }

      // `scroll` no burbujea: la fase de captura permite detectar también contenedores internos.
      this.document.addEventListener('scroll', this.cerrarOverlaysConScrollCapturado, {
        capture: true,
        passive: true,
      });
      this.document.addEventListener('app-popup-cerrado', this.cerrarOverlaysAlCerrarPopup);

      this.programarActualizacionAnchoAcciones();
    });
  }

  ngOnDestroy(): void {
    this.cancelarActualizacionAnchoAcciones();
    this.cancelarActualizacionIndiceCarrusel();
    if (this.omitirTooltipTimer !== null) {
      clearTimeout(this.omitirTooltipTimer);
    }
    this.resizeObserver?.disconnect();
    this.mutationObserver?.disconnect();
    this.document.removeEventListener('scroll', this.cerrarOverlaysConScrollCapturado, true);
    this.document.removeEventListener('app-popup-cerrado', this.cerrarOverlaysAlCerrarPopup);
    this.cerrarOverlaysFlotantes();
  }

  readonly mostrarToolbarTrInput = computed(
    () =>
      this.mostrarMensajeToolbar() ||
      this.accionesCabecera().length > 0 ||
      this.filtrosCabecera().length > 0 ||
      (this.trInput() &&
        (this.trInputConmutador() || this.trInputBotonAgregar() || this.trInputHoldControl())),
  );
  readonly mostrarBarraInferior = computed(() => this.inputFiltroTiempo());
  readonly mostrarFilaInput = computed(() => this.trInput() && this.filaInputVisible());
  readonly cantidadCards = computed(
    () =>
      this.filas().length +
      (this.mostrarFilaInput() && !this.trInputFilaEditandoId() ? 1 : 0),
  );
  readonly mostrarEstadoVacio = computed(
    () => !this.cargando() && !this.filas().length && !this.mostrarFilaInput(),
  );
  readonly mostrarMensajeToolbar = computed(() => !!this.trInputMensaje().trim());
  readonly filasVisiblesConfiguradas = computed(() => this.tbodyRows() ?? this.maxFilasVisibles());
  readonly vacioReservado = computed(
    () => this.vacioReservarFilas() && (this.filasVisiblesConfiguradas() ?? 0) > 0,
  );
  readonly plantillaColumnas = computed(() => {
    const columnas = this.columnas().map((columna) => columna.ancho ?? 'minmax(7rem, 1fr)');
    return this.mostrarAcciones()
      ? [...columnas, 'var(--tabla-acciones-ancho, minmax(7rem, max-content))'].join(' ')
      : columnas.join(' ');
  });
  readonly mostrarTextoBotonAgregar = computed(
    () => this.trInputBotonAgregar() && !!this.trInputBotonAgregarTexto().trim(),
  );

  protected irACardAnterior(): void {
    this.irACard(this.indiceCardActiva() - 1);
  }

  protected irACardSiguiente(): void {
    this.irACard(this.indiceCardActiva() + 1);
  }

  protected manejarScrollCarrusel(evento: Event): void {
    const carril = evento.currentTarget;
    if (!(carril instanceof HTMLElement)) {
      return;
    }

    this.cancelarActualizacionIndiceCarrusel();

    if (typeof requestAnimationFrame === 'undefined') {
      this.actualizarIndiceCarrusel(carril);
      return;
    }

    this.carruselScrollFrame = requestAnimationFrame(() => {
      this.carruselScrollFrame = null;
      this.actualizarIndiceCarrusel(carril);
    });
  }

  protected cancelarNavegacionProgramaticaCarrusel(): void {
    this.indiceCardObjetivo = null;
  }

  protected iniciarArrastreCarrusel(evento: PointerEvent): void {
    this.cancelarNavegacionProgramaticaCarrusel();

    if (!this.esVistaCards() || evento.button !== 0 || evento.isPrimary === false) {
      return;
    }

    const objetivo = evento.target;
    if (
      objetivo instanceof Element &&
      objetivo.closest('button, input, select, textarea, a, label, [contenteditable="true"]')
    ) {
      return;
    }

    const carril = evento.currentTarget;
    if (!(carril instanceof HTMLElement)) {
      return;
    }

    this.arrastreCarrusel = {
      pointerId: evento.pointerId,
      inicioX: evento.clientX,
      scrollLeftInicial: carril.scrollLeft,
      indiceInicial: this.indiceCardActiva(),
      inicioEnCeldaTooltip:
        objetivo instanceof Element && !!objetivo.closest('.tabla-responsive__celda-contenido'),
      desplazado: false,
    };

    if (typeof carril.setPointerCapture === 'function') {
      carril.setPointerCapture(evento.pointerId);
    }
  }

  protected moverArrastreCarrusel(evento: PointerEvent): void {
    const arrastre = this.arrastreCarrusel;
    const carril = evento.currentTarget;
    if (!arrastre || arrastre.pointerId !== evento.pointerId || !(carril instanceof HTMLElement)) {
      return;
    }

    const desplazamiento = arrastre.inicioX - evento.clientX;
    if (Math.abs(desplazamiento) < 6 && !arrastre.desplazado) {
      return;
    }

    arrastre.desplazado = true;
    carril.classList.add('tabla-responsive__carousel-track--arrastrando');
    carril.scrollLeft = arrastre.scrollLeftInicial + desplazamiento;

    if (evento.cancelable) {
      evento.preventDefault();
    }
  }

  protected finalizarArrastreCarrusel(evento: PointerEvent): void {
    const arrastre = this.arrastreCarrusel;
    const carril = evento.currentTarget;
    if (!arrastre || arrastre.pointerId !== evento.pointerId || !(carril instanceof HTMLElement)) {
      return;
    }

    const desplazamiento = arrastre.inicioX - evento.clientX;
    const anchoCard =
      carril.querySelector<HTMLElement>(':scope > tr')?.getBoundingClientRect().width ||
      carril.clientWidth;
    const umbral = Math.max(32, Math.min(72, anchoCard * 0.16));
    const direccion = Math.abs(desplazamiento) >= umbral ? Math.sign(desplazamiento) : 0;
    const indiceDestino = arrastre.indiceInicial + direccion;

    this.liberarCapturaArrastre(carril, evento.pointerId);
    carril.classList.remove('tabla-responsive__carousel-track--arrastrando');
    this.arrastreCarrusel = null;

    if (arrastre.desplazado && arrastre.inicioEnCeldaTooltip) {
      this.omitirSiguienteTooltipCarrusel = true;
      if (this.omitirTooltipTimer !== null) {
        clearTimeout(this.omitirTooltipTimer);
      }
      this.omitirTooltipTimer = setTimeout(() => {
        this.omitirSiguienteTooltipCarrusel = false;
        this.omitirTooltipTimer = null;
      });
    }

    this.irACard(indiceDestino);
  }

  protected cancelarArrastreCarrusel(evento: PointerEvent): void {
    const arrastre = this.arrastreCarrusel;
    const carril = evento.currentTarget;
    if (!arrastre || arrastre.pointerId !== evento.pointerId || !(carril instanceof HTMLElement)) {
      return;
    }

    this.liberarCapturaArrastre(carril, evento.pointerId);
    carril.classList.remove('tabla-responsive__carousel-track--arrastrando');
    this.arrastreCarrusel = null;
    this.irACard(arrastre.indiceInicial);
  }

  protected obtenerTexto(fila: T, columna: ColumnaTabla<T>): string {
    const valor = fila[columna.id];

    if (columna.formatearTexto) {
      return columna.formatearTexto(valor, fila);
    }

    if (Array.isArray(valor)) {
      return valor.join(', ');
    }

    // Un estado puede usar `null` como valor de negocio y definir su propio texto.
    if (columna.tipo === 'estado' && columna.estadoTexto) {
      return columna.estadoTexto(valor, fila);
    }

    if (valor === null || valor === undefined) {
      return '-';
    }

    if (this.esCampoMoneda(columna)) {
      return formatearMoneda(typeof valor === 'number' || typeof valor === 'string' ? valor : 0);
    }

    if (columna.tipo === 'estado') {
      return formatearEstadoTabla(valor);
    }

    if (columna.tipo === 'fecha') {
      return this.formatearFecha(String(valor));
    }

    if (this.esCampoDni(columna)) {
      return formatearDni(String(valor));
    }

    if (this.esCampoTelefono(columna)) {
      return formatearTelefono(String(valor));
    }

    if (typeof valor === 'object') {
      return this.formatearObjeto(valor);
    }

    return String(valor);
  }

  protected obtenerClaseFila(fila: T): string | null {
    return this.filaClase()?.(fila) ?? null;
  }

  protected obtenerArray(fila: T, columna: ColumnaTabla<T>): readonly string[] {
    const valor = fila[columna.id];
    return Array.isArray(valor) ? valor.map(String) : [];
  }

  protected obtenerIniciales(fila: T): string {
    const columnaAvatar = this.columnas().find((columna) => columna.tipo === 'avatar');
    if (columnaAvatar?.avatarIniciales) {
      return columnaAvatar.avatarIniciales(fila);
    }
    return obtenerInicialesDesdeNombreApellido(fila);
  }

  protected obtenerNombreCompleto(fila: T): string {
    const columnaAvatar = this.columnas().find((columna) => columna.tipo === 'avatar');
    if (columnaAvatar?.avatarNombre) {
      return columnaAvatar.avatarNombre(fila);
    }
    return obtenerNombreCompletoDesdeNombreApellido(fila);
  }

  protected obtenerTooltipTexto(fila: T, columna: ColumnaTabla<T>): string {
    if (columna.tipo === 'avatar') {
      return this.obtenerNombreCompleto(fila) || '-';
    }

    if (columna.tipo === 'chips') {
      const valores = this.obtenerArray(fila, columna);
      return valores.length ? valores.join(', ') : '-';
    }

    return this.obtenerTexto(fila, columna);
  }

  protected obtenerFoto(fila: T, columna: ColumnaTabla<T>): string {
    const foto = fila[columna.id];
    return typeof foto === 'string' ? foto.trim() : '';
  }

  protected mostrarNombreEnAvatar(columna: ColumnaTabla<T>): boolean {
    return columna.avatarMostrarNombre !== false;
  }

  protected fotoDisponible(fila: T, columna: ColumnaTabla<T>): boolean {
    const src = this.obtenerFoto(fila, columna);
    if (!src) {
      return false;
    }

    return !this.obtenerEstadoFoto(fila, columna, src).error;
  }

  protected fotoCargando(fila: T, columna: ColumnaTabla<T>): boolean {
    const src = this.obtenerFoto(fila, columna);
    if (!src) {
      return false;
    }

    const estado = this.obtenerEstadoFoto(fila, columna, src);
    return !estado.error && estado.cargando;
  }

  protected manejarFotoCargada(fila: T, columna: ColumnaTabla<T>): void {
    this.actualizarEstadoFoto(fila, columna, {
      src: this.obtenerFoto(fila, columna),
      cargando: false,
      error: false,
    });
  }

  protected manejarFotoError(fila: T, columna: ColumnaTabla<T>): void {
    this.actualizarEstadoFoto(fila, columna, {
      src: this.obtenerFoto(fila, columna),
      cargando: false,
      error: true,
    });
  }

  protected estaAlDia(fila: T, columna: ColumnaTabla<T>): boolean {
    return resolverEstadoTabla(fila[columna.id]);
  }

  protected obtenerClaseEstado(fila: T, columna: ColumnaTabla<T>): string | null {
    const valor = fila[columna.id];
    if (columna.estadoClase) {
      return columna.estadoClase(valor, fila);
    }
    return obtenerClaseEstadoTabla(valor, this.estaAlDia(fila, columna));
  }

  protected tipoInput(columna: ColumnaTabla<T>): string {
    if (columna.inputType) {
      return columna.inputType;
    }

    if (columna.tipo === 'fecha') {
      return 'date';
    }

    if (columna.tipo === 'numero' || columna.tipo === 'moneda') {
      return 'number';
    }

    if (columna.tipo === 'estado') {
      return 'checkbox';
    }

    return 'text';
  }

  protected usaSelect(columna: ColumnaTabla<T>): boolean {
    return columna.trInputTipo === 'select' || !!columna.opciones?.length;
  }

  protected mostrarPlaceholderSelect(columna: ColumnaTabla<T>, esNueva: boolean): boolean {
    if (!esNueva) {
      return false;
    }

    const tieneOpcionVacia = (columna.opciones ?? []).some((opcion) => opcion.value === '');
    return !tieneOpcionVacia;
  }

  protected normalizarOpcionSelectValue(valor: string): string {
    return this.normalizarValorSelect(valor);
  }

  protected usaChipsMulti(columna: ColumnaTabla<T>): boolean {
    return columna.trInputTipo === 'chips-multi';
  }

  protected esInputFecha(columna: ColumnaTabla<T>): boolean {
    return this.tipoInput(columna) === 'date';
  }

  protected esInputTime(columna: ColumnaTabla<T>): boolean {
    return this.tipoInput(columna) === 'time';
  }

  protected esInputDateTime(columna: ColumnaTabla<T>): boolean {
    return this.tipoInput(columna) === 'datetime-local';
  }

  protected usaPickerNativo(columna: ColumnaTabla<T>): boolean {
    return this.esInputFecha(columna) || this.esInputTime(columna) || this.esInputDateTime(columna);
  }

  protected iconoPicker(columna: ColumnaTabla<T>): string {
    return this.esInputTime(columna) ? 'heroClock' : 'heroCalendarDays';
  }

  protected esInputMoneda(columna: ColumnaTabla<T>): boolean {
    return columna.tipo === 'moneda';
  }

  protected esInputDni(columna: ColumnaTabla<T>): boolean {
    return columna.inputFormatter === 'dni' || columna.id === 'dni';
  }

  protected esInputTelefono(columna: ColumnaTabla<T>): boolean {
    return (
      columna.inputFormatter === 'telefono' || columna.id === 'telefono' || columna.id === 'phone'
    );
  }

  protected esColumnaEditableEnTrInput(columna: ColumnaTabla<T>): boolean {
    return columna.trInputEditable !== false;
  }

  protected mostrarColumnaEnTrInput(columna: ColumnaTabla<T>): boolean {
    return columna.trInputVisible?.(this.valoresTrInput()) ?? true;
  }

  protected obtenerValorInput(columna: ColumnaTabla<T>): ValorInputTabla {
    return this.valoresTrInput()[this.obtenerClaveTrInput(columna)] ?? '';
  }

  protected obtenerValorSelect(columna: ColumnaTabla<T>): string {
    return this.normalizarValorSelect(this.obtenerValorInput(columna));
  }

  protected obtenerValorVisibleInput(columna: ColumnaTabla<T>): ValorInputTabla {
    const valor = this.obtenerValorInput(columna);

    if (this.esInputDni(columna)) {
      return formatearDni(String(valor));
    }

    if (this.esInputTelefono(columna)) {
      return formatearTelefono(String(valor));
    }

    return valor;
  }

  protected obtenerValoresInputArray(columna: ColumnaTabla<T>): readonly string[] {
    const valor = this.obtenerValorInput(columna);

    if (Array.isArray(valor)) {
      return valor.map(String);
    }

    if (typeof valor === 'string' && valor.trim()) {
      return [valor];
    }

    return [];
  }

  protected esCampoInvalido(columna: ColumnaTabla<T>): boolean {
    const clave = this.obtenerClaveTrInput(columna);
    return (
      this.trInputCamposInvalidos().includes(columna.id) ||
      this.trInputCamposInvalidos().includes(clave)
    );
  }

  protected actualizarValorInput(columna: ColumnaTabla<T>, evento: Event): void {
    const input = evento.target as HTMLInputElement | HTMLSelectElement | null;

    if (!input) {
      return;
    }

    const valorSanitizado = this.sanitizarValorInput(columna, input);

    const valor =
      columna.tipo === 'estado'
        ? (input as HTMLInputElement).checked
        : this.esInputMoneda(columna)
          ? valorSanitizado
          : this.esInputNumerico(columna)
            ? Number(valorSanitizado || 0)
            : valorSanitizado;

    const actualizados = {
      ...this.valoresTrInput(),
      [this.obtenerClaveTrInput(columna)]: valor,
    };

    this.autocompletarHoraFin(actualizados, columna, valor);

    this.valoresTrInput.set(actualizados);
    this.trInputChange.emit(actualizados);
  }

  protected alternarOpcionChipsMulti(columna: ColumnaTabla<T>, opcion: OpcionInputTabla): void {
    const actuales = this.obtenerValoresInputArray(columna);
    const existe = actuales.includes(opcion.value);
    const siguientes = existe
      ? actuales.filter((valor) => valor !== opcion.value)
      : [...actuales, opcion.value];

    const actualizados = {
      ...this.valoresTrInput(),
      [this.obtenerClaveTrInput(columna)]: siguientes,
    };

    this.valoresTrInput.set(actualizados);
    this.trInputChange.emit(actualizados);
  }

  protected opcionChipsActiva(columna: ColumnaTabla<T>, opcion: OpcionInputTabla): boolean {
    return this.obtenerValoresInputArray(columna).includes(opcion.value);
  }

  protected actualizarValorMoneda(columna: ColumnaTabla<T>, evento: Event): void {
    const input = evento.target as HTMLInputElement | null;
    if (!input) {
      return;
    }

    const valorSanitizado = this.sanitizarValorInput(columna, input);
    const valorFormateado = valorSanitizado ? formatearMoneda(valorSanitizado) : '';

    input.value = valorFormateado;
    this.actualizarValorInputDesdeValor(columna, valorFormateado);
  }

  protected restablecerTrInput(): void {
    if (this.trInputCargando()) return;

    this.restablecerValoresTrInput(true);

    if (this.trInputCerrarAlRestablecer() && !this.debeMantenerAbiertaFilaInput()) {
      this.alternarFilaInput(false);
    }
  }

  protected textoAccionRestablecerTrInput(): string {
    if (this.trInputTextoRestablecer()) return this.trInputTextoRestablecer();

    return this.trInputCerrarAlRestablecer() && !this.debeMantenerAbiertaFilaInput()
      ? 'Cancelar'
      : 'Restablecer';
  }

  private debeMantenerAbiertaFilaInput(): boolean {
    return this.trInputHoldActivo() || this.trInputMantenerAbierto();
  }

  protected alternarFilaInput(visible?: boolean): void {
    if (!this.trInput()) {
      return;
    }

    const siguienteEstado = typeof visible === 'boolean' ? visible : !this.filaInputVisible();
    this.filaInputVisible.set(siguienteEstado);
    this.trInputToggle.emit(siguienteEstado);
  }

  protected alternarFilaInputDesdeEvento(evento: Event): void {
    const input = evento.target as HTMLInputElement | null;
    this.alternarFilaInput(input?.checked ?? false);
  }

  protected alternarHoldTrInput(evento: Event): void {
    const input = evento.target as HTMLInputElement | null;
    const activo = input?.checked ?? false;

    if (activo && !this.filaInputVisible()) {
      this.alternarFilaInput(true);
    }

    this.trInputHoldActivo.set(activo);
    this.trInputHoldChange.emit(activo);
  }

  protected abrirNuevoTrInput(): void {
    if (this.trInputBotonAgregarModo() === 'emitir') {
      this.trInputNuevo.emit();
      return;
    }

    this.restablecerValoresTrInput(false);
    this.filaInputVisible.set(true);
    this.trInputToggle.emit(true);
    this.trInputNuevo.emit();
  }

  protected cambiarFiltroCabecera(id: string, evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const activoSolicitado = input.checked;
    const filtro = this.filtrosCabecera().find((item) => item.id === id);
    if (filtro?.confirmacionRequerida) {
      input.checked = filtro.activo;
    }
    this.filtroCabeceraCambiado.emit({ id, activo: activoSolicitado });
  }

  protected manejarEnterComoAgregar(evento: Event): void {
    if (!this.trInputBotonAgregar()) {
      return;
    }

    const eventoTeclado = evento as KeyboardEvent;
    if (eventoTeclado.defaultPrevented) {
      return;
    }

    const objetivo = eventoTeclado.target as HTMLElement | null;
    if (!objetivo || this.esElementoInteractivo(objetivo)) {
      return;
    }

    eventoTeclado.preventDefault();
    this.abrirNuevoTrInput();
  }

  protected confirmarTrInput(): void {
    if (this.trInputCargando()) return;

    this.trInputSubmit.emit(this.valoresTrInput());
  }

  protected actualizarFiltroTiempoAnio(evento: Event): void {
    const input = evento.target as HTMLInputElement | null;
    const anio = limitarAnio(input?.value ?? '');

    if (input) {
      input.value = anio;
    }

    this.filtroTiempoAnioChange.emit(anio);
  }

  protected actualizarFiltroTiempoMes(valor: string): void {
    this.filtroTiempoMesChange.emit(valor);
  }

  protected formatearInputMoneda(columna: ColumnaTabla<T>, evento: Event): void {
    if (!this.esInputMoneda(columna)) {
      return;
    }

    const input = evento.target as HTMLInputElement | null;
    if (!input) {
      return;
    }

    const valor = input.value.trim();
    if (!valor) {
      return;
    }

    const valorFormateado = formatearMoneda(valor);
    input.value = valorFormateado;
    this.actualizarValorInputDesdeValor(columna, valorFormateado);
  }

  protected abrirSelectorFecha(evento: Event): void {
    const objetivo = evento.target;
    const contenedor = objetivo instanceof Element
      ? objetivo.closest('.tabla-responsive__input-wrap--date')
      : null;
    const input = contenedor?.querySelector('input');

    if (!input) {
      return;
    }

    const inputConPicker = input as HTMLInputElement & { showPicker?: () => void };
    if (typeof inputConPicker.showPicker === 'function') {
      try {
        inputConPicker.showPicker();
        return;
      } catch {
        // Algunos navegadores restringen showPicker; el click nativo es el respaldo.
      }
    }

    inputConPicker.focus();
    inputConPicker.click();
  }

  protected obtenerTrack(fila: T): string {
    return String(fila[this.idFila()] ?? '');
  }

  protected esFilaEditando(fila: T): boolean {
    const filaEditandoId = this.trInputFilaEditandoId();
    return !!filaEditandoId && this.obtenerTrack(fila) === filaEditandoId;
  }

  protected obtenerColorTexto(fila: T, columna: ColumnaTabla<T>): string | null {
    const valor = fila[columna.id];
    if (columna.celdaColor) {
      return columna.celdaColor(valor, fila);
    }
    if (columna.id === 'monto') {
      return obtenerColorTextoMonto(valor);
    }
    return null;
  }

  protected obtenerClaseCelda(fila: T, columna: ColumnaTabla<T>): string | null {
    return columna.celdaClase?.(fila[columna.id], fila) ?? null;
  }

  protected obtenerPlantillaCelda(
    columna: ColumnaTabla<T>,
  ): TemplateRef<{ $implicit: T }> | null {
    return this.plantillasCeldas()[columna.id] ?? null;
  }

  protected obtenerClaseChip(fila: T, columna: ColumnaTabla<T>, item: string): string | null {
    if (columna.chipClase) {
      return columna.chipClase(item, fila);
    }
    if (columna.id === 'cuposDisponibles') {
      return obtenerClaseChipCupo(item);
    }
    return null;
  }

  protected obtenerTooltipId(fila: T, columna: ColumnaTabla<T>): string {
    return `${this.obtenerTrack(fila)}::${columna.id}`;
  }

  protected accionEstaVisible(accion: AccionTablaResuelta<T>, fila: T): boolean {
    return this.evaluarCondicionAccion(accion.visible, fila, true);
  }

  protected accionEstaDeshabilitada(accion: AccionTablaResuelta<T>, fila: T): boolean {
    return this.evaluarCondicionAccion(accion.deshabilitada, fila, false);
  }

  protected accionEstaCargando(accion: AccionTablaResuelta<T>, fila: T): boolean {
    return this.evaluarCondicionAccion(accion.cargando, fila, false);
  }

  protected obtenerTituloAccion(accion: AccionTablaResuelta<T>, fila: T): string {
    return this.accionEstaDeshabilitada(accion, fila)
      ? accion.descripcionDeshabilitada ?? accion.texto
      : accion.texto;
  }

  protected obtenerColorAccion(accion: AccionTablaResuelta<T>, fila: T): string | null {
    if (typeof accion.color === 'function') {
      return accion.color(fila);
    }

    return accion.color ?? null;
  }

  /** Acciones de la fila que se ven como botones: todas, o la principal si el resto va al menú ⋯. */
  protected accionesEnLinea(fila: T): readonly AccionTablaResuelta<T>[] {
    const visibles = this.accionesResueltas().filter((accion) => this.accionEstaVisible(accion, fila));
    if (visibles.length <= this.maxAccionesVisibles()) {
      return visibles;
    }
    const principal =
      visibles.find((accion) => accion.principal) ??
      visibles.find((accion) => !this.esAccionDestructiva(accion, fila)) ??
      visibles[0];
    return [principal];
  }

  /** Acciones que van al menú ⋯; las destructivas quedan al final. */
  protected accionesEnMenu(fila: T): readonly AccionTablaResuelta<T>[] {
    const enLinea = new Set(this.accionesEnLinea(fila).map((accion) => accion.id));
    const resto = this.accionesResueltas().filter(
      (accion) => this.accionEstaVisible(accion, fila) && !enLinea.has(accion.id),
    );
    return [
      ...resto.filter((accion) => !this.esAccionDestructiva(accion, fila)),
      ...resto.filter((accion) => this.esAccionDestructiva(accion, fila)),
    ];
  }

  protected esAccionDestructiva(accion: AccionTablaResuelta<T>, fila: T): boolean {
    if (accion.destructiva !== undefined) {
      return accion.destructiva;
    }
    // Sin marca explícita se deduce del color de peligro que ya usan las tablas.
    return accion.variante === 'danger' || /danger/.test(this.obtenerColorAccion(accion, fila) ?? '');
  }

  protected menuAbiertoPara(fila: T): boolean {
    return this.menuAcciones()?.filaId === this.obtenerTrack(fila);
  }

  protected alternarMenuAcciones(fila: T, evento: MouseEvent): void {
    evento.stopPropagation();
    if (this.menuAbiertoPara(fila)) {
      this.cerrarMenuAcciones(true);
      return;
    }
    const disparador = (evento.target as HTMLElement | null)?.closest('button');
    if (!disparador) {
      return;
    }
    this.cerrarOverlaysFlotantes();
    const rect = disparador.getBoundingClientRect();
    const acciones = this.accionesEnMenu(fila);
    // Altura aproximada para decidir si abre hacia arriba cerca del borde inferior.
    const altoEstimado = acciones.length * 44 + 24;
    const haciaArriba = rect.bottom + altoEstimado > window.innerHeight && rect.top > altoEstimado;
    this.disparadorMenuAcciones = disparador;
    this.menuAcciones.set({
      fila,
      filaId: this.obtenerTrack(fila),
      acciones,
      top: haciaArriba ? rect.top - 6 : rect.bottom + 6,
      left: rect.right,
      haciaArriba,
    });
  }

  protected ejecutarAccionDelMenu(accion: AccionTablaResuelta<T>, evento: MouseEvent): void {
    const menu = this.menuAcciones();
    if (!menu || this.accionEstaDeshabilitada(accion, menu.fila)) {
      return;
    }
    this.cerrarMenuAcciones(false);
    this.ejecutarAccionTabla(accion, menu.fila, evento);
  }

  /** Flechas, Inicio y Fin recorren el menú; Escape lo cierra y devuelve el foco al botón ⋯. */
  protected manejarTecladoMenuAcciones(evento: KeyboardEvent): void {
    const items = this.itemsMenuAcciones();
    const actual = items.indexOf(this.document.activeElement as HTMLButtonElement);
    const mover = (indice: number) => {
      evento.preventDefault();
      items[(indice + items.length) % items.length]?.focus();
    };
    switch (evento.key) {
      case 'ArrowDown':
        mover(actual + 1);
        break;
      case 'ArrowUp':
        mover(actual - 1);
        break;
      case 'Home':
        mover(0);
        break;
      case 'End':
        mover(items.length - 1);
        break;
      case 'Escape':
        evento.preventDefault();
        this.cerrarMenuAcciones(true);
        break;
      case 'Tab':
        this.cerrarMenuAcciones(false);
        break;
    }
  }

  @HostListener('document:pointerdown', ['$event'])
  protected cerrarMenuAccionesAlTocarAfuera(evento: PointerEvent): void {
    if (!this.menuAcciones()) return;
    const objetivo = evento.target as Node | null;
    const menu = this.menuAccionesElemento()?.nativeElement;
    if (objetivo && (menu?.contains(objetivo) || this.disparadorMenuAcciones?.contains(objetivo))) {
      return;
    }
    this.cerrarMenuAcciones(false);
  }

  private cerrarMenuAcciones(devolverFoco: boolean): void {
    if (!this.menuAcciones()) return;
    const menu = this.menuAccionesElemento()?.nativeElement;
    if (menu && popoverAbierto(menu)) {
      menu.hidePopover?.();
    }
    this.menuAcciones.set(null);
    if (devolverFoco) {
      this.disparadorMenuAcciones?.focus();
    }
    this.disparadorMenuAcciones = null;
  }

  private itemsMenuAcciones(): HTMLButtonElement[] {
    const menu = this.menuAccionesElemento()?.nativeElement;
    return menu
      ? Array.from(menu.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not([disabled])'))
      : [];
  }

  protected clickEnFila(fila: T, evento: Event): void {
    if (!this.filaClickeable()) return;
    const objetivo = evento.target as HTMLElement | null;
    if (objetivo?.closest('button, a, input, select, textarea, label, [role="menu"], [role="menuitem"]')) return;
    this.filaSeleccionada.emit(fila);
  }

  protected ejecutarAccionTabla(accion: AccionTablaResuelta<T>, fila: T, evento: MouseEvent): void {
    evento.stopPropagation();
    this.destruirActionHoverElement();
    this.accionFila.emit({ accion: accion.id, fila });

    if (accion.predefinida === 'ver') {
      this.verFila.emit(fila);
    }
  }

  protected tooltipEstaAbierto(fila: T, columna: ColumnaTabla<T>): boolean {
    return this.tooltipActual()?.id === this.obtenerTooltipId(fila, columna);
  }

  protected alternarTooltip(fila: T, columna: ColumnaTabla<T>, evento: Event): void {
    if (this.omitirSiguienteTooltipCarrusel) {
      this.omitirSiguienteTooltipCarrusel = false;
      evento.preventDefault();
      evento.stopPropagation();
      return;
    }

    if (this.altoRendimiento()) {
      return;
    }

    evento.stopPropagation();
    const tooltipId = this.obtenerTooltipId(fila, columna);
    if (this.tooltipActual()?.id === tooltipId) {
      this.cerrarTooltip();
      return;
    }

    const target = evento.currentTarget as HTMLElement | null;
    if (!target) {
      return;
    }

    this.tooltipActual.set(
      this.crearTooltipState(
        tooltipId,
        columna.titulo,
        this.obtenerTooltipTexto(fila, columna),
        target,
      ),
    );
    const contenedorTooltip =
      target.closest<HTMLDialogElement>('dialog[open]') ?? this.document.body;
    this.renderizarTooltipEnBody(contenedorTooltip);
  }

  protected alternarTooltipDesdeTeclado(fila: T, columna: ColumnaTabla<T>, evento: Event): void {
    if (this.altoRendimiento()) {
      return;
    }

    evento.preventDefault();
    this.alternarTooltip(fila, columna, evento);
  }

  protected cerrarTooltip(): void {
    this.tooltipActual.set(null);
    this.destruirTooltipElement();
  }

  @HostListener('document:click')
  protected cerrarTooltipDesdeDocumento(): void {
    this.cerrarTooltip();
  }

  @HostListener('mouseover', ['$event'])
  protected mostrarHoverAccion(evento: MouseEvent): void {
    if (this.altoRendimiento()) {
      return;
    }

    const boton = this.obtenerBotonAccionDesdeNodo(evento.target);
    if (!boton) {
      return;
    }

    const relacionado = evento.relatedTarget;
    if (relacionado instanceof Node && boton.contains(relacionado)) {
      return;
    }

    this.renderizarActionHover(boton);
  }

  @HostListener('mouseout', ['$event'])
  protected ocultarHoverAccion(evento: MouseEvent): void {
    const boton = this.obtenerBotonAccionDesdeNodo(evento.target);
    if (!boton) {
      return;
    }

    const relacionado = evento.relatedTarget;
    if (relacionado instanceof Node && boton.contains(relacionado)) {
      return;
    }

    if (this.actionHoverOwner === boton) {
      this.destruirActionHoverElement();
    }
  }

  @HostListener('focusin', ['$event'])
  protected mostrarHoverAccionEnFoco(evento: FocusEvent): void {
    if (this.altoRendimiento()) {
      return;
    }

    const boton = this.obtenerBotonAccionDesdeNodo(evento.target);
    if (!boton) {
      return;
    }

    this.renderizarActionHover(boton);
  }

  @HostListener('focusout', ['$event'])
  protected ocultarHoverAccionEnFoco(evento: FocusEvent): void {
    const boton = this.obtenerBotonAccionDesdeNodo(evento.target);
    if (!boton) {
      return;
    }

    if (this.actionHoverOwner === boton) {
      this.destruirActionHoverElement();
    }
  }

  @HostListener('document:keydown.escape')
  protected cerrarTooltipConEscape(): void {
    this.cerrarTooltip();
  }

  @HostListener('window:resize')
  protected cerrarTooltipConResize(): void {
    this.cerrarOverlaysFlotantes();
    this.programarActualizacionAnchoAcciones();
  }

  @HostListener('window:scroll')
  protected cerrarTooltipConScroll(): void {
    this.cerrarOverlaysFlotantes();
  }

  private cerrarOverlaysFlotantes(): void {
    this.cerrarTooltip();
    this.destruirActionHoverElement();
    // El menú queda anclado a su botón: si la página o la tabla se desplazan, se cierra.
    this.cerrarMenuAcciones(false);
  }

  private irACard(indice: number): void {
    const carril = this.carruselFilas()?.nativeElement;
    if (!carril) {
      return;
    }

    const tarjetas = this.obtenerCardsCarrusel(carril);
    const indiceDestino = Math.min(Math.max(0, indice), Math.max(0, tarjetas.length - 1));
    const tarjetaDestino = tarjetas[indiceDestino];
    const primeraTarjeta = tarjetas[0];
    if (!tarjetaDestino || !primeraTarjeta) {
      return;
    }

    const left = tarjetaDestino.offsetLeft - primeraTarjeta.offsetLeft;
    const movimientoReducido =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.indiceCardObjetivo = indiceDestino;
    this.indiceCardActiva.set(indiceDestino);

    if (typeof carril.scrollTo === 'function') {
      carril.scrollTo({ left, behavior: movimientoReducido ? 'auto' : 'smooth' });
    } else {
      carril.scrollLeft = left;
    }

  }

  private actualizarIndiceCarrusel(carril: HTMLElement): void {
    if (this.arrastreCarrusel) {
      return;
    }

    const tarjetas = this.obtenerCardsCarrusel(carril);
    const primeraTarjeta = tarjetas[0];
    if (!primeraTarjeta) {
      this.indiceCardActiva.set(0);
      return;
    }

    const indiceMasCercano = tarjetas.reduce(
      (mejorIndice, tarjeta, indice) => {
        const distanciaActual = Math.abs(
          tarjeta.offsetLeft - primeraTarjeta.offsetLeft - carril.scrollLeft,
        );
        const mejorTarjeta = tarjetas[mejorIndice];
        const mejorDistancia = Math.abs(
          mejorTarjeta.offsetLeft - primeraTarjeta.offsetLeft - carril.scrollLeft,
        );
        return distanciaActual < mejorDistancia ? indice : mejorIndice;
      },
      0,
    );

    if (
      this.indiceCardObjetivo !== null &&
      indiceMasCercano !== this.indiceCardObjetivo
    ) {
      return;
    }

    if (indiceMasCercano === this.indiceCardObjetivo) {
      this.indiceCardObjetivo = null;
    }

    this.indiceCardActiva.set(indiceMasCercano);
  }

  private obtenerCardsCarrusel(carril: HTMLElement): readonly HTMLElement[] {
    return Array.from(carril.children).filter(
      (elemento): elemento is HTMLElement =>
        elemento instanceof HTMLElement && elemento.tagName === 'TR',
    );
  }

  private liberarCapturaArrastre(carril: HTMLElement, pointerId: number): void {
    if (
      typeof carril.hasPointerCapture === 'function' &&
      typeof carril.releasePointerCapture === 'function' &&
      carril.hasPointerCapture(pointerId)
    ) {
      carril.releasePointerCapture(pointerId);
    }
  }

  private cancelarActualizacionIndiceCarrusel(): void {
    if (this.carruselScrollFrame === null || typeof cancelAnimationFrame === 'undefined') {
      return;
    }

    cancelAnimationFrame(this.carruselScrollFrame);
    this.carruselScrollFrame = null;
  }

  private programarActualizacionAnchoAcciones(): void {
    if (this.anchoAccionesFrame !== null || typeof requestAnimationFrame === 'undefined') {
      return;
    }

    this.anchoAccionesFrame = requestAnimationFrame(() => this.actualizarAnchoAcciones());
  }

  private cancelarActualizacionAnchoAcciones(): void {
    if (this.anchoAccionesFrame === null || typeof cancelAnimationFrame === 'undefined') {
      return;
    }

    cancelAnimationFrame(this.anchoAccionesFrame);
    this.anchoAccionesFrame = null;
  }

  private actualizarAnchoAcciones(): void {
    this.anchoAccionesFrame = null;

    const host = this.hostElement.nativeElement;

    if (this.esVistaCards()) {
      host.style.removeProperty('--tabla-acciones-ancho');
      this.anchoAccionesActual = 0;
      this.observarCeldasAcciones([]);
      return;
    }

    const celdasAcciones = Array.from(
      host.querySelectorAll<HTMLElement>(
        '.tabla-responsive__acciones, .tabla-responsive__acciones-titulo',
      ),
    );

    if (!this.mostrarAcciones() || !celdasAcciones.length) {
      host.style.removeProperty('--tabla-acciones-ancho');
      this.anchoAccionesActual = 0;
      return;
    }

    const ancho = Math.ceil(
      Math.max(...celdasAcciones.map((celda) => this.calcularAnchoAcciones(celda))),
    );

    if (!Number.isFinite(ancho) || ancho <= 0) {
      return;
    }

    if (Math.abs(ancho - this.anchoAccionesActual) > 1) {
      this.anchoAccionesActual = ancho;
      host.style.setProperty('--tabla-acciones-ancho', `${ancho}px`);
    }

    this.forzarNowrapEnAcciones(host);
    this.observarCeldasAcciones(celdasAcciones);
  }

  private forzarNowrapEnAcciones(host: HTMLElement): void {
    host.querySelectorAll<HTMLElement>('.tabla-responsive__acciones > div').forEach((div) => {
      div.style.setProperty('display', 'inline-flex');
      div.style.setProperty('flex-wrap', 'nowrap');
      div.style.setProperty('width', 'max-content');
    });
  }

  private observarCeldasAcciones(celdasAcciones: readonly HTMLElement[]): void {
    if (!this.resizeObserver) {
      return;
    }

    this.resizeObserver.disconnect();
    this.resizeObserver.observe(this.hostElement.nativeElement);

    celdasAcciones.forEach((celda) => {
      this.resizeObserver?.observe(celda);
      // El contenido (botones con texto) puede crecer sin que la celda cambie de tamaño, porque el grid
      // la fija al ancho medido; observándolo se vuelve a medir y la columna se agranda.
      if (celda.firstElementChild instanceof HTMLElement) this.resizeObserver?.observe(celda.firstElementChild);
    });
  }

  /**
   * Devuelve el ancho natural de la celda de acciones incluyendo padding y bordes.
   * Para td: mide el scrollWidth del hijo directo (div con botones en nowrap).
   * Para th: usa el scrollWidth de la propia celda (texto "Acciones").
   * El scrollWidth refleja el contenido real aunque la celda esté comprimida por el grid.
   */
  private calcularAnchoAcciones(celda: HTMLElement): number {
    const estilos = getComputedStyle(celda);
    const paddingH =
      this.parsearPixeles(estilos.paddingLeft) + this.parsearPixeles(estilos.paddingRight);
    const borderH =
      this.parsearPixeles(estilos.borderLeftWidth) + this.parsearPixeles(estilos.borderRightWidth);

    const hijoDirecto =
      celda.firstElementChild instanceof HTMLElement ? celda.firstElementChild : null;

    // Hijos presentes (td con div de botones): usar scrollWidth del hijo
    if (hijoDirecto) {
      return hijoDirecto.scrollWidth + paddingH + borderH;
    }

    // Sin hijos (th con texto): scrollWidth de la celda ya incluye padding
    return celda.scrollWidth + borderH;
  }

  private parsearPixeles(valor: string): number {
    const numero = Number.parseFloat(valor);
    return Number.isFinite(numero) ? numero : 0;
  }

  private esVistaCards(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia(MEDIA_CARDS_TABLA).matches
    );
  }

  private formatearFecha(valor: string): string {
    const fecha = parsearFechaApi(valor);
    return !fecha || Number.isNaN(fecha.getTime())
      ? valor
      : new Intl.DateTimeFormat('es-AR').format(fecha);
  }

  private formatearObjeto(valor: object): string {
    try {
      return JSON.stringify(valor);
    } catch {
      return String(valor);
    }
  }

  private restablecerValoresTrInput(emitirEvento: boolean): void {
    this.valoresTrInput.set({});
    this.versionTrInput.update((version) => version + 1);

    if (emitirEvento) {
      this.trInputChange.emit({});
      this.trInputReset.emit();
    }
  }

  private esInputNumerico(columna: ColumnaTabla<T>): boolean {
    if (columna.inputType) {
      return columna.inputType === 'number';
    }

    return columna.tipo === 'numero' || columna.tipo === 'moneda';
  }

  private esCampoDni(columna: ColumnaTabla<T>): boolean {
    return columna.id === 'dni';
  }

  private esCampoTelefono(columna: ColumnaTabla<T>): boolean {
    return columna.id === 'telefono' || columna.id === 'phone';
  }

  private esCampoMoneda(columna: ColumnaTabla<T>): boolean {
    return columna.tipo === 'moneda' || columna.id === 'monto';
  }

  private esElementoInteractivo(elemento: HTMLElement): boolean {
    return !!elemento.closest(
      'input, select, textarea, button, a, [role="button"], [contenteditable="true"]',
    );
  }

  private actualizarValorInputDesdeValor(
    columna: ColumnaTabla<T>,
    valor: ValorInputTabla,
    emitirEvento = true,
  ): void {
    const actualizados = {
      ...this.valoresTrInput(),
      [this.obtenerClaveTrInput(columna)]: valor,
    };

    this.valoresTrInput.set(actualizados);

    if (emitirEvento) {
      this.trInputChange.emit(actualizados);
    }
  }

  private autocompletarHoraFin(
    valores: Partial<Record<string, ValorInputTabla>>,
    columna: ColumnaTabla<T>,
    valor: ValorInputTabla,
  ): void {
    const clave = this.obtenerClaveTrInput(columna);

    if (columna.trInputAutocompletar) {
      columna.trInputAutocompletar(valores, { clave, valor });
      return;
    }

    autocompletarHoraFinTrInput(valores, clave, valor);
  }

  private obtenerBotonAccionDesdeNodo(nodo: EventTarget | null): HTMLElement | null {
    if (!(nodo instanceof HTMLElement)) {
      return null;
    }

    return nodo.closest('.tabla-responsive__action-btn');
  }

  private resolverAccion(accion: AccionTabla<T>): AccionTablaResuelta<T> {
    if (typeof accion === 'string') {
      return {
        id: accion,
        predefinida: accion,
        ...ACCIONES_TABLA_PREDEFINIDAS[accion],
      };
    }

    if ('predefinida' in accion) {
      const { predefinida, ...estado } = accion;
      return {
        id: predefinida,
        predefinida,
        ...ACCIONES_TABLA_PREDEFINIDAS[predefinida],
        ...estado,
      };
    }

    return {
      ...accion,
      variante: 'custom',
    };
  }

  private evaluarCondicionAccion(
    condicion: EstadoAccionTabla<T> | undefined,
    fila: T,
    valorPredeterminado: boolean,
  ): boolean {
    if (typeof condicion === 'function') {
      return condicion(fila);
    }

    return condicion ?? valorPredeterminado;
  }

  private obtenerTextoBotonAccion(boton: HTMLElement): string {
    return (
      boton.dataset['actionText']?.trim() ||
      boton.querySelector('span')?.textContent?.trim() ||
      boton.getAttribute('aria-label')?.trim() ||
      ''
    );
  }

  private renderizarActionHover(boton: HTMLElement): void {
    if (this.altoRendimiento()) {
      return;
    }

    const texto = this.obtenerTextoBotonAccion(boton);
    if (!texto) {
      return;
    }

    this.destruirActionHoverElement();
    this.actionHoverOwner = boton;

    const rect = boton.getBoundingClientRect();
    const estilosBoton = getComputedStyle(boton);
    const pill = this.renderer.createElement('div') as HTMLDivElement;
    this.actionHoverElement = pill;
    const pillColor = estilosBoton.color;
    const pillBackground = estilosBoton.backgroundColor;
    const pillBorderColor = estilosBoton.borderColor;

    const anchoEstimado = Math.max(54, Math.min(220, texto.length * 7.2 + 18));
    const left = Math.min(
      Math.max(8, rect.left + rect.width / 2 - anchoEstimado / 2),
      Math.max(8, window.innerWidth - anchoEstimado - 8),
    );

    this.renderer.addClass(pill, 'tabla-responsive__action-tooltip-flotante');
    this.renderer.setAttribute(pill, 'aria-hidden', 'true');
    this.renderer.setStyle(pill, 'position', 'fixed');
    this.renderer.setStyle(pill, 'left', `${left}px`);
    this.renderer.setStyle(pill, 'top', `${rect.bottom + 6}px`);
    this.renderer.setStyle(pill, 'z-index', '4100');
    this.renderer.setStyle(pill, 'padding', '0.3rem 0.52rem');
    this.renderer.setStyle(pill, 'border-radius', '999px');
    this.renderer.setStyle(pill, 'border', `1px solid ${pillBorderColor}`);
    this.renderer.setStyle(pill, 'background', pillBackground);
    this.renderer.setStyle(pill, 'color', pillColor);
    this.renderer.setStyle(pill, 'box-shadow', '0 8px 16px rgb(0 0 0 / 16%)');
    this.renderer.setStyle(pill, 'font', estilosBoton.font);
    this.renderer.setStyle(pill, 'font-size', '0.64rem');
    this.renderer.setStyle(pill, 'font-weight', '800');
    this.renderer.setStyle(pill, 'line-height', '1');
    this.renderer.setStyle(pill, 'letter-spacing', '0.01em');
    this.renderer.setStyle(pill, 'text-transform', 'uppercase');
    this.renderer.setStyle(pill, 'white-space', 'nowrap');
    this.renderer.setStyle(pill, 'pointer-events', 'none');
    this.renderer.setStyle(pill, 'transform', 'translateY(-0.22rem)');
    this.renderer.setStyle(pill, 'opacity', '0');
    this.renderer.setStyle(pill, 'transition', 'opacity 150ms ease, transform 170ms ease');
    this.renderer.appendChild(pill, this.renderer.createText(texto));
    this.renderer.appendChild(this.document.body, pill);

    requestAnimationFrame(() => {
      if (this.actionHoverElement !== pill) {
        return;
      }

      this.renderer.setStyle(pill, 'opacity', '1');
      this.renderer.setStyle(pill, 'transform', 'translateY(0)');
    });
  }

  private destruirActionHoverElement(): void {
    if (!this.actionHoverElement) {
      this.actionHoverOwner = null;
      return;
    }

    this.renderer.removeChild(this.document.body, this.actionHoverElement);
    this.actionHoverElement = null;
    this.actionHoverOwner = null;
  }

  private crearTooltipState(
    id: string,
    titulo: string,
    texto: string,
    target: HTMLElement,
  ): TooltipTablaState {
    const rect = target.getBoundingClientRect();
    const tooltipWidth = Math.min(288, Math.max(220, window.innerWidth - 48));
    const estimatedHeight = 96;
    const margin = 12;
    const preferredLeft = rect.left + rect.width / 2 - tooltipWidth / 2;
    const left = Math.min(
      Math.max(margin, preferredLeft),
      Math.max(margin, window.innerWidth - tooltipWidth - margin),
    );
    const canOpenTop = rect.top >= estimatedHeight + 24;
    const placement: TooltipTablaState['placement'] = canOpenTop ? 'top' : 'bottom';
    const top = placement === 'top' ? rect.top - 12 : rect.bottom + 12;

    return {
      id,
      titulo,
      texto,
      top,
      left,
      placement,
    };
  }

  private renderizarTooltipEnBody(contenedor: HTMLElement = this.document.body): void {
    const tooltip = this.tooltipActual();
    if (!tooltip) {
      this.destruirTooltipElement();
      return;
    }

    this.tooltipElementRef.current = this.tooltipElement;
    renderizarTooltipTablaEnBody(
      this.renderer,
      this.document,
      tooltip,
      this.tooltipElementRef,
      contenedor,
    );
    this.tooltipElement = this.tooltipElementRef.current;
  }

  private destruirTooltipElement(): void {
    this.tooltipElementRef.current = this.tooltipElement;
    destruirTooltipTablaEnBody(this.renderer, this.document, this.tooltipElementRef);
    this.tooltipElement = this.tooltipElementRef.current;
  }

  private obtenerClaveTrInput(columna: ColumnaTabla<T>): string {
    return columna.trInputKey ?? columna.id;
  }

  private sanitizarValorInput(
    columna: ColumnaTabla<T>,
    input: HTMLInputElement | HTMLSelectElement,
  ): string {
    if (input instanceof HTMLSelectElement) {
      return this.normalizarValorSelect(input.value);
    }

    if (this.esInputDni(columna)) {
      const sanitizado = limpiarDni(input.value);
      input.value = formatearDni(sanitizado);
      return sanitizado;
    }

    if (this.esInputTelefono(columna)) {
      const sanitizado = limpiarTelefono(input.value);
      input.value = formatearTelefono(sanitizado);
      return sanitizado;
    }

    if (this.esInputMoneda(columna)) {
      const sanitizado = input.value.replace(/[^\d,.-]/g, '');
      if (sanitizado !== input.value) {
        input.value = sanitizado;
      }

      return sanitizado;
    }

    if (columna.inputMode === 'numeric') {
      const soloDigitos = input.value.replace(/\D+/g, '');
      const maxLength = columna.maxLength ?? null;
      const valorLimitado =
        typeof maxLength === 'number' && maxLength > 0
          ? soloDigitos.slice(0, maxLength)
          : soloDigitos;
      if (valorLimitado !== input.value) {
        input.value = valorLimitado;
      }

      return valorLimitado;
    }

    return input.value;
  }

  private normalizarValorSelect(valor: unknown): string {
    return String(valor ?? '').trim();
  }

  private obtenerEstadoFoto(
    fila: T,
    columna: ColumnaTabla<T>,
    src: string,
  ): { readonly src: string; readonly cargando: boolean; readonly error: boolean } {
    const clave = this.obtenerTooltipId(fila, columna);
    const almacenado = this.estadosFoto()[clave];

    if (!almacenado || almacenado.src !== src) {
      return { src, cargando: true, error: false };
    }

    return almacenado;
  }

  private actualizarEstadoFoto(
    fila: T,
    columna: ColumnaTabla<T>,
    estado: { readonly src: string; readonly cargando: boolean; readonly error: boolean },
  ): void {
    const clave = this.obtenerTooltipId(fila, columna);
    this.estadosFoto.update((actual) => ({
      ...actual,
      [clave]: estado,
    }));
  }
}
