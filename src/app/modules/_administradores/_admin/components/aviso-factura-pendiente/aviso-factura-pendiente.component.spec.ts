import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FacturasApiService } from '../../../../../core/api/services/facturas-api.service';
import { AuthSessionService } from '../../../../../core/global-services/services/auth-session.service';
import { AvisoFacturaPendienteComponent } from './aviso-factura-pendiente.component';

describe('AvisoFacturaPendienteComponent', () => {
  const paginar = vi.fn();

  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    });
    sessionStorage.clear();
    paginar.mockReset();
    paginar.mockReturnValue(
      of({
        content: [],
        totalElements: 0,
        totalPages: 0,
        size: 1,
        number: 0,
        first: true,
        last: true,
        numberOfElements: 0,
        empty: true,
      }),
    );
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [AvisoFacturaPendienteComponent],
      providers: [
        { provide: FacturasApiService, useValue: { paginar } },
        { provide: AuthSessionService, useValue: { obtenerCompanyUuid: () => 'club-a' } },
      ],
    });
  });

  it('consulta la factura pendiente una sola vez por empresa y sesion', () => {
    TestBed.createComponent(AvisoFacturaPendienteComponent).detectChanges();
    TestBed.createComponent(AvisoFacturaPendienteComponent).detectChanges();

    expect(paginar).toHaveBeenCalledTimes(1);
    expect(paginar).toHaveBeenCalledWith({
      page: 1,
      size: 1,
      estados: ['PENDIENTE'],
      orden: 'FECHA_VENCIMIENTO_ASC',
    });
    expect(sessionStorage.getItem('aviso-factura-pendiente:club-a')).toBe('1');
  });
});
