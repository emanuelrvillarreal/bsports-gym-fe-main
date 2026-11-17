import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { FacturasApiService } from '../../../../../core/api/services/facturas-api.service';
import { GestionFacturasComponent } from './gestion-facturas.component';

describe('GestionFacturasComponent', () => {
  let fixture: ComponentFixture<GestionFacturasComponent>;
  const paginar = vi.fn(() =>
    of({
      content: [],
      totalElements: 0,
      totalPages: 0,
      size: 15,
      number: 0,
      first: true,
      last: true,
      numberOfElements: 0,
      empty: true,
    }),
  );

  beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  beforeEach(async () => {
    paginar.mockClear();
    await TestBed.configureTestingModule({ imports: [GestionFacturasComponent] })
      .overrideProvider(FacturasApiService, { useValue: { paginar } })
      .compileComponents();
    fixture = TestBed.createComponent(GestionFacturasComponent);
    fixture.detectChanges();
  });

  it('consulta la primera página ordenada por vencimiento descendente', () => {
    expect(paginar).toHaveBeenCalledWith({
      page: 1,
      size: 15,
      orden: 'FECHA_VENCIMIENTO_DESC',
    });
  });

  it('mantiene montadas la tabla y la paginación en estado vacío', () => {
    expect(fixture.nativeElement.querySelector('app-tabla-responsive')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-paginacion')).not.toBeNull();
  });
});
