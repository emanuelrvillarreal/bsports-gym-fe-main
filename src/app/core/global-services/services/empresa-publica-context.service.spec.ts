import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_ROUTES } from '../../api/api-routes';
import { crearApiUrl } from '../../api/api-url';
import { EmpresaPublicaContextService } from './empresa-publica-context.service';

const empresaPublica = {
  uuid: '66d8cf52-68fb-4da1-8e53-83000ce8850c',
  nombreComercial: 'Club Atlético Norte',
  logoUrl: 'https://cdn.example/escudo.png',
  colorPrimario: '#112233',
  colorSecundario: '#445566',
  path: 'club-atletico-norte',
};

describe('EmpresaPublicaContextService', () => {
  let service: EmpresaPublicaContextService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(EmpresaPublicaContextService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('carga y expone el branding público del club en memoria', () => {
    service.cargarPorPath(' club-atletico-norte ').subscribe();

    const request = httpTesting.expectOne(
      crearApiUrl(API_ROUTES.empresas.obtenerPublicaPorPath('club-atletico-norte')),
    );
    expect(request.request.method).toBe('GET');
    request.flush({ ...empresaPublica, path: undefined });

    expect(service.uuid()).toBe(empresaPublica.uuid);
    expect(service.nombreComercial()).toBe(empresaPublica.nombreComercial);
    expect(service.logoUrl()).toBe(empresaPublica.logoUrl);
    expect(service.colorPrimario()).toBe(empresaPublica.colorPrimario);
    expect(service.colorSecundario()).toBe(empresaPublica.colorSecundario);
    expect(service.path()).toBe('club-atletico-norte');
  });

  it('no conserva branding si la respuesta no tiene UUID válido', () => {
    let error: unknown;
    service.cargarPorPath('club-atletico-norte').subscribe({ error: (value) => error = value });

    httpTesting.expectOne(crearApiUrl(API_ROUTES.empresas.obtenerPublicaPorPath('club-atletico-norte')))
      .flush({ ...empresaPublica, uuid: 'uuid-invalido' });

    expect(error).toBeInstanceOf(Error);
    expect(service.empresa()).toBeNull();
  });

  it('limpia el contexto público sin persistirlo', () => {
    service.cargarPorPath('club-atletico-norte').subscribe();
    httpTesting.expectOne(crearApiUrl(API_ROUTES.empresas.obtenerPublicaPorPath('club-atletico-norte')))
      .flush(empresaPublica);

    service.limpiar();

    expect(service.empresa()).toBeNull();
    expect(service.uuid()).toBe('');
    expect(service.logoUrl()).toBe('');
  });
});
