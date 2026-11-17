import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AuthSessionService } from '../../global-services/services/auth-session.service';
import { HEADER_COMPANY_UUID } from '../../interceptors/context/http-headers-context';
import { MOSTRAR_TOAST_ERROR, MOSTRAR_TOAST_EXITO } from '../../interceptors/context/http-toast-context';
import { API_ROUTES } from '../api-routes';
import { crearApiUrl } from '../api-url';
import { GuardarCuotaSocialRangoCommand } from '../interfaces/cuotas-sociales-rango.interfaces';
import { CuotaSocialRangoApiService } from './cuota-social-rango-api.service';

const comando: GuardarCuotaSocialRangoCommand = {
  nombre: 'Adultos',
  descripcion: 'Hasta 64 años',
  edadHasta: 64,
  importe: 15000,
};

describe('CuotaSocialRangoApiService', () => {
  let service: CuotaSocialRangoApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CuotaSocialRangoApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AuthSessionService,
          useValue: { obtenerCompanyUuid: () => ' company-uuid ' },
        },
      ],
    });
    service = TestBed.inject(CuotaSocialRangoApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('pagina rangos con contexto de empresa y contrato del backend', () => {
    const payload = { page: 1, size: 20, search: '' };
    service.paginar(payload).subscribe();

    const request = httpTesting.expectOne(crearApiUrl(API_ROUTES.cuotasSocialesRango.paginar));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    expect(request.request.context.get(HEADER_COMPANY_UUID)).toBe(' company-uuid ');
    expect(request.request.context.get(MOSTRAR_TOAST_ERROR)).toEqual({ titulo: 'Cuota social' });
    request.flush({ content: [], totalPages: 0 });
  });

  it('crea un rango con feedback de éxito', () => {
    service.crear(comando).subscribe();

    const request = httpTesting.expectOne(crearApiUrl(API_ROUTES.cuotasSocialesRango.crear));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(comando);
    expect(request.request.context.get(MOSTRAR_TOAST_EXITO)).toEqual({
      titulo: 'Categoría de cuota social creada',
    });
    request.flush({ cuotaSocialRangoUuid: 'rango-1', ...comando, esDefault: false });
  });

  it('actualiza y elimina por UUID', () => {
    service.actualizar('rango-1', comando).subscribe();
    const actualizacion = httpTesting.expectOne(
      crearApiUrl(API_ROUTES.cuotasSocialesRango.actualizar('rango-1')),
    );
    expect(actualizacion.request.method).toBe('PUT');
    expect(actualizacion.request.body).toEqual(comando);
    actualizacion.flush({ cuotaSocialRangoUuid: 'rango-1', ...comando, esDefault: false });

    service.eliminar('rango-1').subscribe();
    const eliminacion = httpTesting.expectOne(
      crearApiUrl(API_ROUTES.cuotasSocialesRango.eliminar('rango-1')),
    );
    expect(eliminacion.request.method).toBe('DELETE');
    eliminacion.flush(null);
  });
});
