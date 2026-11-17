import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  PLATFORM_ID,
  computed,
  contentChild,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { NgTemplateOutlet, isPlatformBrowser } from '@angular/common';
import { NgIcon } from '@ng-icons/core';

import { provideCarruselIcons } from '../../../core/icons/app-icons.registry';
import { BotonComponent } from '../boton/boton.component';
import { LoadSpinnerBlueComponent } from '../load-spinner-blue/load-spinner-blue.component';
import { CarruselFadeItemDirective } from './carrusel-fade-item.directive';

type ItemSaliente<T> = {
  readonly item: T;
  readonly index: number;
};

const DURACION_TRANSICION_MS_DEFAULT = 320;
const AUTOPLAY_MS_DEFAULT = 5000;
const MEDIA_QUERY_TELEFONO = '(max-width: 36rem)';

type Deslizamiento = {
  readonly pointerId: number;
  readonly inicioX: number;
  readonly inicioY: number;
};

@Component({
  selector: 'app-carrusel-fade',
  standalone: true,
  imports: [BotonComponent, LoadSpinnerBlueComponent, NgIcon, NgTemplateOutlet],
  providers: [provideCarruselIcons()],
  templateUrl: './carrusel-fade.component.html',
  styleUrl: './carrusel-fade.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarruselFadeComponent<T> implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly esNavegador = isPlatformBrowser(this.platformId);
  private autoplayIntervalId: ReturnType<typeof setInterval> | null = null;
  private transicionTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private omitirSeleccionTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private deslizamiento: Deslizamiento | null = null;
  private omitirSiguienteSeleccion = false;

  readonly items = input<readonly T[]>([]);
  readonly cargando = input(false);
  readonly ariaLabel = input('Carrusel');
  readonly titulo = input('');
  readonly altura = input('20rem');
  /**
   * Deja que el slide activo amplíe el viewport. El modo fijo es el predeterminado.
   */
  readonly alturaAutomatica = input(false);
  readonly autoplay = input(false);
  readonly autoplayMs = input(AUTOPLAY_MS_DEFAULT);
  readonly mostrarControles = input(true);
  /** Restablece el carrusel al primer elemento cuando cambia esta clave. */
  readonly claveReinicio = input<unknown>(null);
  /**
   * En teléfonos oculta las flechas y permite navegar deslizando horizontalmente.
   */
  readonly navegacionMovilPorDeslizamiento = input(false);
  readonly duracionTransicionMs = input(DURACION_TRANSICION_MS_DEFAULT);

  readonly cambioIndice = output<number>();
  readonly itemSeleccionado = output<T>();

  protected readonly plantillaItem =
    contentChild<CarruselFadeItemDirective<T>>(CarruselFadeItemDirective);
  protected readonly indiceActivo = signal(0);
  protected readonly itemSaliente = signal<ItemSaliente<T> | null>(null);
  protected readonly total = computed(() => this.items().length);
  protected readonly tieneItems = computed(() => this.total() > 0);
  protected readonly tieneMultiples = computed(() => this.total() > 1);
  protected readonly itemActivo = computed(() => this.items()[this.indiceActivo()] ?? null);

  constructor() {
    let claveAnterior: unknown = Symbol('clave-inicial');

    effect(() => {
      const total = this.total();
      const claveActual = this.claveReinicio();

      if (claveActual !== claveAnterior) {
        claveAnterior = claveActual;
        this.indiceActivo.set(0);
        this.limpiarTransicion();
      }

      if (!total) {
        this.detenerAutoplay();
        this.limpiarTransicion();
        this.indiceActivo.set(0);
        return;
      }

      if (this.indiceActivo() >= total) {
        this.indiceActivo.set(0);
      }

      if (this.autoplay() && this.tieneMultiples()) {
        this.iniciarAutoplay();
        return;
      }

      this.detenerAutoplay();
    });
  }

  ngOnDestroy(): void {
    this.detenerAutoplay();
    this.limpiarTransicion();
    this.cancelarOmitirSeleccion();
  }

  protected avanzar(): void {
    this.irA(this.indiceActivo() + 1);
  }

  protected retroceder(): void {
    this.irA(this.indiceActivo() - 1);
  }

  protected seleccionarItem(): void {
    if (this.omitirSiguienteSeleccion) {
      this.cancelarOmitirSeleccion();
      return;
    }

    const item = this.itemActivo();
    if (item !== null) {
      this.itemSeleccionado.emit(item);
    }
  }

  protected irA(indice: number): void {
    const total = this.total();
    if (!total) {
      return;
    }

    const normalizado = ((indice % total) + total) % total;
    if (normalizado === this.indiceActivo()) {
      return;
    }

    const itemActual = this.itemActivo();
    if (itemActual !== null) {
      this.itemSaliente.set({ item: itemActual, index: this.indiceActivo() });
    }
    this.indiceActivo.set(normalizado);
    this.cambioIndice.emit(normalizado);
    this.programarFinTransicion();
  }

  protected iniciarDeslizamiento(evento: PointerEvent): void {
    if (
      !this.puedeDeslizar(evento) ||
      (evento.target instanceof Element &&
        !!evento.target.closest('button, a, input, select, textarea, [role="button"]'))
    ) {
      return;
    }

    const viewport = evento.currentTarget;
    if (!(viewport instanceof HTMLElement)) {
      return;
    }

    this.deslizamiento = {
      pointerId: evento.pointerId,
      inicioX: evento.clientX,
      inicioY: evento.clientY,
    };

    if (typeof viewport.setPointerCapture === 'function') {
      viewport.setPointerCapture(evento.pointerId);
    }
  }

  protected finalizarDeslizamiento(evento: PointerEvent): void {
    const deslizamiento = this.deslizamiento;
    const viewport = evento.currentTarget;
    if (
      !deslizamiento ||
      deslizamiento.pointerId !== evento.pointerId ||
      !(viewport instanceof HTMLElement)
    ) {
      return;
    }

    const desplazamientoX = deslizamiento.inicioX - evento.clientX;
    const desplazamientoY = deslizamiento.inicioY - evento.clientY;
    const umbral = Math.max(44, Math.min(72, viewport.clientWidth * 0.15));
    const esDeslizamientoHorizontal =
      Math.abs(desplazamientoX) >= umbral &&
      Math.abs(desplazamientoX) > Math.abs(desplazamientoY) * 1.15;

    this.liberarCaptura(viewport, evento.pointerId);
    this.deslizamiento = null;

    if (!esDeslizamientoHorizontal) {
      return;
    }

    this.programarOmitirSeleccion();
    if (desplazamientoX > 0) {
      this.avanzar();
    } else {
      this.retroceder();
    }
  }

  protected cancelarDeslizamiento(evento: PointerEvent): void {
    const deslizamiento = this.deslizamiento;
    const viewport = evento.currentTarget;
    if (
      !deslizamiento ||
      deslizamiento.pointerId !== evento.pointerId ||
      !(viewport instanceof HTMLElement)
    ) {
      return;
    }

    this.liberarCaptura(viewport, evento.pointerId);
    this.deslizamiento = null;
  }

  private iniciarAutoplay(): void {
    if (!this.esNavegador || this.autoplayIntervalId) {
      return;
    }

    this.autoplayIntervalId = setInterval(() => this.avanzar(), this.autoplayMs());
  }

  private detenerAutoplay(): void {
    if (!this.autoplayIntervalId) {
      return;
    }

    clearInterval(this.autoplayIntervalId);
    this.autoplayIntervalId = null;
  }

  private programarFinTransicion(): void {
    this.cancelarTemporizadorTransicion();
    this.transicionTimeoutId = setTimeout(() => {
      this.itemSaliente.set(null);
      this.transicionTimeoutId = null;
    }, this.duracionTransicionMs());
  }

  private limpiarTransicion(): void {
    this.cancelarTemporizadorTransicion();
    this.itemSaliente.set(null);
  }

  private cancelarTemporizadorTransicion(): void {
    if (this.transicionTimeoutId) {
      clearTimeout(this.transicionTimeoutId);
      this.transicionTimeoutId = null;
    }
  }

  private puedeDeslizar(evento: PointerEvent): boolean {
    return (
      this.navegacionMovilPorDeslizamiento() &&
      this.tieneMultiples() &&
      evento.isPrimary &&
      evento.button === 0 &&
      this.esNavegador &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia(MEDIA_QUERY_TELEFONO).matches
    );
  }

  private liberarCaptura(viewport: HTMLElement, pointerId: number): void {
    if (
      typeof viewport.hasPointerCapture === 'function' &&
      typeof viewport.releasePointerCapture === 'function' &&
      viewport.hasPointerCapture(pointerId)
    ) {
      viewport.releasePointerCapture(pointerId);
    }
  }

  private programarOmitirSeleccion(): void {
    this.cancelarOmitirSeleccion();
    this.omitirSiguienteSeleccion = true;
    this.omitirSeleccionTimeoutId = setTimeout(() => {
      this.omitirSiguienteSeleccion = false;
      this.omitirSeleccionTimeoutId = null;
    });
  }

  private cancelarOmitirSeleccion(): void {
    if (this.omitirSeleccionTimeoutId) {
      clearTimeout(this.omitirSeleccionTimeoutId);
      this.omitirSeleccionTimeoutId = null;
    }
    this.omitirSiguienteSeleccion = false;
  }
}
