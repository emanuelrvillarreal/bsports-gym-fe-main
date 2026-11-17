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
  AlcanceSeguimiento,
  AsistenciaAlumnoDetalleDto,
  AsistenciaAlumnoFilaDto,
  AsistenciaUmbralesDto,
  SeguimientoAsistenciaDto,
  SeguimientoAsistenciaRequest,
  TrayectoriaDeportivaDto,
} from '../interfaces/seguimiento-asistencia.interfaces';

/**
 * Seguimiento de asistencia y trayectoria deportiva para los tres alcances:
 * ADMIN (todo el club), profesor (sus actividades) y socio (lo propio y su grupo familiar).
 */
@Injectable({ providedIn: 'root' })
export class SeguimientoAsistenciaApiService {
  private readonly http = inject(HttpClient);

  consultar(
    alcance: Exclude<AlcanceSeguimiento, 'socio'>,
    filtros: SeguimientoAsistenciaRequest,
  ): Observable<SeguimientoAsistenciaDto> {
    const ruta =
      alcance === 'admin'
        ? API_ROUTES.asistenciaActividad.estadisticas
        : API_ROUTES.portalProfesor.seguimientoAlumnos;
    return this.http
      .post<SeguimientoAsistenciaDto>(crearApiUrl(ruta), limpiar(filtros), {
        context: this.contextoLectura('Seguimiento de asistencia'),
      })
      .pipe(map(normalizarSeguimiento));
  }

  obtenerDetalle(
    alcance: AlcanceSeguimiento,
    inscripcionUuid: string,
    desde?: string | null,
    hasta?: string | null,
  ): Observable<AsistenciaAlumnoDetalleDto> {
    const ruta =
      alcance === 'admin'
        ? API_ROUTES.asistenciaActividad.detalleEstadisticas(inscripcionUuid)
        : alcance === 'profesor'
          ? API_ROUTES.portalProfesor.detalleSeguimientoAlumno(inscripcionUuid)
          : API_ROUTES.portalSocio.detalleMiAsistencia(inscripcionUuid);
    return this.http
      .get<AsistenciaAlumnoDetalleDto>(crearApiUrl(ruta), {
        params: parametros({ desde, hasta }),
        context: this.contextoLectura('Detalle de asistencia'),
      })
      .pipe(
        map((detalle) => ({
          ...detalle,
          alumno: normalizarFila(detalle.alumno),
          clases: detalle.clases.map((clase) => ({ ...clase, inicio: aFechaIso(clase.inicio) ?? '' })),
        })),
      );
  }

  obtenerTrayectoria(alcance: AlcanceSeguimiento, memberUuid?: string | null): Observable<TrayectoriaDeportivaDto> {
    if (alcance === 'socio') {
      return this.http
        .get<TrayectoriaDeportivaDto>(crearApiUrl(API_ROUTES.portalSocio.miTrayectoria), {
          params: parametros({ memberUuid }),
          context: this.contextoLectura('Trayectoria deportiva'),
        })
        .pipe(map(normalizarTrayectoria));
    }
    const ruta =
      alcance === 'admin'
        ? API_ROUTES.asistenciaActividad.trayectoria(memberUuid ?? '')
        : API_ROUTES.portalProfesor.trayectoriaAlumno(memberUuid ?? '');
    return this.http
      .get<TrayectoriaDeportivaDto>(crearApiUrl(ruta), {
        context: this.contextoLectura('Trayectoria deportiva'),
      })
      .pipe(map(normalizarTrayectoria));
  }

  /** Asistencias del socio actual o de un familiar de su grupo. */
  consultarMisAsistencias(
    memberUuid?: string | null,
    desde?: string | null,
    hasta?: string | null,
  ): Observable<SeguimientoAsistenciaDto> {
    return this.http
      .get<SeguimientoAsistenciaDto>(crearApiUrl(API_ROUTES.portalSocio.misAsistencias), {
        params: parametros({ memberUuid, desde, hasta }),
        context: this.contextoLectura('Mis asistencias'),
      })
      .pipe(map(normalizarSeguimiento));
  }

  obtenerUmbrales(): Observable<AsistenciaUmbralesDto> {
    return this.http.get<AsistenciaUmbralesDto>(crearApiUrl(API_ROUTES.asistenciaActividad.umbrales), {
      context: this.contextoLectura('Umbrales de asistencia'),
    });
  }

  guardarUmbrales(umbrales: AsistenciaUmbralesDto): Observable<AsistenciaUmbralesDto> {
    return this.http.put<AsistenciaUmbralesDto>(crearApiUrl(API_ROUTES.asistenciaActividad.umbrales), umbrales, {
      context: new HttpContext()
        .set(MOSTRAR_TOAST_EXITO, { titulo: 'Umbrales guardados' })
        .set(MOSTRAR_TOAST_ERROR, { titulo: 'Umbrales de asistencia' }),
    });
  }

  private contextoLectura(titulo: string): HttpContext {
    return new HttpContext().set(MOSTRAR_TOAST_ERROR, { titulo });
  }
}

function limpiar(filtros: SeguimientoAsistenciaRequest): SeguimientoAsistenciaRequest {
  return Object.fromEntries(
    Object.entries(filtros).filter(([, valor]) => valor !== null && valor !== undefined && valor !== ''),
  ) as SeguimientoAsistenciaRequest;
}

function parametros(valores: Record<string, string | null | undefined>): HttpParams {
  let params = new HttpParams();
  for (const [clave, valor] of Object.entries(valores)) {
    if (valor) {
      params = params.set(clave, valor);
    }
  }
  return params;
}

/**
 * El backend serializa LocalDate y LocalDateTime como arreglos ([2026, 3, 10] o
 * [2026, 3, 10, 18, 30]). Se pasan a ISO (`2026-03-10`, `2026-03-10T18:30:00`) para la vista.
 */
export function aFechaIso(valor: unknown): string | null {
  if (valor === null || valor === undefined || valor === '') return null;
  if (typeof valor === 'string') return valor;
  if (Array.isArray(valor) && valor.length >= 3) {
    const [anio, mes, dia, hora, minuto, segundo] = valor.map(Number);
    const fecha = `${anio}-${dos(mes)}-${dos(dia)}`;
    return valor.length > 3 ? `${fecha}T${dos(hora)}:${dos(minuto ?? 0)}:${dos(segundo ?? 0)}` : fecha;
  }
  return null;
}

function dos(numero: number): string {
  return String(numero).padStart(2, '0');
}

function normalizarFila(fila: AsistenciaAlumnoFilaDto): AsistenciaAlumnoFilaDto {
  return {
    ...fila,
    fechaInscripcion: aFechaIso(fila.fechaInscripcion) ?? '',
    fechaBaja: aFechaIso(fila.fechaBaja),
    ultimaAsistencia: aFechaIso(fila.ultimaAsistencia),
  };
}

function normalizarSeguimiento(datos: SeguimientoAsistenciaDto): SeguimientoAsistenciaDto {
  return {
    ...datos,
    alertas: datos.alertas.map(normalizarFila),
    alumnos: { ...datos.alumnos, content: datos.alumnos.content.map(normalizarFila) },
  };
}

function normalizarTrayectoria(datos: TrayectoriaDeportivaDto): TrayectoriaDeportivaDto {
  return {
    ...datos,
    fechaAltaClub: aFechaIso(datos.fechaAltaClub),
    actividades: datos.actividades.map((actividad) => ({
      ...actividad,
      primeraInscripcion: aFechaIso(actividad.primeraInscripcion) ?? '',
      ultimaBaja: aFechaIso(actividad.ultimaBaja),
      periodos: actividad.periodos.map((periodo) => ({
        ...periodo,
        desde: aFechaIso(periodo.desde) ?? '',
        hasta: aFechaIso(periodo.hasta),
      })),
    })),
    hitos: datos.hitos.map((hito) => ({ ...hito, fecha: aFechaIso(hito.fecha) ?? '' })),
  };
}
