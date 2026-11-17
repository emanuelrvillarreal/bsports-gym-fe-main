import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AuthSessionService } from '../../global-services/services/auth-session.service';
import {
  HEADER_COMPANY_UUID,
  OMITIR_COMPANY_UUID,
} from '../../interceptors/context/http-headers-context';
import { MOSTRAR_TOAST_EXITO } from '../../interceptors/context/http-toast-context';
import { API_ROUTES } from '../api-routes';
import { crearApiUrl } from '../api-url';
import { FacturasApiService } from './facturas-api.service';

describe('FacturasApiService', () => {
  let service: FacturasApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        FacturasApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthSessionService, useValue: { obtenerCompanyUuid: () => 'club-activo' } },
      ],
    });
    service = TestBed.inject(FacturasApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('pagina facturas ADMIN con el payload plano y la contexto de empresa activa', () => {
    const payload = {
      page: 1,
      size: 10,
      estados: ['VENCIDA'] as const,
      orden: 'FECHA_VENCIMIENTO_DESC' as const,
    };
    service.paginar(payload).subscribe();

    const request = httpTesting.expectOne(crearApiUrl(API_ROUTES.facturas.paginar));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    expect(request.request.context.get(HEADER_COMPANY_UUID)).toBe('club-activo');
    request.flush({ content: [], totalElements: 0, totalPages: 0 });
  });

  it('pagina facturas SYSADMIN por companyUuid en el body y omite el header activo', () => {
    const payload = { page: 1, size: 1, companyUuid: 'club-consultado' };
    service.paginar(payload).subscribe();

    const request = httpTesting.expectOne(crearApiUrl(API_ROUTES.facturas.paginar));
    expect(request.request.body).toEqual(payload);
    expect(request.request.context.get(OMITIR_COMPANY_UUID)).toBe(true);
    request.flush({ content: [], totalElements: 0, totalPages: 0 });
  });

  it('genera el pago con UUID local y contexto de la empresa activa', () => {
    const payload = {
      facturasUuid: ['factura-local-1'],
      referencia: 'factura-factura-local-1-1788790000000',
      fechaPago: '2026-09-08',
    };
    service.generarPago(payload).subscribe();

    const request = httpTesting.expectOne(crearApiUrl(API_ROUTES.facturas.generarPago));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    expect(request.request.context.get(HEADER_COMPANY_UUID)).toBe('club-activo');
    expect(request.request.context.get(MOSTRAR_TOAST_EXITO)).toBeNull();
    request.flush({ id: 'preferencia-1', init_point: 'https://mercadopago.example/checkout' });
  });
});
