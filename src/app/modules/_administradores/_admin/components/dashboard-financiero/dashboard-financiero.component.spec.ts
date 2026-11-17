import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  BalanceActualDto,
  BalancePaginateResponse,
  CuotaPaginateResponse,
  MovimientoPaginateResponse,
} from '../../../../../core/api/interfaces/tesoreria.interfaces';
import { TesoreriaApiService } from '../../../../../core/api/services/tesoreria-api.service';
import { DashboardFinancieroComponent } from './dashboard-financiero.component';

const balanceActual: BalanceActualDto = {
  anio: 2026,
  mes: 7,
  ingresosTotales: 100000,
  egresosTotales: 25000,
  porCobrar: 18000,
  ingresosNetos: 75000,
  ingresosEstimados: 118000,
};

const balanceAnterior: BalanceActualDto = {
  ...balanceActual,
  anio: 2025,
  ingresosTotales: 80000,
  egresosTotales: 20000,
  ingresosNetos: 60000,
};

const paginaBalances: BalancePaginateResponse = {
  content: [balanceAnterior],
  totalElements: 1,
  totalPages: 1,
  size: 100,
  number: 1,
  first: true,
  last: true,
  numberOfElements: 1,
  empty: false,
};

const paginaMovimientos: MovimientoPaginateResponse = {
  content: [],
  totalElements: 0,
  totalPages: 1,
  size: 5,
  number: 1,
  first: true,
  last: true,
  numberOfElements: 0,
  empty: true,
};

const paginaCuotas: CuotaPaginateResponse = {
  content: [],
  totalElements: 3,
  totalPages: 1,
  size: 1,
  number: 1,
  first: true,
  last: true,
  numberOfElements: 0,
  empty: true,
};

describe('DashboardFinancieroComponent', () => {
  const tesoreriaApi = {
    obtenerBalanceActual: vi.fn(),
    paginarBalances: vi.fn(),
    paginarMovimientos: vi.fn(),
    paginarCuotas: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    tesoreriaApi.obtenerBalanceActual.mockReturnValue(of(balanceActual));
    tesoreriaApi.paginarBalances.mockReturnValue(of(paginaBalances));
    tesoreriaApi.paginarMovimientos.mockReturnValue(of(paginaMovimientos));
    tesoreriaApi.paginarCuotas.mockReturnValue(of(paginaCuotas));

    await TestBed.configureTestingModule({
      imports: [DashboardFinancieroComponent],
      providers: [{ provide: TesoreriaApiService, useValue: tesoreriaApi }],
    }).compileComponents();
  });

  it('muestra KPIs, pendientes totales y comparativa del mismo mes del año anterior', () => {
    const fixture = TestBed.createComponent(DashboardFinancieroComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.periodosDisponibles()).toEqual([
      { anio: 2026, mes: 7 },
      { anio: 2025, mes: 7 },
    ]);
    expect(fixture.componentInstance.tieneComparacion()).toBe(true);
    expect(
      fixture.componentInstance.cards().find((card) => card.id === 'pendiente-cobro')?.subtitulo,
    ).toBe('3 cuota(s) pendientes totales');
    expect(fixture.componentInstance.barrasComparacion()).toHaveLength(6);
  });

  it('consulta movimientos del período seleccionado', () => {
    const fixture = TestBed.createComponent(DashboardFinancieroComponent);
    fixture.detectChanges();

    fixture.componentInstance.seleccionarPeriodo({ anio: 2025, mes: 7 });

    expect(tesoreriaApi.paginarMovimientos).toHaveBeenLastCalledWith({
      page: 1,
      size: 5,
      fechaDesde: '2025-07-01',
      fechaHasta: '2025-07-31',
      estados: ['ACTIVO'],
    });
  });

  it('permite seleccionar un periodo sin balance y consulta sus movimientos', () => {
    const fixture = TestBed.createComponent(DashboardFinancieroComponent);
    fixture.detectChanges();

    fixture.componentInstance.seleccionarPeriodo({ anio: 2026, mes: 1 });

    expect(fixture.componentInstance.periodoSeleccionado()).toEqual({ anio: 2026, mes: 1 });
    expect(fixture.componentInstance.balanceSeleccionado()).toBeNull();
    expect(tesoreriaApi.paginarMovimientos).toHaveBeenLastCalledWith({
      page: 1,
      size: 5,
      fechaDesde: '2026-01-01',
      fechaHasta: '2026-01-31',
      estados: ['ACTIVO'],
    });
  });
});
