import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastAlertService } from '../../modules/ui/toast-alert/services/toast-alert.service';
import { AuthService } from '../global-services/services/auth.service';
import { AuthSessionService } from '../global-services/services/auth-session.service';
import { authInterceptor } from './auth.interceptor';
import { MOSTRAR_TOAST_ERROR } from './context/http-toast-context';

describe('authInterceptor - toast de error', () => {
  const mostrarError = vi.fn();
  const marcarEmpresaBloqueada = vi.fn();
  const navegar = vi.fn();
  let http: HttpClient;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    mostrarError.mockClear();
    marcarEmpresaBloqueada.mockClear();
    navegar.mockClear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: {
            obtenerAccessToken: () => 'access-token',
            marcarEmpresaActivaBloqueada: marcarEmpresaBloqueada,
          },
        },
        {
          provide: AuthSessionService,
          useValue: { obtenerCompanyUuid: () => 'company-1' },
        },
        {
          provide: Router,
          useValue: { url: '/admin/socios', navigateByUrl: navegar },
        },
        {
          provide: ToastAlertService,
          useValue: { error: mostrarError, success: vi.fn() },
        },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  it('activa el fondo danger solamente cuando el contexto lo solicita y la respuesta es 4xx', () => {
    const contexto = new HttpContext().set(MOSTRAR_TOAST_ERROR, {
      titulo: 'Socios',
      fondoPeligro4xx: true,
    });

    http.post('/member/titular', {}, { context: contexto }).subscribe({ error: () => void 0 });
    httpTesting.expectOne('/member/titular').flush(
      { message: 'El DNI ya esta registrado.' },
      { status: 409, statusText: 'Conflict' },
    );

    expect(mostrarError).toHaveBeenCalledWith(
      'El DNI ya esta registrado.',
      expect.objectContaining({ titulo: 'Socios', fondoPeligro: true }),
    );
  });

  it('muestra los errores de fields en un unico toast y conserva las opciones 4xx', () => {
    const contexto = new HttpContext().set(MOSTRAR_TOAST_ERROR, {
      titulo: 'Registro de club',
      fondoPeligro4xx: true,
    });

    http.post('/sysadmin/clubs', {}, { context: contexto }).subscribe({ error: () => void 0 });
    httpTesting.expectOne('/sysadmin/clubs').flush(
      {
        userMessage: 'Error en el formulario',
        developerMessage: 'No debe exponerse.',
        fields: [
          { nombreCampo: 'cuit', message: 'no debe estar vacio' },
          { nombreCampo: 'emailInstitucional', message: 'debe tener formato valido' },
        ],
      },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(mostrarError).toHaveBeenCalledWith(
      'cuit: no debe estar vacio \u00b7 emailInstitucional: debe tener formato valido',
      expect.objectContaining({ titulo: 'Registro de club', fondoPeligro: true }),
    );
  });

  it('redirige el 403 de facturacion sin mostrar el toast generico', () => {
    const contexto = new HttpContext().set(MOSTRAR_TOAST_ERROR, { titulo: 'Socios' });

    http.get('/member/paginate', { context: contexto }).subscribe({ error: () => void 0 });
    httpTesting.expectOne('/member/paginate').flush(
      { errores: [{ name: 'motivo', value: 'FACTURA_VENCIDA' }] },
      { status: 403, statusText: 'Forbidden' },
    );

    expect(marcarEmpresaBloqueada).toHaveBeenCalledWith(true);
    expect(navegar).toHaveBeenCalledWith('/club-bloqueado');
    expect(mostrarError).not.toHaveBeenCalled();
  });
});

describe('authInterceptor - 401 luego de refresh', () => {
  const cerrarSesion = vi.fn(() => of(void 0));
  const refrescarAccessToken = vi.fn(() => of('access-token-nuevo'));
  let http: HttpClient;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    cerrarSesion.mockClear();
    refrescarAccessToken.mockClear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: {
            obtenerAccessToken: () => 'access-token-anterior',
            refrescarAccessToken,
            logout: cerrarSesion,
            marcarEmpresaActivaBloqueada: vi.fn(),
          },
        },
        {
          provide: AuthSessionService,
          useValue: { obtenerCompanyUuid: () => 'company-1' },
        },
        {
          provide: Router,
          useValue: { url: '/admin/socios', navigateByUrl: vi.fn() },
        },
        {
          provide: ToastAlertService,
          useValue: { error: vi.fn(), success: vi.fn() },
        },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  it('cierra la sesion si la request original sigue respondiendo 401 con el token renovado', () => {
    http.get('/recurso-privado').subscribe({ error: () => void 0 });

    httpTesting.expectOne('/recurso-privado').flush(null, { status: 401, statusText: 'Unauthorized' });

    const reintento = httpTesting.expectOne('/recurso-privado');
    expect(reintento.request.headers.get('Authorization')).toBe('Bearer access-token-nuevo');
    reintento.flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(refrescarAccessToken).toHaveBeenCalledTimes(1);
    expect(cerrarSesion).toHaveBeenCalledTimes(1);
  });
});
