import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PresenciasClubActualizacionService } from '../global-services/services/presencias-club-actualizacion.service';
import { actualizarPresenciasClubInterceptor } from './actualizar-presencias-club.interceptor';

describe('actualizarPresenciasClubInterceptor', () => {
  const solicitarActualizacion = vi.fn();
  let http: HttpClient;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    solicitarActualizacion.mockClear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([actualizarPresenciasClubInterceptor])),
        provideHttpClientTesting(),
        { provide: PresenciasClubActualizacionService, useValue: { solicitarActualizacion } },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  it('solicita refrescar el contador después de registrar un acceso exitosamente', () => {
    http.post('/api/acceso-club', {}).subscribe();
    httpTesting.expectOne('/api/acceso-club').flush({ presente: true });

    expect(solicitarActualizacion).toHaveBeenCalledOnce();
  });

  it('no actualiza el contador al consultar presentes', () => {
    http.get('/api/acceso-club/presentes').subscribe();
    httpTesting.expectOne('/api/acceso-club/presentes').flush({ presentes: [], count: 0 });

    expect(solicitarActualizacion).not.toHaveBeenCalled();
  });
});
