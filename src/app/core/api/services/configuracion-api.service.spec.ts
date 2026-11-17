import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { AuthSessionService } from '../../global-services/services/auth-session.service';
import { HEADER_COMPANY_UUID } from '../../interceptors/context/http-headers-context';
import { API_ROUTES } from '../api-routes';
import { crearApiUrl } from '../api-url';
import { ConfiguracionApiService } from './configuracion-api.service';

describe('ConfiguracionApiService', () => {
  let servicio: ConfiguracionApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ConfiguracionApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AuthSessionService,
          useValue: { obtenerCompanyUuid: () => 'company-uuid' },
        },
      ],
    });
    servicio = TestBed.inject(ConfiguracionApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('obtiene una configuracion directa con el contexto de empresa', () => {
    const configuracion = {
      uuid: 'config-uuid',
      name: 'branding.colors',
      value: '{"primario":"#4982fd"}',
      global: true,
    } as const;
    let resultado: unknown;

    servicio.obtenerPorClave('branding.colors').subscribe((valor) => (resultado = valor));

    const request = httpTesting.expectOne(
      (req) =>
        req.url === crearApiUrl(API_ROUTES.configuraciones.obtenerPorClave('branding.colors')) &&
        req.params.get('companyUuid') === 'company-uuid',
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.context.get(HEADER_COMPANY_UUID)).toBe('company-uuid');
    request.flush(configuracion);

    expect(resultado).toEqual(configuracion);
  });

  it('acepta una configuracion envuelta en data', () => {
    const configuracion = {
      name: 'branding.colors',
      value: '{"primario":"#4982fd"}',
      global: true,
    } as const;
    let resultado: unknown;

    servicio.obtenerPorClave('branding.colors').subscribe((valor) => (resultado = valor));
    const request = httpTesting.expectOne(
      crearApiUrl(API_ROUTES.configuraciones.obtenerPorClave('branding.colors')),
    );
    request.flush({ data: configuracion });

    expect(resultado).toEqual(configuracion);
  });

  it('permite consultar una configuracion con una empresa explicita', () => {
    let resultado: unknown;

    servicio
      .obtenerPorClave('branding.colors', 'club-preview')
      .subscribe((valor) => (resultado = valor));

    const request = httpTesting.expectOne(
      (req) =>
        req.url === crearApiUrl(API_ROUTES.configuraciones.obtenerPorClave('branding.colors')) &&
        req.params.get('companyUuid') === 'club-preview',
    );
    expect(request.request.context.get(HEADER_COMPANY_UUID)).toBe('club-preview');
    request.flush(null);

    expect(resultado).toBeNull();
  });

  it('devuelve null ante una respuesta vacia o incompatible', () => {
    let resultado: unknown = 'sin-resolver';

    servicio.obtenerPorClave('branding.colors').subscribe((valor) => (resultado = valor));
    const request = httpTesting.expectOne(
      crearApiUrl(API_ROUTES.configuraciones.obtenerPorClave('branding.colors')),
    );
    request.flush({ data: null });

    expect(resultado).toBeNull();
  });

  it('guarda la lista con el contexto de empresa y el payload exacto', () => {
    const payload = [
      {
        name: 'branding.colors',
        value: '{"primario":"#4982fd","secundario":"#2563eb","terciario":"#06b6d4"}',
        global: true,
      },
    ] as const;

    servicio.guardar(payload).subscribe();

    const request = httpTesting.expectOne(
      (req) =>
        req.url === crearApiUrl(API_ROUTES.configuraciones.guardar) &&
        req.params.get('companyUuid') === 'company-uuid',
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    expect(request.request.context.get(HEADER_COMPANY_UUID)).toBe('company-uuid');
    request.flush({});
  });
});
