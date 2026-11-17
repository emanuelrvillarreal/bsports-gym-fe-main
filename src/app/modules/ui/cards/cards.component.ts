import { DecimalPipe, TitleCasePipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { provideCardsCatalogIcons } from '../../../core/icons/app-icons.registry';
import { formatearMoneda } from '../../../helpers/moneda-formato';
import { BotonComponent } from '../boton/boton.component';

export interface CatalogCardMeta {
  readonly label: string;
  readonly value: string;
  readonly icon?: string;
}

export interface CatalogCardBadge {
  readonly text: string;
  readonly icon?: string;
}

/** Contrato genérico para tarjetas de catálogo/listado en apps derivadas del template. */
export interface CatalogCardItem {
  readonly titulo: string;
  readonly eyebrow?: string;
  readonly metadatos?: readonly CatalogCardMeta[];
  readonly monto?: number | null;
  readonly etiquetas?: readonly string[];
  readonly badge?: CatalogCardBadge | null;
  readonly progreso?: { readonly actual: number; readonly maximo: number } | null;
  readonly notaPie?: string | null;
}

@Component({
  selector: 'app-cards',
  imports: [BotonComponent, DecimalPipe, NgIcon, TitleCasePipe],
  providers: [provideCardsCatalogIcons()],
  templateUrl: './cards.component.html',
  styleUrl: './cards.component.scss',
})
export class CardsComponent {
  readonly item = input.required<CatalogCardItem>();
  readonly altoRendimiento = input(false);

  readonly itemSeleccionado = output<CatalogCardItem>();

  protected readonly porcentajeProgreso = computed(() => {
    const progreso = this.item().progreso;
    if (!progreso || progreso.maximo <= 0) {
      return 0;
    }

    return Math.min(100, Math.round((progreso.actual / progreso.maximo) * 100));
  });

  protected readonly progresoCompleto = computed(() => {
    const progreso = this.item().progreso;
    return !!progreso && progreso.maximo > 0 && progreso.actual >= progreso.maximo;
  });

  protected readonly progresoAlto = computed(
    () => this.porcentajeProgreso() >= 90 && !this.progresoCompleto(),
  );

  protected readonly mostrarProgreso = computed(() => {
    const progreso = this.item().progreso;
    return !!progreso && progreso.maximo > 0;
  });

  protected readonly formatearMoneda = formatearMoneda;

  protected seleccionarItem(): void {
    this.itemSeleccionado.emit(this.item());
  }
}
