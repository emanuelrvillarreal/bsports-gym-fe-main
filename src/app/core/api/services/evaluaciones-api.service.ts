import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import {
  MOSTRAR_TOAST_ERROR,
  MOSTRAR_TOAST_EXITO,
} from '../../interceptors/context/http-toast-context';
import { API_ROUTES } from '../api-routes';
import { crearApiUrl } from '../api-url';
import {
  EvaluacionPayload,
  EvaluacionesAccesoDto,
  EvaluacionesConfigDto,
  HistorialEvaluacionesDto,
  SocioEvaluableDto,
} from '../interfaces/evaluaciones.interfaces';
import { aFechaIso } from './seguimiento-asistencia-api.service';

/** Evaluaciones físicas (módulo opcional por club): admin, profesor habilitado y portal del socio. */
@Injectable({ providedIn: 'root' })
export class EvaluacionesApiService {
  private readonly http = inject(HttpClient);
  private readonly rutas = API_ROUTES.evaluaciones;

  acceso(): Observable<EvaluacionesAccesoDto> {
    return this.http.get<EvaluacionesAccesoDto>(crearApiUrl(this.rutas.acceso), { context: this.lectura('Evaluaciones') });
  }

  guardarConfig(config: EvaluacionesConfigDto): Observable<EvaluacionesAccesoDto> {
    return this.http.put<EvaluacionesAccesoDto>(crearApiUrl(this.rutas.config), config, {
      context: this.mutacion('Configuración guardada', 'Evaluaciones'),
    });
  }

  socios(search = ''): Observable<readonly SocioEvaluableDto[]> {
    const params = search ? new HttpParams().set('search', search) : undefined;
    return this.http
      .get<readonly SocioEvaluableDto[]>(crearApiUrl(this.rutas.socios), { params, context: this.lectura('Evaluaciones') })
      .pipe(
        map((filas) =>
          filas.map((f) => ({ ...f, ultimaEvaluacion: aFechaIso(f.ultimaEvaluacion), proximaEvaluacion: aFechaIso(f.proximaEvaluacion) })),
        ),
      );
  }

  historial(memberUuid: string): Observable<HistorialEvaluacionesDto> {
    return this.http
      .get<HistorialEvaluacionesDto>(crearApiUrl(this.rutas.socio(memberUuid)), { context: this.lectura('Evaluaciones') })
      .pipe(map(normalizarHistorial));
  }

  crear(memberUuid: string, payload: EvaluacionPayload): Observable<HistorialEvaluacionesDto> {
    return this.http
      .post<HistorialEvaluacionesDto>(crearApiUrl(this.rutas.socio(memberUuid)), payload, {
        context: this.mutacion('Evaluación registrada', 'Evaluación'),
      })
      .pipe(map(normalizarHistorial));
  }

  editar(uuid: string, payload: EvaluacionPayload): Observable<HistorialEvaluacionesDto> {
    return this.http
      .put<HistorialEvaluacionesDto>(crearApiUrl(this.rutas.evaluacion(uuid)), payload, {
        context: this.mutacion('Evaluación actualizada', 'Evaluación'),
      })
      .pipe(map(normalizarHistorial));
  }

  borrar(uuid: string): Observable<HistorialEvaluacionesDto> {
    return this.http
      .delete<HistorialEvaluacionesDto>(crearApiUrl(this.rutas.evaluacion(uuid)), {
        context: this.mutacion('Evaluación eliminada', 'Evaluación'),
      })
      .pipe(map(normalizarHistorial));
  }

  misEvaluaciones(memberUuid?: string | null): Observable<HistorialEvaluacionesDto> {
    const params = memberUuid ? new HttpParams().set('memberUuid', memberUuid) : undefined;
    return this.http
      .get<HistorialEvaluacionesDto>(crearApiUrl(API_ROUTES.portalSocio.misEvaluaciones), {
        params,
        context: this.lectura('Mis evaluaciones'),
      })
      .pipe(map(normalizarHistorial));
  }

  private lectura(titulo: string): HttpContext {
    return new HttpContext().set(MOSTRAR_TOAST_ERROR, { titulo });
  }

  private mutacion(exito: string, error: string): HttpContext {
    return new HttpContext().set(MOSTRAR_TOAST_EXITO, { titulo: exito }).set(MOSTRAR_TOAST_ERROR, { titulo: error });
  }
}

function normalizarHistorial(historial: HistorialEvaluacionesDto): HistorialEvaluacionesDto {
  return {
    ...historial,
    evaluaciones: historial.evaluaciones.map((e) => ({
      ...e,
      fecha: aFechaIso(e.fecha) ?? '',
      proximaEvaluacion: aFechaIso(e.proximaEvaluacion),
    })),
  };
}
