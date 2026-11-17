import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, tap, throwError } from 'rxjs';

import { OMITIR_AUTH } from './context/auth-context';
import { HEADER_COMPANY_UUID, HEADERS_EXTRA, OMITIR_COMPANY_UUID } from './context/http-headers-context';
import {
  MOSTRAR_TOAST_ERROR,
  MOSTRAR_TOAST_EXITO,
  type HttpToastOptions,
} from './context/http-toast-context';
import { AuthService } from '../global-services/services/auth.service';
import { AuthSessionService } from '../global-services/services/auth-session.service';
import { extraerMensajeErrorApi } from '../api/error-api';
import { ToastAlertService } from '../../modules/ui/toast-alert/services/toast-alert.service';

// Interceptor central de autenticacion.
// 1. Agrega Authorization Bearer a requests privadas.
// 2. Si recibe 401, intenta una sola renovacion con refresh token.
// 3. Reintenta la request original con el nuevo access token.
// 4. Puede disparar toast de exito o error usando HttpContext por request.
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const authSessionService = inject(AuthSessionService);
  const router = inject(Router);
  const toastAlertService = inject(ToastAlertService);
  const omitirAuth = request.context.get(OMITIR_AUTH);
  const toastExito = request.context.get(MOSTRAR_TOAST_EXITO);
  const toastError = request.context.get(MOSTRAR_TOAST_ERROR);
  const omitirCompanyUuid = request.context.get(OMITIR_COMPANY_UUID);
  const companyUuid = omitirCompanyUuid
    ? null
    : request.context.get(HEADER_COMPANY_UUID) ?? authSessionService.obtenerCompanyUuid();
  const headersExtra = request.context.get(HEADERS_EXTRA);

  const requestBase = request.clone({ setHeaders: construirHeadersBase(companyUuid, headersExtra) });

  if (omitirAuth) {
    return next(requestBase).pipe(
      tap((evento) => {
        if (evento instanceof HttpResponse) {
          mostrarToastExito(requestBase, evento.body, toastExito, toastAlertService);
        }
      }),
      catchError((error: unknown) => {
        mostrarToastError(requestBase, error, toastError, toastAlertService);
        return throwError(() => error);
      }),
    );
  }

  const accessToken = authService.obtenerAccessToken();
  const requestAutenticada = accessToken
    ? requestBase.clone({
        setHeaders: {
          ...construirHeadersBase(companyUuid, headersExtra),
          Authorization: `Bearer ${accessToken}`,
        },
      })
    : requestBase;

  return next(requestAutenticada).pipe(
    tap((evento) => {
      if (evento instanceof HttpResponse) {
        mostrarToastExito(requestAutenticada, evento.body, toastExito, toastAlertService);
      }
    }),
    catchError((error: unknown) => {
      if (esBloqueoFacturacion(error)) {
        authService.marcarEmpresaActivaBloqueada(true);
        if (router.url !== '/club-bloqueado') void router.navigateByUrl('/club-bloqueado');
        return throwError(() => error);
      }

      if (!(error instanceof HttpErrorResponse) || !debeIntentarRefresh(error)) {
        mostrarToastError(requestAutenticada, error, toastError, toastAlertService);
        return throwError(() => error);
      }

      return authService.refrescarAccessToken().pipe(
        catchError((refreshError) => {
          if (router.url !== '/login') {
            void router.navigateByUrl('/login');
          }
          return throwError(() => refreshError);
        }),
        switchMap((nuevoAccessToken) =>
          next(
            requestBase.clone({
              setHeaders: {
                ...construirHeadersBase(companyUuid, headersExtra),
                Authorization: `Bearer ${nuevoAccessToken}`,
              },
            }),
          ).pipe(
            tap((evento) => {
              if (evento instanceof HttpResponse) {
                mostrarToastExito(requestBase, evento.body, toastExito, toastAlertService);
              }
            }),
            catchError((retryError) => {
              if (esBloqueoFacturacion(retryError)) {
                authService.marcarEmpresaActivaBloqueada(true);
                if (router.url !== '/club-bloqueado') void router.navigateByUrl('/club-bloqueado');
                return throwError(() => retryError);
              }

              // Si un token recien renovado sigue siendo rechazado, no conviene
              // conservar una sesion inconsistente ni iniciar un ciclo de refresh.
              if (esRespuestaNoAutorizada(retryError)) {
                authService.logout().subscribe();
              }

              mostrarToastError(requestBase, retryError, toastError, toastAlertService);
              return throwError(() => retryError);
            }),
          ),
        ),
      );
    }),
  );
};

function esBloqueoFacturacion(error: unknown): boolean {
  if (!(error instanceof HttpErrorResponse) || error.status !== 403) return false;
  const errores = error.error?.errores;
  return Array.isArray(errores) && errores.some(
    (detalle: unknown) =>
      !!detalle && typeof detalle === 'object' &&
      (detalle as { value?: unknown }).value === 'FACTURA_VENCIDA',
  );
}

function construirHeadersBase(
  companyUuid: string | null,
  headersExtra: Readonly<Record<string, string>> | null,
): Record<string, string> {
  const headers: Record<string, string> = {
    ...(headersExtra ?? {}),
  };

  const companyUuidNormalizado = companyUuid?.trim() ?? '';
  if (companyUuidNormalizado) {
    headers['X-Company-Uuid'] = companyUuidNormalizado;
  } else if (typeof headers['X-Company-Uuid'] === 'undefined') {
    headers['X-Company-Uuid'] = '';
  }

  return headers;
}

function mostrarToastExito(
  request: { method: string; url: string },
  body: unknown,
  opciones: HttpToastOptions | null,
  toastAlertService: ToastAlertService,
): void {
  if (!opciones) {
    return;
  }

  const mensaje = extraerMensajeDesdeBody(body) || construirMensajeExito(request.method);
  toastAlertService.success(mensaje, construirOpcionesToast(request, 'success', opciones));
}

function mostrarToastError(
  request: { method: string; url: string },
  error: unknown,
  opciones: HttpToastOptions | null,
  toastAlertService: ToastAlertService,
): void {
  if (!opciones) {
    return;
  }

  const mensaje = extraerMensajeError(error);
  if (!mensaje) {
    return;
  }

  toastAlertService.error(mensaje, {
    ...construirOpcionesToast(request, 'error', opciones),
    titulo: opciones?.titulo?.trim() || obtenerTituloError(error),
    fondoPeligro:
      opciones?.fondoPeligro4xx === true &&
      error instanceof HttpErrorResponse &&
      error.status >= 400 &&
      error.status < 500,
  });
}

function extraerMensajeDesdeBody(body: unknown): string {
  if (!body || typeof body !== 'object') {
    return '';
  }

  const message = (body as { message?: unknown }).message;
  return typeof message === 'string' ? message.trim() : '';
}

function debeIntentarRefresh(error: HttpErrorResponse): boolean {
  return error.status === 401;
}

function esRespuestaNoAutorizada(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === 401;
}

function extraerMensajeError(error: unknown): string {
  return extraerMensajeErrorApi(error);
}

function obtenerTituloError(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return 'Ocurrio un error';
  }

  if (error.status === 0) {
    return 'Sin conexion';
  }

  if (error.status === 400) {
    return 'Solicitud invalida';
  }

  if (error.status === 401) {
    return 'Sesión vencida';
  }

  if (error.status === 403) {
    return 'Acceso denegado';
  }

  if (error.status === 404) {
    return 'No encontrado';
  }

  if (error.status === 409) {
    return 'Conflicto';
  }

  if (error.status === 422) {
    return 'Datos invalidos';
  }

  if (error.status >= 500) {
    return 'Error del servidor';
  }

  return 'Ocurrio un error';
}

function construirOpcionesToast(
  request: { method: string; url: string },
  nivel: 'success' | 'error',
  opciones: HttpToastOptions | null,
): { titulo?: string; subtitulo?: string; duracionMs?: number } {
  const recurso = obtenerNombreRecurso(request.url);

  return {
    titulo: opciones?.titulo?.trim() || recurso || (nivel === 'success' ? 'Operacion exitosa' : 'Ocurrio un error'),
    subtitulo: opciones?.subtitulo?.trim() || '',
    duracionMs: opciones?.duracionMs ?? 5000,
  };
}

function construirMensajeExito(method: string): string {
  switch (method.toUpperCase()) {
    case 'GET':
      return 'Consulta realizada correctamente.';
    case 'POST':
      return 'Operacion realizada correctamente.';
    case 'PUT':
    case 'PATCH':
      return 'Actualizacion realizada correctamente.';
    case 'DELETE':
      return 'Eliminacion realizada correctamente.';
    default:
      return 'Operacion realizada correctamente.';
  }
}

function obtenerNombreRecurso(url: string): string {
  const path = obtenerPathRelativo(url);
  const primerSegmento = path.split('/').filter(Boolean)[0] ?? '';

  const alias: Record<string, string> = {
    user: 'Usuarios',
    'billing-group': 'Grupo familiar',
    companies: 'Empresas',
    'ejemplo-entidades': 'Ejemplo',
  };

  if (alias[primerSegmento]) {
    return alias[primerSegmento];
  }

  if (!primerSegmento) {
    return 'API';
  }

  return primerSegmento
    .split('-')
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
    .join(' ');
}

function obtenerPathRelativo(url: string): string {
  const sinQuery = url.split('?')[0] ?? url;
  const marcadorApi = '/api/';
  const indiceApi = sinQuery.indexOf(marcadorApi);

  if (indiceApi >= 0) {
    return sinQuery.slice(indiceApi + marcadorApi.length);
  }

  try {
    return new URL(url).pathname.replace(/^\/+/, '');
  } catch {
    return sinQuery;
  }
}
