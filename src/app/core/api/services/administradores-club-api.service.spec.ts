import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { HEADER_COMPANY_UUID } from '../../interceptors/context/http-headers-context';
import {
  MOSTRAR_TOAST_ERROR,
  MOSTRAR_TOAST_EXITO,
} from '../../interceptors/context/http-toast-context';
import { API_ROUTES } from '../api-routes';
import { crearApiUrl } from '../api-url';
import { AdministradoresClubApiService } from './administradores-club-api.service';

describe('AdministradoresClubApiService', () => {
  let service: AdministradoresClubApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AdministradoresClubApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AdministradoresClubApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('pagina administradores con el contexto del club y el payload exacto', () => {
    const payload = { page: 1, size: 15, search: 'ana' } as const;
    service.paginar(' club-1 ', payload).subscribe();

    const request = httpTesting.expectOne(crearApiUrl(API_ROUTES.administradoresClub.paginar));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    expect(request.request.context.get(HEADER_COMPANY_UUID)).toBe('club-1');
    expect(request.request.context.get(MOSTRAR_TOAST_ERROR)).toEqual({ titulo: 'Administradores' });
    request.flush({ content: [], totalPages: 0 });
  });

  it('crea un administrador con el header del club y feedback de operacion', () => {
    const payload = {
      nombre: 'Ana',
      apellido: 'Perez',
      dni: '30111222',
      email: 'ana@example.com',
      password: 'Cambiar123',
      telefono: '1112345678',
      fechaNacimiento: '1990-01-01',
    } as const;
    service.crear('club-1', payload).subscribe();

    const request = httpTesting.expectOne(crearApiUrl(API_ROUTES.administradoresClub.crear));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    expect(request.request.context.get(HEADER_COMPANY_UUID)).toBe('club-1');
    expect(request.request.context.get(MOSTRAR_TOAST_EXITO)).toEqual({
      titulo: 'Administrador creado',
    });
    request.flush({
      userUuid: 'user-1',
      nombre: 'Ana',
      apellido: 'Perez',
      email: 'ana@example.com',
    });
  });

  it('actualiza el administrador por userUuid con todo el dto editable', () => {
    const payload = {
      nombre: 'Ana Maria',
      apellido: 'Perez',
      dni: '30111223',
      email: 'ana.maria@example.com',
      telefono: '1112345678',
      fechaNacimiento: '1991-02-02',
    } as const;
    service.actualizar('club-1', ' user-1 ', payload).subscribe();

    const request = httpTesting.expectOne(
      crearApiUrl(API_ROUTES.administradoresClub.actualizar('user-1')),
    );
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(payload);
    expect(request.request.context.get(HEADER_COMPANY_UUID)).toBe('club-1');
    expect(request.request.context.get(MOSTRAR_TOAST_EXITO)).toEqual({
      titulo: 'Administrador actualizado',
    });
    request.flush({
      userUuid: 'user-1',
      nombre: 'Ana Maria',
      apellido: 'Perez',
      email: 'ana.maria@example.com',
    });
  });
});
