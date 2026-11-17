import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs';

import { PresenciasClubActualizacionService } from '../global-services/services/presencias-club-actualizacion.service';

/**
 * Invalida el contador de presentes al confirmar un ingreso o egreso del club.
 * No intercepta el GET de presentes para evitar ciclos de consultas.
 */
export const actualizarPresenciasClubInterceptor: HttpInterceptorFn = (request, next) => {
  const actualizaciones = inject(PresenciasClubActualizacionService);

  if (request.method !== 'POST' || !esRegistroAccesoClub(request.url)) {
    return next(request);
  }

  return next(request).pipe(
    tap((evento) => {
      if (evento instanceof HttpResponse) {
        actualizaciones.solicitarActualizacion();
      }
    }),
  );
};

function esRegistroAccesoClub(url: string): boolean {
  const path = url.split('?')[0]?.replace(/\/+$/, '') ?? '';
  return path.endsWith('/acceso-club');
}
