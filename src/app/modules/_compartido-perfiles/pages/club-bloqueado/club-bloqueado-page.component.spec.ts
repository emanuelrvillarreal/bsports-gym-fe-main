import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FacturasApiService } from '../../../../core/api/services/facturas-api.service';
import { AuthService } from '../../../../core/global-services/services/auth.service';
import { ClubBloqueadoPageComponent } from './club-bloqueado-page.component';

describe('ClubBloqueadoPageComponent', () => {
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
  });

  it('permite al ADMIN consultar la factura vencida mas proxima', async () => {
    const fixture = crearPagina('ADMIN');
    await fixture.whenStable();

    expect(paginar).toHaveBeenCalledWith({
      page: 1,
      size: 1,
      estados: ['VENCIDA'],
      orden: 'FECHA_VENCIMIENTO_ASC',
    });
  });

  it('no consulta facturas para otros roles y les indica contactar a un administrador', () => {
    const fixture = crearPagina('ADM_RECEPCION');
    fixture.detectChanges();

    expect(paginar).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Contactá a un administrador');
  });

  function crearPagina(rol: 'ADMIN' | 'ADM_RECEPCION') {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ClubBloqueadoPageComponent],
      providers: [
        { provide: FacturasApiService, useValue: { paginar } },
        {
          provide: AuthService,
          useValue: {
            obtenerRolUsuario: () => rol,
            refrescarEstadoSesion: () => of({}),
            empresaActivaBloqueada: () => true,
            obtenerRutaPrincipalUsuario: () => '/admin/dashboard',
            logout: () => of(void 0),
          },
        },
        { provide: Router, useValue: { navigateByUrl: vi.fn() } },
      ],
    });
    return TestBed.createComponent(ClubBloqueadoPageComponent);
  }
});
