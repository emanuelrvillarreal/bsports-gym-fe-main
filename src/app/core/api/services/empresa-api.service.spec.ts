import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import {
  HEADER_COMPANY_UUID,
  OMITIR_COMPANY_UUID,
} from '../../interceptors/context/http-headers-context';
import { OMITIR_AUTH } from '../../interceptors/context/auth-context';
import {
  MOSTRAR_TOAST_ERROR,
  MOSTRAR_TOAST_EXITO,
} from '../../interceptors/context/http-toast-context';
import { API_ROUTES } from '../api-routes';
import { crearApiUrl } from '../api-url';
import { PerfilEmpresaPayload } from '../interfaces/empresa.interfaces';
import { EmpresaApiService } from './empresa-api.service';

const perfilPayload: PerfilEmpresaPayload = {
  nombreComercial: 'Club Atlético Norte',
  razonSocial: 'Club Atlético Norte S.A.',
  cuit: '20000000001',
  domicilio: { direccion: 'Av. Libertador 1200', codigoPostal: '1425', localidad: 'CABA' },
  domicilioFacturacion: {
    direccion: 'Av. Corrientes 500',
    codigoPostal: '1043',
    localidad: 'CABA',
  },
  telefono: '1140001000',
  emailFacturaElectronica: 'facturas@catnorte.com',
  emailInstitucional: 'info@catnorte.com',
  colorPrimario: '#003366',
  colorSecundario: '#FFCC00',
  cuotaSocialHabilitada: true,
  diasVencimientoCuota: 10,
  diasVencimientoMoroso: 10,
  diasInhabilitacion: 15,
};

describe('EmpresaApiService', () => {
  let service: EmpresaApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [EmpresaApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(EmpresaApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('resuelve una empresa pública por path sin autenticación ni contexto de empresa', () => {
    service.obtenerPublicaPorPath('club atlético').subscribe();

    const request = httpTesting.expectOne(
      crearApiUrl(API_ROUTES.empresas.obtenerPublicaPorPath('club atlético')),
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.context.get(OMITIR_AUTH)).toBe(true);
    expect(request.request.context.get(OMITIR_COMPANY_UUID)).toBe(true);
    request.flush({
      uuid: '66d8cf52-68fb-4da1-8e53-83000ce8850c',
      nombreComercial: 'Club Atlético Norte',
      path: 'club-atletico-norte',
    });
  });

  it('pagina empresas globales con el contrato de companies y sin contexto de empresa', () => {
    const payload = { page: 1, size: 10, search: 'club' };
    service.paginarClubes(payload).subscribe();

    const request = httpTesting.expectOne(crearApiUrl(API_ROUTES.empresas.paginarClubes));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    expect(request.request.context.get(OMITIR_COMPANY_UUID)).toBe(true);
    request.flush({ content: [], totalPages: 0 });
  });

  it('obtiene el perfil completo con el contexto de la empresa activa', () => {
    service.obtenerPerfil(' company-uuid ').subscribe();

    const request = httpTesting.expectOne(crearApiUrl(API_ROUTES.empresas.obtenerPerfil));
    expect(request.request.method).toBe('GET');
    expect(request.request.context.get(HEADER_COMPANY_UUID)).toBe('company-uuid');
    expect(request.request.context.get(MOSTRAR_TOAST_ERROR)).toEqual({ titulo: 'Perfil del club' });
    expect(request.request.context.get(MOSTRAR_TOAST_EXITO)).toBeNull();
    request.flush({ ...perfilPayload, uuid: 'company-uuid', logoUrl: 'https://cdn/logo.png' });
  });

  it('actualiza el perfil completo con payload, contexto y toasts del club', () => {
    service.actualizarPerfil('company-uuid', perfilPayload).subscribe();

    const request = httpTesting.expectOne(crearApiUrl(API_ROUTES.empresas.actualizarPerfil));
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(perfilPayload);
    expect(request.request.context.get(HEADER_COMPANY_UUID)).toBe('company-uuid');
    expect(request.request.context.get(MOSTRAR_TOAST_EXITO)).toEqual({
      titulo: 'Perfil del club actualizado',
    });
    expect(request.request.context.get(MOSTRAR_TOAST_ERROR)).toEqual({ titulo: 'Perfil del club' });
    request.flush({ uuid: 'company-uuid' });
  });

  it('sube el logo como multipart con el contexto de la empresa creada', () => {
    const archivo = new File(['logo'], 'logo.png', { type: 'image/png' });
    service.subirLogo('company-uuid', archivo).subscribe();

    const request = httpTesting.expectOne(crearApiUrl(API_ROUTES.empresas.subirLogo));
    expect(request.request.method).toBe('POST');
    expect(request.request.context.get(HEADER_COMPANY_UUID)).toBe('company-uuid');
    expect(request.request.body).toBeInstanceOf(FormData);
    expect((request.request.body as FormData).get('file')).toBe(archivo);
    request.flush({ uuid: 'company-uuid', logoUrl: 'https://cdn/logo.png' });
  });

  it('normaliza una respuesta de logo envuelta en data', () => {
    const archivo = new File(['logo'], 'logo.png', { type: 'image/png' });
    let logoUrl = '';
    service.subirLogo('company-uuid', archivo).subscribe((empresa) => {
      logoUrl = empresa.logoUrl ?? '';
    });

    const request = httpTesting.expectOne(crearApiUrl(API_ROUTES.empresas.subirLogo));
    request.flush({
      data: { uuid: 'company-uuid', logoUrl: 'https://cdn/logo-envuelto.png' },
    });

    expect(logoUrl).toBe('https://cdn/logo-envuelto.png');
  });

  it('elimina el logo con el contexto de la empresa activa', () => {
    service.eliminarLogo('company-uuid').subscribe();

    const request = httpTesting.expectOne(crearApiUrl(API_ROUTES.empresas.eliminarLogo));
    expect(request.request.method).toBe('DELETE');
    expect(request.request.context.get(HEADER_COMPANY_UUID)).toBe('company-uuid');
    request.flush(null);
  });
});
