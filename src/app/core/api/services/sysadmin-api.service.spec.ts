import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { OMITIR_COMPANY_UUID } from '../../interceptors/context/http-headers-context';
import { API_ROUTES } from '../api-routes';
import { crearApiUrl } from '../api-url';
import { SysadminApiService } from './sysadmin-api.service';

describe('SysadminApiService', () => {
  let service: SysadminApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SysadminApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SysadminApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('sincroniza roles sin enviar un companyUuid ni repetir el alta', () => {
    service.sincronizarRoles().subscribe();

    const request = httpTesting.expectOne(crearApiUrl(API_ROUTES.sysadmin.sincronizarRoles));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBeNull();
    request.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('consulta los tres catálogos CRM sin contexto de empresa', () => {
    service.obtenerPlanesCrm().subscribe();
    service.obtenerProvinciasCrm().subscribe();
    service.obtenerCondicionesImpositivasCrm().subscribe();

    for (const ruta of [
      API_ROUTES.sysadmin.obtenerPlanesCrm,
      API_ROUTES.sysadmin.obtenerProvinciasCrm,
      API_ROUTES.sysadmin.obtenerCondicionesImpositivasCrm,
    ]) {
      const request = httpTesting.expectOne(crearApiUrl(ruta));
      expect(request.request.method).toBe('GET');
      expect(request.request.context.get(OMITIR_COMPANY_UUID)).toBe(true);
      request.flush([]);
    }
  });

  it('suscribe una empresa únicamente con el plan CRM y sin contexto activo', () => {
    const payload = { codigoPlan: 'plan-estandar' };
    service.suscribirEmpresaCrm(' club-1 ', payload).subscribe();

    const request = httpTesting.expectOne(
      crearApiUrl(API_ROUTES.sysadmin.suscribirEmpresaCrm('club-1')),
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    expect(request.request.context.get(OMITIR_COMPANY_UUID)).toBe(true);
    request.flush({
      companyUuid: 'club-1',
      codigoPlan: 'plan-estandar',
      nombrePlan: 'Plan Estándar',
      uuidSuscripcionCrm: 'suscripcion-1',
      estado: 'ACTIVA',
      fechaProximaFacturacion: null,
    });
  });

  it('cambia el plan con descuento y da de baja por el UUID de empresa normalizado', () => {
    const cambioPlan = {
      codigoPlan: 'plan-premium',
      descuento: {
        tipoDescuento: 'PORCENTAJE' as const,
        monto: null,
        porcentaje: 10,
        cantPeriodos: 3,
      },
    };
    service.cambiarPlanEmpresaCrm(' club-1 ', cambioPlan).subscribe();
    service.desuscribirEmpresaCrm(' club-1 ').subscribe();

    const cambio = httpTesting.expectOne(
      crearApiUrl(API_ROUTES.sysadmin.cambiarPlanEmpresaCrm('club-1')),
    );
    expect(cambio.request.method).toBe('POST');
    expect(cambio.request.body).toEqual(cambioPlan);
    cambio.flush({
      companyUuid: 'club-1',
      codigoPlan: 'plan-premium',
      nombrePlan: 'Plan Premium',
      uuidSuscripcionCrm: 'suscripcion-2',
      estado: 'ACTIVA',
      fechaProximaFacturacion: '15/10/2026 00:00',
    });

    const baja = httpTesting.expectOne(
      crearApiUrl(API_ROUTES.sysadmin.desuscribirEmpresaCrm('club-1')),
    );
    expect(baja.request.method).toBe('POST');
    expect(baja.request.body).toBeNull();
    baja.flush({
      cuit: '20111111111',
      suscripcionesAnuladas: 1,
      facturasCompensadas: 2,
      montoCompensado: 15000,
      mensaje: 'Suscripciones anuladas y deuda compensada correctamente.',
    });
  });

  it('guarda credenciales por path de empresa sin exponerlas en la URL', () => {
    const payload = { accessToken: 'token-nuevo' };
    service.guardarConfiguracionMercadoPago('club-1', payload).subscribe();

    const request = httpTesting.expectOne(crearApiUrl(API_ROUTES.sysadmin.guardarMercadoPago('club-1')));
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(payload);
    expect(request.request.urlWithParams).not.toContain('token-nuevo');
    expect(request.request.context.get(OMITIR_COMPANY_UUID)).toBe(true);
    request.flush({ habilitado: true, operativo: true, webhookOperativo: true });
  });
});
