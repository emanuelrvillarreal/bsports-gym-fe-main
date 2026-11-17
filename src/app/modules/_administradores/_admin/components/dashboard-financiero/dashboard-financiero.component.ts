import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, Subject, switchMap } from 'rxjs';

import {
  BalanceActualDto,
  BalanceResumenMesDto,
  MovimientoRowDto,
} from '../../../../../core/api/interfaces/tesoreria.interfaces';
import { TesoreriaApiService } from '../../../../../core/api/services/tesoreria-api.service';
import { crearRangoMensual } from '../../../../../helpers/fecha-formato';
import { formatearMoneda } from '../../../../../helpers/moneda-formato';
import { CardHeroItem, CardsHeroComponent } from '../../../../ui/cards-hero/cards-hero.component';
import { CardComponent } from '../../../../ui/card/card.component';
import {
  GraficoBarrasComponent,
  BarraGrafico,
} from '../../../../ui/grafico-barras/grafico-barras.component';
import { BotonComponent } from '../../../../ui/boton/boton.component';

export interface PeriodoDashboardFinanciero {
  readonly anio: number;
  readonly mes: number;
}

type BalanceDashboard = Omit<BalanceResumenMesDto, 'periodo'> & {
  readonly periodo: PeriodoDashboardFinanciero;
};

/**
 * Contenedor de dominio del resumen financiero para ADMIN.
 * El hero de filtros se conectará a seleccionarPeriodo y restablecerPeriodo.
 */
@Component({
  selector: 'app-dashboard-financiero',
  standalone: true,
  imports: [BotonComponent, CardComponent, CardsHeroComponent, GraficoBarrasComponent],
  templateUrl: './dashboard-financiero.component.html',
  styleUrl: './dashboard-financiero.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardFinancieroComponent {
  private readonly api = inject(TesoreriaApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly recargas = new Subject<void>();
  private readonly cambiosPeriodo = new Subject<PeriodoDashboardFinanciero>();

  private readonly balanceActual = signal<BalanceDashboard | null>(null);
  private readonly balancesHistoricos = signal<readonly BalanceDashboard[]>([]);
  readonly balanceSeleccionado = signal<BalanceDashboard | null>(null);
  private readonly periodoActivo = signal<PeriodoDashboardFinanciero | null>(null);
  private readonly totalCuotasPendientes = signal(0);

  protected readonly formatearMoneda = formatearMoneda;

  readonly cargando = signal(true);
  readonly error = signal('');
  readonly movimientos = signal<readonly MovimientoRowDto[]>([]);
  readonly periodoSeleccionado = this.periodoActivo.asReadonly();
  readonly periodosDisponibles = computed<readonly PeriodoDashboardFinanciero[]>(() => {
    const actual = this.balanceActual();
    const historicos = this.balancesHistoricos();
    const balances = [actual, ...historicos]
      .filter((balance): balance is BalanceDashboard => balance !== null)
      .map((balance) => balance.periodo);
    return [
      ...new Map(balances.map((periodo) => [`${periodo.anio}-${periodo.mes}`, periodo])).values(),
    ];
  });
  readonly balanceAnioAnterior = computed(() => {
    const periodo = this.periodoSeleccionado();
    if (!periodo) return null;
    return this.buscarBalance(periodo.mes, periodo.anio - 1);
  });
  readonly tieneComparacion = computed(() => this.balanceAnioAnterior() !== null);
  readonly descripcionComparacion = computed(() => {
    const periodo = this.periodoSeleccionado();
    if (!periodo) return '';
    const anterior = this.balanceAnioAnterior();
    return `Comparativa ${this.formatearPeriodo(periodo)} vs ${anterior ? this.formatearPeriodo(anterior.periodo) : 'sin período comparable'}`;
  });
  readonly cards = computed<readonly CardHeroItem[]>(() => {
    const balance = this.balanceSeleccionado();
    if (!balance) return [];
    const periodo = this.formatearPeriodo(balance.periodo);
    return [
      {
        id: 'pendiente-cobro',
        titulo: 'Pendiente de cobro',
        valor: formatearMoneda(balance.porCobrar),
        subtitulo: `${this.totalCuotasPendientes()} cuota(s) pendientes totales`,
        icono: 'heroCalendarDays',
        estado: 'warn',
      },
      {
        id: 'saldo-neto',
        titulo: 'Saldo neto',
        valor: formatearMoneda(balance.ingresosNetos),
        subtitulo: 'Diferencia entre ingresos y egresos',
        icono: 'heroUsers',
        estado: 'ok',
      },
      {
        id: 'ingresos',
        titulo: 'Ingresos',
        valor: formatearMoneda(balance.ingresosTotales),
        subtitulo: `Período ${periodo}`,
        icono: 'heroBanknotes',
        estado: 'ok',
      },
      {
        id: 'egresos',
        titulo: 'Egresos',
        valor: `- ${formatearMoneda(balance.egresosTotales)}`,
        subtitulo: `Egresos del ${periodo}`,
        icono: 'heroExclamationCircle',
        estado: 'danger',
      },
    ];
  });
  readonly barrasComparacion = computed<readonly BarraGrafico[]>(() => {
    const actual = this.balanceSeleccionado();
    const anterior = this.balanceAnioAnterior();
    if (!actual || !anterior) return [];

    const metricas = [
      {
        id: 'ingresos',
        titulo: 'Ingresos',
        color: 'var(--semantic-success)',
        actual: actual.ingresosTotales,
        anterior: anterior.ingresosTotales,
      },
      {
        id: 'egresos',
        titulo: 'Egresos',
        color: 'var(--semantic-danger)',
        actual: actual.egresosTotales,
        anterior: anterior.egresosTotales,
      },
      {
        id: 'saldo',
        titulo: 'Saldo',
        color: 'var(--app-accent)',
        actual: actual.ingresosNetos,
        anterior: anterior.ingresosNetos,
      },
    ] as const;

    return metricas.flatMap((metrica) => {
      const tope = Math.max(1, Math.abs(metrica.actual), Math.abs(metrica.anterior));
      return [
        {
          id: `${metrica.id}-actual`,
          nombre: this.formatearPeriodo(actual.periodo),
          valor: metrica.actual,
          tope,
          color: metrica.color,
          grupoNombre: metrica.titulo,
          etiquetaValor: formatearMoneda(metrica.actual),
        },
        {
          id: `${metrica.id}-anterior`,
          nombre: this.formatearPeriodo(anterior.periodo),
          valor: metrica.anterior,
          tope,
          color: metrica.color,
          grupoNombre: metrica.titulo,
          etiquetaValor: formatearMoneda(metrica.anterior),
        },
      ];
    });
  });
  readonly alertas = computed<readonly string[]>(() => {
    const alertas: string[] = [];
    const pendientes = this.totalCuotasPendientes();
    if (pendientes) alertas.push(`Hay ${pendientes} cuota(s) pendientes de cobro en total.`);
    if (!this.tieneComparacion())
      alertas.push('No hay un balance comparable del mismo mes del año anterior.');
    if (!alertas.length) alertas.push('No hay alertas para el período seleccionado.');
    return alertas;
  });

  constructor() {
    this.escucharCambiosPeriodo();
    this.escucharRecargas();
    this.recargas.next();
  }

  seleccionarPeriodo(periodo: PeriodoDashboardFinanciero): void {
    const balance = this.buscarBalance(periodo.mes, periodo.anio);
    if (this.mismoPeriodo(periodo, this.periodoSeleccionado())) return;
    this.periodoActivo.set(periodo);
    this.balanceSeleccionado.set(balance);
    this.cambiosPeriodo.next(periodo);
  }

  restablecerPeriodo(): void {
    const actual = this.balanceActual();
    if (actual) this.seleccionarPeriodo(actual.periodo);
  }

  reintentar(): void {
    this.recargas.next();
  }

  private escucharCambiosPeriodo(): void {
    this.cambiosPeriodo
      .pipe(
        switchMap((periodo) => {
          this.cargando.set(true);
          this.error.set('');
          const rango = crearRangoMensual(periodo.anio, periodo.mes);
          return forkJoin({
            movimientos: this.api.paginarMovimientos({
              page: 1,
              size: 5,
              ...rango,
              estados: ['ACTIVO'],
            }),
            cuotas: this.api.paginarCuotas({ page: 1, size: 1, estados: ['PENDIENTE', 'VENCIDA'] }),
          });
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ movimientos, cuotas }) => {
          this.movimientos.set(movimientos.content);
          this.totalCuotasPendientes.set(cuotas.totalElements);
          this.cargando.set(false);
        },
        error: () => {
          this.cargando.set(false);
          this.error.set('No se pudieron cargar los datos financieros del período.');
        },
      });
  }

  private escucharRecargas(): void {
    this.recargas
      .pipe(takeUntilDestroyed(this.destroyRef))
      .pipe(
        switchMap(() => {
          this.cargando.set(true);
          this.error.set('');
          return forkJoin({
            actual: this.api.obtenerBalanceActual(),
            historicos: this.api.paginarBalances({ page: 1, size: 100 }),
          });
        }),
      )
      .subscribe({
        next: ({ actual, historicos }) => {
          const balanceActual = this.aBalanceDashboard(actual);
          this.balanceActual.set(balanceActual);
          this.balancesHistoricos.set(
            historicos.content.map((balance) => this.aBalanceDashboard(balance)),
          );
          this.periodoActivo.set(balanceActual.periodo);
          this.balanceSeleccionado.set(balanceActual);
          this.cambiosPeriodo.next(balanceActual.periodo);
        },
        error: () => {
          this.cargando.set(false);
          this.error.set('No se pudo cargar el resumen financiero.');
        },
      });
  }

  private buscarBalance(mes: number, anio: number): BalanceDashboard | null {
    const actual = this.balanceActual();
    if (actual?.periodo.mes === mes && actual.periodo.anio === anio) return actual;
    return (
      this.balancesHistoricos().find(
        (balance) => balance.periodo.mes === mes && balance.periodo.anio === anio,
      ) ?? null
    );
  }

  private aBalanceDashboard(balance: BalanceActualDto): BalanceDashboard {
    return { ...balance, periodo: { mes: balance.mes, anio: balance.anio } };
  }

  protected formatearPeriodo(periodo: PeriodoDashboardFinanciero): string {
    return `${String(periodo.mes).padStart(2, '0')}/${periodo.anio}`;
  }

  private mismoPeriodo(
    a: PeriodoDashboardFinanciero,
    b: PeriodoDashboardFinanciero | null,
  ): boolean {
    return !!b && a.mes === b.mes && a.anio === b.anio;
  }
}
