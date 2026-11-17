import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EventosAccesoApiService } from '../../../../core/api/services/eventos-acceso-api.service';
import {
  HistorialEventoAccesoComponent,
  formatearFechaHistorial,
} from './historial-evento-acceso.component';

describe('HistorialEventoAccesoComponent', () => {
  const paginarHistorial = vi.fn();

  beforeEach(() => {
    paginarHistorial.mockReset();
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
    TestBed.configureTestingModule({
      imports: [HistorialEventoAccesoComponent],
      providers: [{ provide: EventosAccesoApiService, useValue: { paginarHistorial } }],
    });
  });

  function crearComponente() {
    const fixture = TestBed.createComponent(HistorialEventoAccesoComponent);
    fixture.componentRef.setInput('evento', {
      uuid: 'evento-1',
      titulo: 'Cena',
      descripcion: 'Entrada',
      monto: 2500,
      permiteMorosos: true,
      permiteInvitados: true,
      montoMorosos: 3000,
      montoInvitados: 4000,
    });
    fixture.componentRef.setInput('abierto', true);
    return fixture;
  }

  it('carga y pagina el historial del evento', () => {
    paginarHistorial.mockReturnValue(
      of({
        content: [],
        totalElements: 0,
        totalPages: 0,
        size: 10,
        number: 0,
        first: true,
        last: true,
        numberOfElements: 0,
        empty: true,
      }),
    );
    const fixture = crearComponente();
    fixture.detectChanges();

    expect(paginarHistorial).toHaveBeenCalledWith(
      'evento-1',
      { page: 1, size: 10, search: '' },
      { mostrarToastError: false },
    );
  });

  it('conserva un estado vacío y muestra error si falla la consulta', () => {
    paginarHistorial.mockReturnValue(throwError(() => new Error('falló')));
    const fixture = crearComponente();
    fixture.detectChanges();
    const componente = fixture.componentInstance as any;

    expect(componente.filas()).toEqual([]);
    expect(componente.error()).toBe('No se pudo cargar el historial del evento.');
  });
});

describe('formatearFechaHistorial', () => {
  it('acepta arrays Jackson y timestamps', () => {
    expect(formatearFechaHistorial([2026, 8, 24, 15, 30])).not.toBe('Fecha no disponible');
    expect(formatearFechaHistorial(1_777_222_800)).not.toBe('Fecha no disponible');
  });

  it('no rompe ante formatos desconocidos', () => {
    expect(formatearFechaHistorial('fecha-rara')).toBe('Fecha no disponible');
  });
});
