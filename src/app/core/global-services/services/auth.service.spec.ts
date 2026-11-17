import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { crearApiUrl } from '../../api/api-url';
import { API_ROUTES } from '../../api/api-routes';
import { OMITIR_AUTH } from '../../interceptors/context/auth-context';
import { OMITIR_COMPANY_UUID } from '../../interceptors/context/http-headers-context';
import { AuthSessionService } from './auth-session.service';
import { AuthService } from './auth.service';

describe('AuthService - refresh de sesion', () => {
  const guardarTokens = vi.fn();
  const limpiarSesion = vi.fn();
  const guardarUsuario = vi.fn();
  let authService: AuthService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    vi.useFakeTimers();
    guardarTokens.mockClear();
    limpiarSesion.mockClear();
    guardarUsuario.mockClear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AuthSessionService,
          useValue: {
            obtenerRefreshToken: () => 'refresh-token',
            obtenerCompanyUuid: () => '',
            guardarTokens,
            guardarUsuario,
            limpiarSesion,
          },
        },
        {
          provide: Router,
          useValue: { navigateByUrl: vi.fn() },
        },
      ],
    });

    authService = TestBed.inject(AuthService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    vi.useRealTimers();
  });

  it('reintenta un 401 de refresh y conserva la sesion si luego responde correctamente', async () => {
    const resultado = vi.fn();
    authService.refrescarAccessToken().subscribe({ next: resultado });

    const primerIntento = esperarRefresh();
    expect(primerIntento.request.body).toEqual({ refresh: 'refresh-token' });
    primerIntento.flush(null, { status: 401, statusText: 'Unauthorized' });

    await vi.advanceTimersByTimeAsync(500);
    esperarRefresh().flush({ token: 'access-token-nuevo', refresh: 'refresh-token-nuevo' });

    expect(resultado).toHaveBeenCalledWith('access-token-nuevo');
    expect(guardarTokens).toHaveBeenCalledWith({
      accessToken: 'access-token-nuevo',
      refreshToken: 'refresh-token-nuevo',
    });
    expect(limpiarSesion).not.toHaveBeenCalled();
  });

  it.each([0, 408, 429, 500])('reintenta un error transitorio %i dos veces antes de cerrar sesion', async (status) => {
    const error = vi.fn();
    authService.refrescarAccessToken().subscribe({ error });

    responderErrorRefresh(status);
    await vi.advanceTimersByTimeAsync(500);
    responderErrorRefresh(status);
    await vi.advanceTimersByTimeAsync(1500);
    responderErrorRefresh(status);

    expect(error).toHaveBeenCalledTimes(1);
    expect(limpiarSesion).toHaveBeenCalledTimes(1);
  });

  it('no reintenta un 400 porque la misma request no puede recuperarlo', () => {
    const error = vi.fn();
    authService.refrescarAccessToken().subscribe({ error });

    responderErrorRefresh(400);

    expect(error).toHaveBeenCalledTimes(1);
    expect(limpiarSesion).toHaveBeenCalledTimes(1);
    httpTesting.expectNone(crearApiUrl(API_ROUTES.auth.refresh));
  });

  it('cierra sesion si el backend responde un refresh sin access token', () => {
    const error = vi.fn();
    authService.refrescarAccessToken().subscribe({ error });

    esperarRefresh().flush({ refresh: 'refresh-token-nuevo' });

    expect(error).toHaveBeenCalledWith(expect.any(Error));
    expect(limpiarSesion).toHaveBeenCalledTimes(1);
  });

  it('comparte una unica request de refresh entre consumidores concurrentes', () => {
    const primerResultado = vi.fn();
    const segundoResultado = vi.fn();

    authService.refrescarAccessToken().subscribe({ next: primerResultado });
    authService.refrescarAccessToken().subscribe({ next: segundoResultado });

    esperarRefresh().flush({ token: 'access-token-nuevo', refresh: 'refresh-token-nuevo' });

    expect(primerResultado).toHaveBeenCalledWith('access-token-nuevo');
    expect(segundoResultado).toHaveBeenCalledWith('access-token-nuevo');
    expect(guardarTokens).toHaveBeenCalledTimes(1);
  });

  it('solicita el enlace de acceso sin headers de sesión y normaliza email/path', () => {
    const resultado = vi.fn();
    authService
      .solicitarLoginSinContrasena({ email: ' Socio@Club.com ', path: ' club-norte ' })
      .subscribe(resultado);

    const request = httpTesting.expectOne(crearApiUrl(API_ROUTES.auth.startLogin));
    expect(request.request.body).toEqual({ email: 'socio@club.com', path: 'club-norte' });
    expect(request.request.context.get(OMITIR_AUTH)).toBe(true);
    expect(request.request.context.get(OMITIR_COMPANY_UUID)).toBe(true);
    request.flush({ message: 'Mail enviado correctamente' });

    expect(resultado).toHaveBeenCalledWith(undefined);
  });

  it('canjea el enlace, guarda tokens y carga el usuario para crear la sesión', () => {
    const resultado = vi.fn();
    authService.canjearLoginSinContrasena(' codigo-secreto ').subscribe(resultado);

    const requestCanje = httpTesting.expectOne(crearApiUrl(API_ROUTES.auth.finishLogin));
    expect(requestCanje.request.body).toEqual({ code: 'codigo-secreto' });
    expect(requestCanje.request.context.get(OMITIR_AUTH)).toBe(true);
    expect(requestCanje.request.context.get(OMITIR_COMPANY_UUID)).toBe(true);
    requestCanje.flush({ token: 'access', refresh: 'refresh' });

    const requestUsuario = httpTesting.expectOne(crearApiUrl(API_ROUTES.auth.sessionActual));
    requestUsuario.flush({ email: 'socio@club.com' });

    expect(guardarTokens).toHaveBeenCalledWith({ accessToken: 'access', refreshToken: 'refresh' });
    expect(guardarUsuario).toHaveBeenCalledWith(expect.objectContaining({ email: 'socio@club.com' }));
    expect(resultado).toHaveBeenCalledWith({ accessToken: 'access', refreshToken: 'refresh' });
  });

  function esperarRefresh() {
    return httpTesting.expectOne(crearApiUrl(API_ROUTES.auth.refresh));
  }

  function responderErrorRefresh(status: number): void {
    const request = esperarRefresh();
    if (status === 0) {
      request.error(new ProgressEvent('error'));
      return;
    }

    request.flush(null, { status, statusText: 'Error de refresh' });
  }
});
