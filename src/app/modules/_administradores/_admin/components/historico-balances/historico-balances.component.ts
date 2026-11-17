import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { BalanceResumenMesDto } from '../../../../../core/api/interfaces/tesoreria.interfaces';
import { TesoreriaApiService } from '../../../../../core/api/services/tesoreria-api.service';
import { CardComponent } from '../../../../ui/card/card.component';
import { formatearMoneda } from '../../../../../helpers/moneda-formato';
import { GraficoBarrasComponent, BarraGrafico } from '../../../../ui/grafico-barras/grafico-barras.component';
import { PaginacionComponent } from '../../../../ui/paginacion/paginacion.component';
import { PopupComponent } from '../../../../ui/popup/popup.component';
import { ColumnaTabla, EventoAccionTabla, TablaResponsiveComponent } from '../../../../ui/tabla-responsive/tabla-responsive.component';
import { TituloHeroComponent } from '../../../../ui/titulo-hero/titulo-hero.component';

type BalanceFila = BalanceResumenMesDto & { readonly periodoTexto: string };
type ComparacionBalance = {
  readonly seleccionado: BalanceFila;
  readonly anterior: BalanceFila;
};

@Component({
  selector: 'app-historico-balances',
  imports: [CardComponent, GraficoBarrasComponent, PaginacionComponent, PopupComponent, TablaResponsiveComponent, TituloHeroComponent],
  templateUrl: './historico-balances.component.html',
  styleUrl: './historico-balances.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoricoBalancesComponent {
  private readonly api = inject(TesoreriaApiService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly filas = signal<readonly BalanceFila[]>([]);
  /** Página siguiente precargada para validar comparaciones que cruzan el corte de 25 meses. */
  protected readonly filasSiguientePagina = signal<readonly BalanceFila[]>([]);
  protected readonly pagina = signal(1);
  protected readonly totalPaginas = signal(1);
  protected readonly cargando = signal(false);
  protected readonly cargandoComparacion = signal(false);
  protected readonly error = signal('');
  protected readonly balanceSeleccionado = signal<BalanceFila | null>(null);
  protected readonly comparacionSeleccionada = signal<ComparacionBalance | null>(null);
  protected readonly barrasBalance = computed<readonly BarraGrafico[]>(() => {
    const balance = this.balanceSeleccionado();
    if (!balance) return [];

    const valores = [
      { id: 'ingresos', nombre: 'Ingresos', valor: balance.ingresosTotales, color: 'var(--semantic-success)' },
      { id: 'egresos', nombre: 'Egresos', valor: balance.egresosTotales, color: 'var(--semantic-danger)' },
      { id: 'por-cobrar', nombre: 'Por cobrar', valor: balance.porCobrar, color: 'var(--semantic-warning)' },
      { id: 'neto', nombre: 'Neto', valor: balance.ingresosNetos, color: '#8b5cf6' },
      { id: 'estimado', nombre: 'Estimado', valor: balance.ingresosEstimados, color: '#38bdf8' },
    ] as const;
    const tope = Math.max(1, ...valores.map(({ valor }) => Math.abs(valor)));

    return valores.map((barra) => ({
      ...barra,
      tope,
      etiquetaValor: formatearMoneda(barra.valor),
    }));
  });
  protected readonly columnas: readonly ColumnaTabla<BalanceFila>[] = [
    { id: 'periodoTexto', titulo: 'Período' },
    { id: 'ingresosTotales', titulo: 'Ingresos', tipo: 'moneda' },
    { id: 'egresosTotales', titulo: 'Egresos', tipo: 'moneda' },
    { id: 'porCobrar', titulo: 'Por cobrar', tipo: 'moneda' },
    { id: 'ingresosNetos', titulo: 'Neto', tipo: 'moneda' },
    { id: 'ingresosEstimados', titulo: 'Estimado', tipo: 'moneda' },
  ];
  protected readonly acciones = [
    'ver',
    {
      id: 'comparar',
      texto: 'Comparar con año anterior',
      icono: 'heroArrowsRightLeft',
      color: (fila: BalanceFila) =>
        this.tieneBalanceAnioAnterior(fila) ? 'var(--app-accent)' : '#9ca3af',
      deshabilitada: (fila: BalanceFila) => !this.tieneBalanceAnioAnterior(fila),
      descripcionDeshabilitada: 'No hay mes al cual comparar.',
      cargando: () => this.cargandoComparacion(),
    },
  ] as const;
  constructor() { this.cargar(); }
  protected cambiarPagina(pagina: number): void { this.pagina.set(pagina); this.cargar(); }
  protected manejarAccion(evento: EventoAccionTabla<BalanceFila>): void {
    if (evento.accion === 'ver') this.balanceSeleccionado.set(evento.fila);
    if (evento.accion === 'comparar') this.compararConAnioAnterior(evento.fila);
  }
  protected cerrarBalance(): void { this.balanceSeleccionado.set(null); }
  protected cerrarComparacion(): void { this.comparacionSeleccionada.set(null); }
  private cargar(): void {
    this.cargando.set(true); this.error.set('');
    this.api.paginarBalances({ page: this.pagina(), size: 25 }).pipe(
      takeUntilDestroyed(this.destroyRef), finalize(() => this.cargando.set(false)),
    ).subscribe({
      next: (respuesta) => {
        this.filas.set(respuesta.content.map((item) => ({ ...item, periodoTexto: `${String(item.mes).padStart(2, '0')}-${item.anio}` })));
        this.totalPaginas.set(Math.max(1, respuesta.totalPages));
        this.filasSiguientePagina.set([]);
        this.cargarSiguientePagina();
      },
      error: () => this.error.set('No se pudo cargar el histórico de balances.'),
    });
  }

  private compararConAnioAnterior(seleccionado: BalanceFila): void {
    if (this.cargandoComparacion()) return;

    const anterior = this.buscarBalanceAnioAnterior(seleccionado, [
      ...this.filas(),
      ...this.filasSiguientePagina(),
    ]);
    if (anterior) {
      this.comparacionSeleccionada.set({ seleccionado, anterior });
      return;
    }

    if (this.pagina() >= this.totalPaginas()) {
      this.error.set('No hay un balance del mismo período para el año anterior.');
      return;
    }

    this.cargandoComparacion.set(true);
    this.error.set('');
    this.api.paginarBalances({ page: this.pagina() + 1, size: 25 }).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.cargandoComparacion.set(false)),
    ).subscribe({
      next: (respuesta) => {
        const anterior = this.buscarBalanceAnioAnterior(seleccionado, respuesta.content);
        if (anterior) {
          this.comparacionSeleccionada.set({ seleccionado, anterior });
          return;
        }
        this.error.set('No hay un balance del mismo período para el año anterior.');
      },
      error: () => this.error.set('No se pudo cargar el balance del año anterior.'),
    });
  }

  protected readonly barrasComparacion = computed<readonly BarraGrafico[]>(() => {
    const comparacion = this.comparacionSeleccionada();
    if (!comparacion) return [];

    const metricas = [
      { id: 'ingresosTotales', nombre: 'Ingresos', color: 'var(--semantic-success)' },
      { id: 'egresosTotales', nombre: 'Egresos', color: 'var(--semantic-danger)' },
      { id: 'porCobrar', nombre: 'Por cobrar', color: 'var(--semantic-warning)' },
      { id: 'ingresosNetos', nombre: 'Neto', color: '#8b5cf6' },
      { id: 'ingresosEstimados', nombre: 'Estimado', color: '#38bdf8' },
    ] as const;

    return metricas.flatMap((metrica) => {
      const valorSeleccionado = comparacion.seleccionado[metrica.id];
      const valorAnterior = comparacion.anterior[metrica.id];
      const tope = Math.max(1, Math.abs(valorSeleccionado), Math.abs(valorAnterior));

      return [
        {
          id: `${metrica.id}-seleccionado`,
          nombre: comparacion.seleccionado.periodoTexto,
          valor: valorSeleccionado,
          tope,
          color: metrica.color,
          grupoNombre: metrica.nombre,
          etiquetaValor: formatearMoneda(valorSeleccionado),
        },
        {
          id: `${metrica.id}-anterior`,
          nombre: comparacion.anterior.periodoTexto,
          valor: valorAnterior,
          tope,
          color: metrica.color,
          grupoNombre: metrica.nombre,
          etiquetaValor: formatearMoneda(valorAnterior),
        },
      ];
    });
  });

  private buscarBalanceAnioAnterior(
    seleccionado: BalanceFila,
    balances: readonly BalanceResumenMesDto[],
  ): BalanceFila | null {
    const encontrado = balances.find(
      (balance) => balance.mes === seleccionado.mes && balance.anio === seleccionado.anio - 1,
    );
    return encontrado ? this.aFila(encontrado) : null;
  }

  private tieneBalanceAnioAnterior(balance: BalanceFila): boolean {
    return !!this.buscarBalanceAnioAnterior(balance, [
      ...this.filas(),
      ...this.filasSiguientePagina(),
    ]);
  }

  private cargarSiguientePagina(): void {
    if (this.pagina() >= this.totalPaginas()) return;

    this.api.paginarBalances({ page: this.pagina() + 1, size: 25 }).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (respuesta) => this.filasSiguientePagina.set(respuesta.content.map((item) => this.aFila(item))),
      error: () => this.filasSiguientePagina.set([]),
    });
  }

  private aFila(balance: BalanceResumenMesDto): BalanceFila {
    return { ...balance, periodoTexto: `${String(balance.mes).padStart(2, '0')}-${balance.anio}` };
  }
}
