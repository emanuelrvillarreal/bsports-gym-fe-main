import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  effect,
  HostListener,
  input,
  OnDestroy,
  output,
  PLATFORM_ID,
  signal,
  inject,
} from '@angular/core';
import { NgClass, NgTemplateOutlet, isPlatformBrowser } from '@angular/common';
import { NgIcon } from '@ng-icons/core';
import { provideCarruselIcons } from '../../../core/icons/app-icons.registry';
import {
  CARRUSEL_3D_AUTOPLAY_MS_DEFAULT,
  CARRUSEL_3D_UMBRAL_ARRASTRE_PX,
  CARRUSEL_3D_UMBRAL_CLICK_ARRASTRE_PX,
} from '../../../helpers/carrusel-3d.constants';
import { Carrusel3dItemDirective } from './carrusel-3d-item.directive';
import { BotonComponent } from '../boton/boton.component';

type DragState = {
  startX: number;
  deltaX: number;
};

@Component({
  selector: 'app-carrusel-3d',
  standalone: true,
  imports: [BotonComponent, NgClass, NgIcon, NgTemplateOutlet],
  providers: [provideCarruselIcons()],
  templateUrl: './carrusel-3d.component.html',
  styleUrl: './carrusel-3d.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Carrusel3dComponent<T> implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly esNavegador = isPlatformBrowser(this.platformId);
  private autoplayIntervalId: ReturnType<typeof setInterval> | null = null;

  readonly items = input<readonly T[]>([]);
  readonly ariaLabel = input('Carrusel 3D');
  readonly altura = input('26rem');
  readonly radio = input('24rem');
  readonly anchoSlide = input('18rem');
  readonly perspectiva = input('1600px');
  readonly autoplay = input(false);
  readonly autoplayMs = input(CARRUSEL_3D_AUTOPLAY_MS_DEFAULT);
  readonly pausaEnHover = input(true);
  readonly mostrarControles = input(false);
  readonly modoMovil = input<'fallback' | 'three-d'>('fallback');
  readonly altoRendimiento = input(false);

  readonly cambioIndice = output<number>();
  readonly itemSeleccionado = output<T>();

  protected readonly plantillaItem =
    contentChild<Carrusel3dItemDirective<T>>(Carrusel3dItemDirective);
  protected readonly indiceActivo = signal(0);
  protected readonly hoverActivo = signal(false);
  protected readonly arrastre = signal<DragState | null>(null);

  protected readonly total = computed(() => this.items().length);
  protected readonly tieneItems = computed(() => this.total() > 0);
  protected readonly tieneMultiples = computed(() => this.total() > 1);
  protected readonly anguloPorItem = computed(() => {
    const total = this.total();
    return total > 0 ? 360 / total : 0;
  });
  protected readonly rotacionEscena = computed(
    () => `rotateY(${-this.indiceActivo() * this.anguloPorItem()}deg)`,
  );
  protected readonly slides = computed(() =>
    this.items().map((item, index) => ({
      item,
      index,
      active: index === this.indiceActivo(),
      angle: index * this.anguloPorItem(),
      distance: this.calcularDistancia(index),
    })),
  );
  /** Ventana visual acotada: conserva el efecto 3D sin montar todas las slides. */
  protected readonly slidesVisibles = computed(() =>
    this.slides()
      .filter((slide) => Math.abs(slide.distance) <= 1)
      .map((slide) => ({
        ...slide,
        // La separación visual es constante y no depende de la cantidad total.
        angle: this.indiceActivo() * this.anguloPorItem() + slide.distance * 35,
      })),
  );

  constructor() {
    effect(() => {
      const total = this.total();
      const indice = this.indiceActivo();
      if (!total) {
        this.detenerAutoplay();
        return;
      }

      if (indice >= total) {
        this.indiceActivo.set(0);
      }

      if (this.altoRendimiento()) {
        this.detenerAutoplay();
        return;
      }

      if (
        this.autoplay() &&
        this.tieneMultiples() &&
        (!this.pausaEnHover() || !this.hoverActivo())
      ) {
        this.iniciarAutoplay();
        return;
      }

      this.detenerAutoplay();
    });
  }

  ngOnDestroy(): void {
    this.detenerAutoplay();
  }

  protected avanzar(): void {
    this.irA(this.indiceActivo() + 1);
  }

  protected retroceder(): void {
    this.irA(this.indiceActivo() - 1);
  }

  protected irA(indice: number): void {
    const total = this.total();
    if (!total) {
      return;
    }

    const normalizado = ((indice % total) + total) % total;
    this.indiceActivo.set(normalizado);
    this.cambioIndice.emit(normalizado);
  }

  protected obtenerTransformSlide(angle: number): string {
    return `rotateY(${angle}deg) translateZ(${this.radio()})`;
  }

  protected obtenerClaseProfundidad(distance: number): string {
    const magnitud = Math.abs(distance);
    if (magnitud === 0) {
      return 'carrusel-3d__slide--frontal';
    }
    if (magnitud === 1) {
      return 'carrusel-3d__slide--cercano';
    }
    return 'carrusel-3d__slide--lejano';
  }

  protected iniciarArrastre(evento: PointerEvent): void {
    if (!this.tieneMultiples()) {
      return;
    }

    this.arrastre.set({ startX: evento.clientX, deltaX: 0 });
  }

  protected actualizarArrastre(evento: PointerEvent): void {
    const actual = this.arrastre();
    if (!actual) {
      return;
    }

    this.arrastre.set({
      startX: actual.startX,
      deltaX: evento.clientX - actual.startX,
    });
  }

  protected finalizarArrastre(): void {
    const actual = this.arrastre();
    if (!actual) {
      return;
    }

    if (actual.deltaX <= -CARRUSEL_3D_UMBRAL_ARRASTRE_PX) {
      this.avanzar();
    } else if (actual.deltaX >= CARRUSEL_3D_UMBRAL_ARRASTRE_PX) {
      this.retroceder();
    }

    this.arrastre.set(null);
  }

  protected manejarClickSlide(index: number, active: boolean, item: T, evento: MouseEvent): void {
    const arrastre = this.arrastre();
    if (arrastre && Math.abs(arrastre.deltaX) > CARRUSEL_3D_UMBRAL_CLICK_ARRASTRE_PX) {
      evento.preventDefault();
      evento.stopPropagation();
      return;
    }

    if (!active) {
      evento.preventDefault();
      evento.stopPropagation();
      this.irA(index);
      return;
    }

    this.itemSeleccionado.emit(item);
  }

  protected seleccionarItemPlano(item: T): void {
    this.itemSeleccionado.emit(item);
  }

  @HostListener('pointerup')
  @HostListener('pointercancel')
  protected cancelarArrastre(): void {
    this.finalizarArrastre();
  }

  @HostListener('mouseleave')
  protected alSalir(): void {
    this.hoverActivo.set(false);
    this.finalizarArrastre();
  }

  protected alEntrar(): void {
    this.hoverActivo.set(true);
  }

  private calcularDistancia(index: number): number {
    const total = this.total();
    if (!total) {
      return 0;
    }

    const activa = this.indiceActivo();
    const haciaAdelante = (index - activa + total) % total;
    const haciaAtras = haciaAdelante - total;

    return Math.abs(haciaAdelante) <= Math.abs(haciaAtras) ? haciaAdelante : haciaAtras;
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
}
