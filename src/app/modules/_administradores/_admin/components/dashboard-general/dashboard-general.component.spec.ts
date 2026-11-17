import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DashboardGeneralDto } from '../../../../../core/api/interfaces/dashboard-general.interfaces';
import { DashboardGeneralComponent } from './dashboard-general.component';

const DATOS: DashboardGeneralDto = {
  sociosActivos: 120,
  sociosNuevosMes: 5,
  sociosBajasMes: 2,
  sociosMorosos: 7,
  sociosPorCategoria: [{ clave: '1', nombre: 'Mayores', valor: 80, extra: 0 }],
  actividades: 6,
  inscriptos: 90,
  profesoresActivos: 4,
  demandaActividades: [
    { clave: 'a', nombre: 'Fútbol', valor: 30, extra: 40 },
    { clave: 'b', nombre: 'Yoga', valor: 3, extra: 20 },
  ],
  asistenciaPromedio: 72.5,
  bajaAsistencia: 3,
  dejaronDeAsistir: 1,
  equiposActivos: 2,
  jugadoresEnPlanteles: 25,
  torneosEnCurso: 1,
  participacionPorDisciplina: [],
  ingresosMes: 1000,
  egresosMes: 1500,
  balanceMes: -500,
  ingresosAnio: 10000,
  egresosAnio: 8000,
  deudaVencida: 2500,
  mantenimientosVencidos: 1,
  evaluacionesVencidas: 0,
  evolucion: [
    { periodo: '2026-10', altas: 3, bajas: 1, inscripciones: 4, ingresos: 900, egresos: 400, asistencia: 70 },
    { periodo: '2026-11', altas: 5, bajas: 0, inscripciones: 2, ingresos: 1000, egresos: 1500, asistencia: null },
  ],
};

describe('DashboardGeneralComponent', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
    });
    TestBed.configureTestingModule({
      imports: [DashboardGeneralComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function crear() {
    const fixture = TestBed.createComponent(DashboardGeneralComponent);
    fixture.detectChanges();
    await Promise.resolve();
    http.expectOne((r) => r.url.endsWith('dashboard/general')).flush(DATOS);
    fixture.detectChanges();
    return fixture;
  }

  it('muestra los indicadores con enlace a cada detalle', async () => {
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Socios activos');
    expect(el.textContent).toContain('120');
    const enlaces = Array.from(el.querySelectorAll('a.panorama__kpi')).map((a) => a.getAttribute('href'));
    expect(enlaces).toEqual([
      '/admin/socios/listado',
      '/admin/actividades/listado',
      '/admin/actividades/asistencia',
      '/admin/tesoreria/reportes',
      '/admin/competencias',
    ]);
  });

  it('marca el balance negativo y cuenta las alertas', async () => {
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.panorama__kpi--negativo')).not.toBeNull();
    // 3 baja asistencia + 1 mantenimiento + deuda vencida.
    expect(el.querySelector('.panorama__kpi--alertas strong')?.textContent?.trim()).toBe('5');
    expect(el.querySelector('.panorama__kpi--negativo strong')?.textContent).toMatch(/^-\$/);
  });

  it('cambia de sección y muestra la de menor demanda', async () => {
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;
    const pestanas = el.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    pestanas[1].click();
    fixture.detectChanges();
    expect(el.textContent).toContain('Menor demanda: Yoga');
    expect(pestanas[1].getAttribute('aria-selected')).toBe('true');
  });

  it('ofrece reintentar si falla la carga', async () => {
    const fixture = TestBed.createComponent(DashboardGeneralComponent);
    fixture.detectChanges();
    await Promise.resolve();
    http.expectOne((r) => r.url.endsWith('dashboard/general')).flush(null, { status: 500, statusText: 'Error' });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')?.textContent).toContain('Reintentar');
  });
});
