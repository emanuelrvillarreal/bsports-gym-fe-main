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
  AlumnoAsignableDto,
  AsignarRutinaPayload,
  EjercicioDto,
  EjercicioPayload,
  EstadoRutina,
  FiltrosEjercicios,
  PaginaEjercicios,
  PaginaRutinas,
  RutinaDetalleDto,
  RutinaPayload,
  RutinaPortalDto,
  SeguimientoRutinaPayload,
} from '../interfaces/entrenamiento.interfaces';
import { aFechaIso } from './seguimiento-asistencia-api.service';

/** Biblioteca de ejercicios, rutinas, asignaciones y seguimiento (ADMIN y profesor), y portal del socio. */
@Injectable({ providedIn: 'root' })
export class EntrenamientoApiService {
  private readonly http = inject(HttpClient);
  private readonly rutas = API_ROUTES.entrenamiento;

  listarEjercicios(filtros: FiltrosEjercicios = {}): Observable<PaginaEjercicios> {
    let params = new HttpParams();
    for (const [clave, valor] of Object.entries(filtros)) {
      if (valor !== '' && valor !== null && valor !== undefined) params = params.set(clave, String(valor));
    }
    return this.http.get<PaginaEjercicios>(crearApiUrl(this.rutas.ejercicios), {
      params,
      context: this.lectura('Biblioteca de ejercicios'),
    });
  }

  crearEjercicio(payload: EjercicioPayload): Observable<EjercicioDto> {
    return this.http.post<EjercicioDto>(crearApiUrl(this.rutas.ejercicios), payload, {
      context: this.mutacion('Ejercicio creado', 'Ejercicio'),
    });
  }

  editarEjercicio(uuid: string, payload: EjercicioPayload): Observable<EjercicioDto> {
    return this.http.put<EjercicioDto>(crearApiUrl(this.rutas.ejercicio(uuid)), payload, {
      context: this.mutacion('Ejercicio actualizado', 'Ejercicio'),
    });
  }

  borrarEjercicio(uuid: string): Observable<void> {
    return this.http.delete<void>(crearApiUrl(this.rutas.ejercicio(uuid)), {
      context: this.mutacion('Ejercicio eliminado', 'Ejercicio'),
    });
  }

  listarRutinas(filtros: { search?: string; estado?: EstadoRutina | ''; page: number; size: number }): Observable<PaginaRutinas> {
    const cuerpo = { ...filtros, estado: filtros.estado || null, search: filtros.search || null };
    return this.http
      .post<PaginaRutinas>(crearApiUrl(this.rutas.paginarRutinas), cuerpo, { context: this.lectura('Rutinas') })
      .pipe(
        map((pagina) => ({
          ...pagina,
          content: pagina.content.map((fila) => normalizar(fila)),
        })),
      );
  }

  obtenerRutina(uuid: string): Observable<RutinaDetalleDto> {
    return this.http
      .get<RutinaDetalleDto>(crearApiUrl(this.rutas.rutina(uuid)), { context: this.lectura('Rutina') })
      .pipe(map((rutina) => normalizar(rutina)));
  }

  crearRutina(payload: RutinaPayload): Observable<RutinaDetalleDto> {
    return this.http
      .post<RutinaDetalleDto>(crearApiUrl(this.rutas.rutinas), payload, { context: this.mutacion('Rutina creada', 'Rutina') })
      .pipe(map((rutina) => normalizar(rutina)));
  }

  editarRutina(uuid: string, payload: RutinaPayload): Observable<RutinaDetalleDto> {
    return this.http
      .put<RutinaDetalleDto>(crearApiUrl(this.rutas.rutina(uuid)), payload, { context: this.mutacion('Rutina actualizada', 'Rutina') })
      .pipe(map((rutina) => normalizar(rutina)));
  }

  reemplazarRutina(uuid: string, payload: RutinaPayload): Observable<RutinaDetalleDto> {
    return this.http
      .post<RutinaDetalleDto>(crearApiUrl(this.rutas.reemplazar(uuid)), payload, {
        context: this.mutacion('Rutina reemplazada', 'Rutina'),
      })
      .pipe(map((rutina) => normalizar(rutina)));
  }

  archivarRutina(uuid: string): Observable<RutinaDetalleDto> {
    return this.http
      .post<RutinaDetalleDto>(crearApiUrl(this.rutas.archivar(uuid)), {}, { context: this.mutacion('Rutina archivada', 'Rutina') })
      .pipe(map((rutina) => normalizar(rutina)));
  }

  asignar(uuid: string, payload: AsignarRutinaPayload): Observable<RutinaDetalleDto> {
    return this.http
      .post<RutinaDetalleDto>(crearApiUrl(this.rutas.asignar(uuid)), payload, { context: this.mutacion('Rutina asignada', 'Asignación') })
      .pipe(map((rutina) => normalizar(rutina)));
  }

  finalizarAsignacion(asignacionUuid: string): Observable<RutinaDetalleDto> {
    return this.http
      .post<RutinaDetalleDto>(crearApiUrl(this.rutas.finalizarAsignacion(asignacionUuid)), {}, {
        context: this.mutacion('Rutina finalizada para el socio', 'Asignación'),
      })
      .pipe(map((rutina) => normalizar(rutina)));
  }

  registrarSesion(asignacionUuid: string, payload: SeguimientoRutinaPayload): Observable<RutinaDetalleDto> {
    return this.http
      .post<RutinaDetalleDto>(crearApiUrl(this.rutas.seguimiento(asignacionUuid)), payload, {
        context: this.mutacion('Sesión registrada', 'Seguimiento'),
      })
      .pipe(map((rutina) => normalizar(rutina)));
  }

  alumnos(search = ''): Observable<readonly AlumnoAsignableDto[]> {
    const params = search ? new HttpParams().set('search', search) : undefined;
    return this.http.get<readonly AlumnoAsignableDto[]>(crearApiUrl(this.rutas.alumnos), {
      params,
      context: this.lectura('Socios'),
    });
  }

  misRutinas(memberUuid?: string | null): Observable<readonly RutinaPortalDto[]> {
    const params = memberUuid ? new HttpParams().set('memberUuid', memberUuid) : undefined;
    return this.http
      .get<readonly RutinaPortalDto[]>(crearApiUrl(API_ROUTES.portalSocio.misEntrenamientos), {
        params,
        context: this.lectura('Mis entrenamientos'),
      })
      .pipe(map((lista) => lista.map((item) => normalizar(item))));
  }

  private lectura(titulo: string): HttpContext {
    return new HttpContext().set(MOSTRAR_TOAST_ERROR, { titulo });
  }

  private mutacion(exito: string, error: string): HttpContext {
    return new HttpContext().set(MOSTRAR_TOAST_EXITO, { titulo: exito }).set(MOSTRAR_TOAST_ERROR, { titulo: error });
  }
}

const CLAVES_FECHA = new Set([
  'fecha',
  'fechaInicio',
  'fechaFin',
  'fechaAsignacion',
  'fechaFinalizacion',
  'ultimaSesion',
  'actualizada',
]);

/**
 * El backend manda LocalDate como [aaaa, m, d] y Timestamp como milisegundos. Recorre la respuesta y
 * pasa a ISO todas las claves de fecha, para que la vista trabaje siempre con texto.
 */
export function normalizar<T>(valor: T): T {
  if (Array.isArray(valor)) return valor.map((item) => normalizar(item)) as T;
  if (!valor || typeof valor !== 'object') return valor;
  const resultado: Record<string, unknown> = {};
  for (const [clave, dato] of Object.entries(valor as Record<string, unknown>)) {
    if (CLAVES_FECHA.has(clave)) {
      resultado[clave] = typeof dato === 'number' ? new Date(dato).toISOString() : aFechaIso(dato);
    } else {
      resultado[clave] = typeof dato === 'object' ? normalizar(dato) : dato;
    }
  }
  return resultado as T;
}
