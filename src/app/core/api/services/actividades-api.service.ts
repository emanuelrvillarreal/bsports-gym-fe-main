import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import {
  MOSTRAR_TOAST_ERROR,
  MOSTRAR_TOAST_EXITO,
} from '../../interceptors/context/http-toast-context';
import { API_ROUTES } from '../api-routes';
import { crearApiUrl } from '../api-url';
import {
  ActividadDto,
  ActividadHorarioDto,
  GuardarActividadPayload,
  InscripcionActividadPayload,
  InscripcionActividadResponse,
  ConsentimientoMenorCommand,
  PaginaInscripcionesActividadDto,
  PaginarInscripcionesActividadCommand,
  PaginaActividadesResponse,
  PaginarActividadesPayload,
} from '../interfaces/actividades.interfaces';

@Injectable({ providedIn: 'root' })
export class ActividadesApiService {
  private readonly http = inject(HttpClient);

  paginar(payload: PaginarActividadesPayload): Observable<PaginaActividadesResponse> {
    return this.http
      .post<PaginaActividadesResponse>(crearApiUrl(API_ROUTES.actividades.paginar), payload, {
        context: new HttpContext().set(MOSTRAR_TOAST_ERROR, { titulo: 'Actividades' }),
      })
      .pipe(
        map((pagina) => ({
          ...pagina,
          content: pagina.content.map((actividad) => ({
            ...actividad,
            horarios: this.normalizarHorarios(actividad.horarios),
          })),
        })),
      );
  }

  crear(payload: GuardarActividadPayload): Observable<ActividadDto> {
    return this.http
      .post<ActividadDto>(crearApiUrl(API_ROUTES.actividades.crear), payload, {
        context: this.contextoMutacion('Actividad creada'),
      })
      .pipe(map((actividad) => this.normalizarHoras(actividad)));
  }

  obtenerDetalle(actividadUuid: string): Observable<ActividadDto> {
    return this.http
      .get<ActividadDto>(crearApiUrl(API_ROUTES.actividades.obtenerDetalle(actividadUuid)), {
        context: new HttpContext().set(MOSTRAR_TOAST_ERROR, { titulo: 'Actividad' }),
      })
      .pipe(map((actividad) => this.normalizarHoras(actividad)));
  }

  actualizar(actividadUuid: string, payload: GuardarActividadPayload): Observable<ActividadDto> {
    return this.http
      .put<ActividadDto>(crearApiUrl(API_ROUTES.actividades.actualizar(actividadUuid)), payload, {
        context: this.contextoMutacion('Actividad actualizada'),
      })
      .pipe(map((actividad) => this.normalizarHoras(actividad)));
  }

  inscribir(
    actividadUuid: string,
    payload: InscripcionActividadPayload,
  ): Observable<InscripcionActividadResponse> {
    return this.http.post<InscripcionActividadResponse>(
      crearApiUrl(API_ROUTES.actividades.inscribirSocio(actividadUuid)),
      payload,
      { context: this.contextoMutacion('Inscripción registrada') },
    );
  }

  /** Cambia los horarios de un socio ya inscripto sin darlo de baja. */
  cambiarHorariosInscripcion(
    actividadUuid: string,
    payload: InscripcionActividadPayload,
  ): Observable<InscripcionActividadResponse> {
    return this.http.put<InscripcionActividadResponse>(
      crearApiUrl(API_ROUTES.actividades.cambiarHorariosInscripcion(actividadUuid)),
      payload,
      { context: this.contextoMutacion('Horarios actualizados') },
    );
  }

  darDeBajaInscripcion(
    actividadUuid: string,
    payload: InscripcionActividadPayload,
  ): Observable<InscripcionActividadResponse> {
    return this.http.post<InscripcionActividadResponse>(
      crearApiUrl(API_ROUTES.actividades.darDeBajaInscripcion(actividadUuid)),
      payload,
      { context: this.contextoMutacion('Inscripción dada de baja') },
    );
  }

  // TODO(BACKEND-PENDIENTE): Postman todavía no publica una nómina paginada
  // que incluya memberUuid, requerido para ejecutar la baja.
  paginarInscripciones(
    actividadUuid: string,
    command: PaginarInscripcionesActividadCommand,
  ): Observable<PaginaInscripcionesActividadDto> {
    return this.http.post<PaginaInscripcionesActividadDto>(
      crearApiUrl(API_ROUTES.actividades.paginarInscripciones(actividadUuid)),
      command,
      { context: new HttpContext().set(MOSTRAR_TOAST_ERROR, { titulo: 'Inscriptos' }) },
    );
  }

  // TODO(BACKEND-PENDIENTE): contratos provisionales. Las llamadas son reales
  // y pueden responder 4xx hasta que el backend publique los endpoints.
  eliminar(actividadUuid: string): Observable<void> {
    return this.http.delete<void>(crearApiUrl(API_ROUTES.actividades.eliminar(actividadUuid)), {
      context: this.contextoMutacion('Actividad desactivada'),
    });
  }

  registrarConsentimiento(
    actividadUuid: string,
    command: ConsentimientoMenorCommand,
  ): Observable<void> {
    return this.http.post<void>(
      crearApiUrl(API_ROUTES.actividades.registrarConsentimiento(actividadUuid)),
      command,
      { context: this.contextoMutacion('Consentimiento registrado') },
    );
  }

  private contextoMutacion(titulo: string): HttpContext {
    return new HttpContext()
      .set(MOSTRAR_TOAST_EXITO, { titulo })
      .set(MOSTRAR_TOAST_ERROR, { titulo: 'Actividades' });
  }

  private normalizarHoras(actividad: ActividadDto): ActividadDto {
    return {
      ...actividad,
      horaInicio: this.normalizarHora(actividad.horaInicio),
      horaFin: this.normalizarHora(actividad.horaFin),
      horarios: this.normalizarHorarios(actividad.horarios),
    };
  }

  /** El backend serializa LocalTime como arreglo; los horarios viajan siempre como "HH:mm:ss". */
  private normalizarHorarios(
    horarios: readonly ActividadHorarioDto[] | null | undefined,
  ): readonly ActividadHorarioDto[] | undefined {
    return horarios?.map((horario) => ({
      ...horario,
      horaInicio: this.normalizarHora(horario.horaInicio),
      horaFin: this.normalizarHora(horario.horaFin),
    }));
  }

  private normalizarHora(valor: unknown): string {
    if (Array.isArray(valor)) {
      const [hora = 0, minutos = 0, segundos] = valor;
      const partes = [hora, minutos, segundos]
        .filter((parte): parte is number => typeof parte === 'number')
        .map((parte) => String(parte).padStart(2, '0'));
      return partes.join(':');
    }

    return typeof valor === 'string' ? valor : '';
  }
}
