import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { crearApiUrl } from '../../api/api-url';
import { AuthService } from './auth.service';
import { AuthSessionService } from './auth-session.service';

describe('foto de perfil en AuthService', () => {
  let authService: AuthService;
  let sessionService: AuthSessionService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    authService = TestBed.inject(AuthService);
    sessionService = TestBed.inject(AuthSessionService);
    httpTesting = TestBed.inject(HttpTestingController);
    sessionService.guardarUsuario({
      nombre: 'Ana',
      roles: ['ADMIN'],
      userCompanyRoles: [{ companyUuid: 'club-1', roles: [{ name: 'ADMIN' }] }],
    });
    sessionService.guardarCompanyUuidActivo('club-1');
  });

  afterEach(() => httpTesting.verify());

  it('sube el archivo y fusiona la respuesta sin perder el contexto de sesión', () => {
    const archivo = new File(['foto'], 'foto.png', { type: 'image/png' });
    const fotoAntesDeSubir = sessionService.obtenerUrlFotoPerfilActualizada('/media/foto.png');

    authService.subirFotoPerfil(archivo).subscribe();

    const request = httpTesting.expectOne(crearApiUrl('user/photo'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBeInstanceOf(FormData);
    expect((request.request.body as FormData).get('file')).toBe(archivo);
    request.flush({ imageUrl: '/media/foto.png', nombre: 'Ana' });

    expect(sessionService.obtenerUsuario()).toMatchObject({
      imageUrl: '/media/foto.png',
      roles: ['ADMIN'],
      userCompanyRoles: [{ companyUuid: 'club-1', roles: [{ name: 'ADMIN' }] }],
    });
    expect(sessionService.obtenerUrlFotoPerfilActualizada('/media/foto.png')).not.toBe(
      fotoAntesDeSubir,
    );
  });

  it('elimina la foto y acepta una respuesta envuelta en data', () => {
    sessionService.guardarUsuario({
      ...sessionService.obtenerUsuario(),
      imageUrl: '/media/foto.png',
    });

    authService.eliminarFotoPerfil().subscribe();

    const request = httpTesting.expectOne(crearApiUrl('user/photo'));
    expect(request.request.method).toBe('DELETE');
    expect(request.request.body).toBeNull();
    request.flush({ data: { imageUrl: null } });

    expect(sessionService.obtenerUsuario()?.imageUrl).toBeNull();
    expect(sessionService.obtenerUsuario()?.roles).toEqual(['ADMIN']);
  });
});
