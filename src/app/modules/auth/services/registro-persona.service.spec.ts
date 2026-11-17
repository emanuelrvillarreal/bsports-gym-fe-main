import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_ROUTES } from '../../../core/api/api-routes';
import { crearApiUrl } from '../../../core/api/api-url';
import { OMITIR_AUTH } from '../../../core/interceptors/context/auth-context';
import { HEADER_COMPANY_UUID } from '../../../core/interceptors/context/http-headers-context';
import { RegistroPersonaService } from './registro-persona.service';

describe('RegistroPersonaService', () => {
  let service: RegistroPersonaService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RegistroPersonaService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(RegistroPersonaService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('envia el registro de usuario nuevo sin wrapper y con contexto publico', () => {
    service
      .registrarPersona('11111111-1111-1111-1111-111111111111', {
        nombre: ' Ana ',
        apellido: ' Perez ',
        email: ' ANA@EJEMPLO.COM ',
        password: 'Club2026',
      })
      .subscribe();

    const request = httpTesting.expectOne(crearApiUrl(API_ROUTES.socios.registrarTitularPublico));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      nombre: 'Ana',
      apellido: 'Perez',
      email: 'ana@ejemplo.com',
      password: 'Club2026',
    });
    expect(request.request.context.get(OMITIR_AUTH)).toBe(true);
    expect(request.request.context.get(HEADER_COMPANY_UUID)).toBe(
      '11111111-1111-1111-1111-111111111111',
    );
    request.flush({ memberUuid: 'member-uuid', status: -2 });
  });

  it('omite password para una cuenta existente', () => {
    service
      .registrarPersona('11111111-1111-1111-1111-111111111111', {
        nombre: 'Ana',
        apellido: 'Perez',
        email: 'ana@ejemplo.com',
      })
      .subscribe();

    const request = httpTesting.expectOne(crearApiUrl(API_ROUTES.socios.registrarTitularPublico));
    expect(request.request.body).toEqual({
      nombre: 'Ana',
      apellido: 'Perez',
      email: 'ana@ejemplo.com',
    });
    request.flush({ memberUuid: 'member-uuid', status: -2 });
  });
});
