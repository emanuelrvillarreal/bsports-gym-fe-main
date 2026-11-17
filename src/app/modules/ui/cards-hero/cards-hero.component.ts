import { NgClass, NgTemplateOutlet, isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, PLATFORM_ID, computed, effect, inject, input, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { provideCardsHeroIcons } from '../../../core/icons/app-icons.registry';
import {
  DURACION_ANIMACION_CARDS_HERO_MS,
  escaparHtmlCardsHero,
  formatearValorAnimadoCardsHero,
  obtenerValorNumericoCardsHero,
} from '../../../helpers/cards-hero-animacion.helpers';
import { Carrusel3dComponent } from '../carrusel-3d/carrusel-3d.component';
import { Carrusel3dItemDirective } from '../carrusel-3d/carrusel-3d-item.directive';
import { LoadSpinnerBlueComponent } from '../load-spinner-blue/load-spinner-blue.component';

export type CardHeroIcono = 'heroUsers' | 'heroExclamationCircle' | 'heroCalendarDays' | 'heroBanknotes';
export type CardHeroEstado = 'ok' | 'warn' | 'info' | 'danger';
export type CardHeroValor = string | readonly string[];

export interface CardHeroItem {
  readonly id?: string;
  readonly titulo: string;
  readonly valor: CardHeroValor;
  readonly subtitulo: string;
  readonly icono: CardHeroIcono;
  readonly estado?: CardHeroEstado;
}

@Component({
  selector: 'app-cards-hero',
  standalone: true,
  imports: [NgClass, NgTemplateOutlet, NgIcon, Carrusel3dComponent, Carrusel3dItemDirective, LoadSpinnerBlueComponent],
  providers: [provideCardsHeroIcons()],
  templateUrl: './cards-hero.component.html',
  styleUrl: './cards-hero.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardsHeroComponent implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly esNavegador = isPlatformBrowser(this.platformId);
  private readonly animaciones = new Map<string, number>();
  private readonly valoresAnimados = signal<Record<string, string>>({});

  readonly items = input<readonly CardHeroItem[]>([]);
  readonly columnas = input(4);
  readonly altoRendimiento = input(false);
  readonly cargando = input(false);
  readonly cantidadCarga = input(4);
  protected readonly indicesCarga = computed(() =>
    Array.from({ length: Math.max(1, Math.trunc(this.cantidadCarga())) }, (_, indice) => indice),
  );

  constructor() {
    effect(() => {
      this.animarValores(this.items(), this.altoRendimiento());
    });
  }

  ngOnDestroy(): void {
    this.limpiarAnimaciones();
  }

  protected obtenerTrack(indice: number, item: CardHeroItem): string {
    return this.obtenerClave(indice, item);
  }

  protected obtenerValorAnimado(indice: number, item: CardHeroItem): string {
    if (Array.isArray(item.valor)) {
      return '';
    }

    const valor = item.valor as string;

    if (this.altoRendimiento()) {
      return valor;
    }

    return this.valoresAnimados()[this.obtenerClave(indice, item)] ?? valor;
  }

  protected obtenerValorHtml(indice: number, item: CardHeroItem): string {
    return escaparHtmlCardsHero(this.obtenerValorAnimado(indice, item));
  }

  protected valorEsLista(item: CardHeroItem): boolean {
    return Array.isArray(item.valor);
  }

  protected obtenerValorLista(item: CardHeroItem): string {
    if (!Array.isArray(item.valor)) {
      return '';
    }

    return item.valor
      .map((valor) => String(valor ?? '').trim())
      .filter(Boolean)
      .join(', ');
  }

  protected columnasGrid(): number {
    const columnas = this.columnas();
    return Number.isFinite(columnas) ? Math.max(1, Math.min(6, Math.trunc(columnas))) : 4;
  }

  private animarValores(items: readonly CardHeroItem[], altoRendimiento: boolean): void {
    this.limpiarAnimaciones();

    const valoresIniciales: Record<string, string> = {};

    for (let indice = 0; indice < items.length; indice += 1) {
      const item = items[indice];
      const clave = this.obtenerClave(indice, item);
      if (Array.isArray(item.valor)) {
        valoresIniciales[clave] = '';
        continue;
      }

      const valorOriginal = item.valor as string;
      const valor = obtenerValorNumericoCardsHero(valorOriginal);

      if (altoRendimiento || !this.esNavegador || !valor) {
        valoresIniciales[clave] = valorOriginal;
        continue;
      }

      valoresIniciales[clave] = formatearValorAnimadoCardsHero(0, valorOriginal);
      this.iniciarAnimacion(clave, valorOriginal, valor);
    }

    this.valoresAnimados.set(valoresIniciales);
  }

  private iniciarAnimacion(clave: string, valorOriginal: string, objetivo: number): void {
    const inicio = performance.now();

    const animar = (tiempoActual: number): void => {
      const progreso = Math.min((tiempoActual - inicio) / DURACION_ANIMACION_CARDS_HERO_MS, 1);
      const valorActual = Math.round(objetivo * progreso);

      this.valoresAnimados.update((valores) => ({
        ...valores,
        [clave]: progreso >= 1 ? valorOriginal : formatearValorAnimadoCardsHero(valorActual, valorOriginal),
      }));

      if (progreso >= 1) {
        this.animaciones.delete(clave);
        return;
      }

      this.animaciones.set(clave, requestAnimationFrame(animar));
    };

    this.animaciones.set(clave, requestAnimationFrame(animar));
  }

  private obtenerClave(indice: number, item: CardHeroItem): string {
    return item.id ?? `${item.titulo}-${indice}`;
  }

  private limpiarAnimaciones(): void {
    for (const animacion of this.animaciones.values()) {
      cancelAnimationFrame(animacion);
    }

    this.animaciones.clear();
  }
}
