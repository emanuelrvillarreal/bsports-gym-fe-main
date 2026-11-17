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
  EquipoDetalleDto,
  EquipoFilaDto,
  EquipoPayload,
  EstadisticaPayload,
  EstadisticasPartidoDto,
  JugadorPayload,
  OpcionesCompetenciasDto,
  PartidoPayload,
  SocioCompetenciaDto,
  TorneoDetalleDto,
  TorneoFilaDto,
  TorneoPayload,
} from '../interfaces/competencias.interfaces';
import { aFechaIso } from './seguimiento-asistencia-api.service';

export interface FiltroCompetencias {
  readonly search?: string;
  readonly disciplina?: string;
  readonly incluirInactivos?: boolean;
}

/** Competencias: equipos, planteles, torneos, partidos y estadísticas (ADMIN) y "Mis equipos" (profesor). */
@Injectable({ providedIn: 'root' })
export class CompetenciasApiService {
  private readonly http = inject(HttpClient);
  private readonly r = API_ROUTES.competencias;

  opciones(): Observable<OpcionesCompetenciasDto> {
    return this.http.get<OpcionesCompetenciasDto>(crearApiUrl(this.r.opciones), { context: this.lectura() });
  }

  socios(search = ''): Observable<readonly SocioCompetenciaDto[]> {
    const params = search ? new HttpParams().set('search', search) : undefined;
    return this.http.get<readonly SocioCompetenciaDto[]>(crearApiUrl(this.r.socios), { params, context: this.lectura() });
  }

  equipos(filtro: FiltroCompetencias): Observable<readonly EquipoFilaDto[]> {
    return this.http.post<readonly EquipoFilaDto[]>(crearApiUrl(this.r.listarEquipos), filtro, { context: this.lectura() });
  }

  equipo(uuid: string): Observable<EquipoDetalleDto> {
    return this.http.get<EquipoDetalleDto>(crearApiUrl(this.r.equipo(uuid)), { context: this.lectura() }).pipe(map(fechas));
  }

  crearEquipo(payload: EquipoPayload): Observable<EquipoDetalleDto> {
    return this.http.post<EquipoDetalleDto>(crearApiUrl(this.r.equipos), payload, { context: this.mutacion('Equipo creado') }).pipe(map(fechas));
  }

  editarEquipo(uuid: string, payload: EquipoPayload): Observable<EquipoDetalleDto> {
    return this.http.put<EquipoDetalleDto>(crearApiUrl(this.r.equipo(uuid)), payload, { context: this.mutacion('Equipo actualizado') }).pipe(map(fechas));
  }

  agregarJugador(equipoUuid: string, payload: JugadorPayload): Observable<EquipoDetalleDto> {
    return this.http
      .post<EquipoDetalleDto>(crearApiUrl(this.r.jugadores(equipoUuid)), payload, { context: this.mutacion('Jugador sumado al plantel') })
      .pipe(map(fechas));
  }

  editarJugador(jugadorUuid: string, payload: { dorsal: number | null; posicion: string | null; capitan: boolean }): Observable<EquipoDetalleDto> {
    return this.http
      .put<EquipoDetalleDto>(crearApiUrl(this.r.jugador(jugadorUuid)), payload, { context: this.mutacion('Jugador actualizado') })
      .pipe(map(fechas));
  }

  bajaJugador(jugadorUuid: string, motivo: string | null): Observable<EquipoDetalleDto> {
    return this.http
      .post<EquipoDetalleDto>(crearApiUrl(this.r.bajaJugador(jugadorUuid)), { motivo }, { context: this.mutacion('Baja registrada') })
      .pipe(map(fechas));
  }

  pase(jugadorUuid: string, payload: { equipoDestinoUuid: string; dorsal: number | null; posicion: string | null }): Observable<EquipoDetalleDto> {
    return this.http
      .post<EquipoDetalleDto>(crearApiUrl(this.r.pase(jugadorUuid)), payload, { context: this.mutacion('Pase registrado') })
      .pipe(map(fechas));
  }

  torneos(filtro: FiltroCompetencias): Observable<readonly TorneoFilaDto[]> {
    return this.http
      .post<readonly TorneoFilaDto[]>(crearApiUrl(this.r.listarTorneos), filtro, { context: this.lectura() })
      .pipe(map((filas) => filas.map(fechas)));
  }

  torneo(uuid: string): Observable<TorneoDetalleDto> {
    return this.http.get<TorneoDetalleDto>(crearApiUrl(this.r.torneo(uuid)), { context: this.lectura() }).pipe(map(fechas));
  }

  crearTorneo(payload: TorneoPayload): Observable<TorneoDetalleDto> {
    return this.http.post<TorneoDetalleDto>(crearApiUrl(this.r.torneos), payload, { context: this.mutacion('Torneo creado') }).pipe(map(fechas));
  }

  editarTorneo(uuid: string, payload: TorneoPayload): Observable<TorneoDetalleDto> {
    return this.http.put<TorneoDetalleDto>(crearApiUrl(this.r.torneo(uuid)), payload, { context: this.mutacion('Torneo actualizado') }).pipe(map(fechas));
  }

  agregarParticipante(torneoUuid: string, payload: { equipoUuid?: string | null; nombre?: string | null }): Observable<TorneoDetalleDto> {
    return this.http
      .post<TorneoDetalleDto>(crearApiUrl(this.r.participantes(torneoUuid)), payload, { context: this.mutacion('Participante agregado') })
      .pipe(map(fechas));
  }

  quitarParticipante(uuid: string): Observable<TorneoDetalleDto> {
    return this.http
      .delete<TorneoDetalleDto>(crearApiUrl(this.r.participante(uuid)), { context: this.mutacion('Participante quitado') })
      .pipe(map(fechas));
  }

  crearPartido(torneoUuid: string, payload: PartidoPayload): Observable<TorneoDetalleDto> {
    return this.http
      .post<TorneoDetalleDto>(crearApiUrl(this.r.partidos(torneoUuid)), payload, { context: this.mutacion('Partido cargado') })
      .pipe(map(fechas));
  }

  editarPartido(uuid: string, payload: PartidoPayload): Observable<TorneoDetalleDto> {
    return this.http
      .put<TorneoDetalleDto>(crearApiUrl(this.r.partido(uuid)), payload, { context: this.mutacion('Partido actualizado') })
      .pipe(map(fechas));
  }

  eliminarPartido(uuid: string): Observable<TorneoDetalleDto> {
    return this.http
      .delete<TorneoDetalleDto>(crearApiUrl(this.r.partido(uuid)), { context: this.mutacion('Partido eliminado') })
      .pipe(map(fechas));
  }

  estadisticas(partidoUuid: string): Observable<EstadisticasPartidoDto> {
    return this.http
      .get<EstadisticasPartidoDto>(crearApiUrl(this.r.estadisticas(partidoUuid)), { context: this.lectura() })
      .pipe(map(fechas));
  }

  guardarEstadisticas(partidoUuid: string, items: readonly EstadisticaPayload[]): Observable<EstadisticasPartidoDto> {
    return this.http
      .put<EstadisticasPartidoDto>(crearApiUrl(this.r.estadisticas(partidoUuid)), { items }, { context: this.mutacion('Estadísticas guardadas') })
      .pipe(map(fechas));
  }

  misEquipos(): Observable<readonly EquipoDetalleDto[]> {
    return this.http
      .get<readonly EquipoDetalleDto[]>(crearApiUrl(API_ROUTES.portalProfesor.misEquipos), { context: this.lectura() })
      .pipe(map((lista) => lista.map(fechas)));
  }

  torneoProfesor(uuid: string): Observable<TorneoDetalleDto> {
    return this.http
      .get<TorneoDetalleDto>(crearApiUrl(API_ROUTES.portalProfesor.torneo(uuid)), { context: this.lectura() })
      .pipe(map(fechas));
  }

  private lectura(): HttpContext {
    return new HttpContext().set(MOSTRAR_TOAST_ERROR, { titulo: 'Competencias' });
  }

  private mutacion(exito: string): HttpContext {
    return new HttpContext().set(MOSTRAR_TOAST_EXITO, { titulo: exito }).set(MOSTRAR_TOAST_ERROR, { titulo: 'Competencias' });
  }
}

/** Convierte a ISO toda clave que empiece con "fecha" (el backend manda LocalDate/LocalDateTime como arreglos). */
export function fechas<T>(valor: T): T {
  if (Array.isArray(valor)) return valor.map((v) => fechas(v)) as T;
  if (!valor || typeof valor !== 'object') return valor;
  const resultado: Record<string, unknown> = {};
  for (const [clave, dato] of Object.entries(valor as Record<string, unknown>)) {
    resultado[clave] = clave.startsWith('fecha') ? aFechaIso(dato) : typeof dato === 'object' ? fechas(dato) : dato;
  }
  return resultado as T;
}
