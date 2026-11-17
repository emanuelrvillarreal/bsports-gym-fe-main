import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';

import { BalanceActualDto } from '../../../../../core/api/interfaces/tesoreria.interfaces';
import { TesoreriaApiService } from '../../../../../core/api/services/tesoreria-api.service';
import { BotonComponent } from '../../../../ui/boton/boton.component';
import { CardHeroItem, CardsHeroComponent } from '../../../../ui/cards-hero/cards-hero.component';

@Component({
  selector: 'app-tesoreria-resumen',
  imports: [BotonComponent, CardsHeroComponent],
  templateUrl: './tesoreria-resumen.component.html',
  styleUrl: './tesoreria-resumen.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TesoreriaResumenComponent {
  private readonly tesoreriaApi = inject(TesoreriaApiService);

  protected readonly balance = signal<BalanceActualDto | null>(null);
  protected readonly cargando = signal(false);
  protected readonly error = signal('');
  protected readonly cards = computed<readonly CardHeroItem[]>(() => {
    const balance = this.balance();
    if (!balance) return [];
    return [
      {
        id: 'ingresos',
        titulo: 'Ingresos totales',
        valor: this.moneda(balance.ingresosTotales),
        subtitulo: 'Mes actual',
        icono: 'heroBanknotes',
        estado: 'ok',
      },
      {
        id: 'egresos',
        titulo: 'Egresos totales',
        valor: this.moneda(balance.egresosTotales),
        subtitulo: 'Mes actual',
        icono: 'heroBanknotes',
        estado: 'danger',
      },
      {
        id: 'por-cobrar',
        titulo: 'Por cobrar',
        valor: this.moneda(balance.porCobrar),
        subtitulo: 'Deuda estimada',
        icono: 'heroExclamationCircle',
        estado: 'warn',
      },
      {
        id: 'netos',
        titulo: 'Ingresos netos',
        valor: this.moneda(balance.ingresosNetos),
        subtitulo: `Estimados ${this.moneda(balance.ingresosEstimados)}`,
        icono: 'heroBanknotes',
        estado: 'info',
      },
    ];
  });

  constructor() {
    this.cargarBalance();
  }

  protected cargarBalance(): void {
    this.cargando.set(true);
    this.error.set('');
    this.tesoreriaApi
      .obtenerBalanceActual()
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (balance) => this.balance.set(balance),
        error: () => this.error.set('No se pudo cargar el balance del mes actual.'),
      });
  }

  private moneda(valor: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(valor);
  }
}
