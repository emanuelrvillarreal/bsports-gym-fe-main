import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';

import {
  DURACION_ANIMACION_CARDS_HERO_MS,
  formatearValorAnimadoCardsHero,
  obtenerValorNumericoCardsHero,
} from '../../../../../helpers/cards-hero-animacion.helpers';
import { BotonComponent } from '../../../../ui/boton/boton.component';
import { SelectComponent, SelectOption } from '../../../../ui/select/select.component';
import { TituloHeroComponent } from '../../../../ui/titulo-hero/titulo-hero.component';

/** Período que controla la información financiera mostrada en el dashboard. */
export interface PeriodoDashboardFinanciero {
  readonly anio: string;
  readonly mes: string;
}

@Component({
  selector: 'app-dashboard-financiero-hero',
  standalone: true,
  imports: [BotonComponent, SelectComponent, TituloHeroComponent],
  templateUrl: './dashboard-financiero-hero.component.html',
  styleUrl: './dashboard-financiero-hero.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardFinancieroHeroComponent {
  /** Nombre comercial de la empresa que se muestra en el encabezado. */
  readonly empresa = input('');
  readonly logoUrl = input('');
  readonly periodo = input.required<PeriodoDashboardFinanciero>();
  readonly saldoNeto = input('$0');
  readonly detalleSaldoNeto = input('Ingresos $0 / Egresos $0');
  readonly anios = input<readonly SelectOption[]>([]);
  readonly meses = input<readonly SelectOption[]>([]);
  readonly cargando = input(false);

  readonly periodoCambiado = output<PeriodoDashboardFinanciero>();
  readonly restablecer = output<void>();
  protected readonly saldoNetoAnimado = signal('$0');
  private animacionSaldo: number | null = null;

  constructor() {
    effect(() => this.animarSaldoNeto(this.saldoNeto()));
  }

  protected cambiarAnio(anio: string): void {
    this.emitirPeriodo({ anio, mes: this.periodo().mes });
  }

  protected cambiarMes(mes: string): void {
    this.emitirPeriodo({ anio: this.periodo().anio, mes });
  }

  protected solicitarRestablecimiento(): void {
    if (!this.cargando()) {
      this.restablecer.emit();
    }
  }

  private emitirPeriodo(periodo: PeriodoDashboardFinanciero): void {
    const periodoActual = this.periodo();
    if (
      !this.cargando() &&
      (periodo.anio !== periodoActual.anio || periodo.mes !== periodoActual.mes)
    ) {
      this.periodoCambiado.emit(periodo);
    }
  }

  private animarSaldoNeto(valorOriginal: string): void {
    if (this.animacionSaldo !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this.animacionSaldo);
    }

    const valorFinal = obtenerValorNumericoCardsHero(valorOriginal);
    if (valorFinal === null || typeof requestAnimationFrame !== 'function') {
      this.saldoNetoAnimado.set(valorOriginal);
      return;
    }

    const inicio = performance.now();
    const actualizar = (ahora: number): void => {
      const progreso = Math.min((ahora - inicio) / DURACION_ANIMACION_CARDS_HERO_MS, 1);
      this.saldoNetoAnimado.set(
        formatearValorAnimadoCardsHero(valorFinal * progreso, valorOriginal),
      );

      if (progreso < 1) {
        this.animacionSaldo = requestAnimationFrame(actualizar);
      } else {
        this.animacionSaldo = null;
      }
    };

    this.saldoNetoAnimado.set(formatearValorAnimadoCardsHero(0, valorOriginal));
    this.animacionSaldo = requestAnimationFrame(actualizar);
  }
}
