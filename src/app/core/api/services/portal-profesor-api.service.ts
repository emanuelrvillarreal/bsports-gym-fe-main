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
  CalendarioConsultaPayload,
  CalendarioSlotDto,
  CredencialPortalDto,
} from '../interfaces/portal.interfaces';
import {
  EventoActividadCommand,
  EventoActividadDto,
  AsistenciaProfesorItemDto,
  GuardarAsistenciaProfesorPayload,
  PaginaAsistenciasActividadDto,
  PaginarAsistenciasProfesorPayload,
  PlanillaAsistenciaProfesorDto,
} from '../interfaces/actividades.interfaces';
import {
  ActualizarUsuarioInternoPayload,
  ProfesorDto,
} from '../interfaces/usuarios-internos.interfaces';

@Injectable({ providedIn: 'root' })
export class PortalProfesorApiService {
  private readonly http = inject(HttpClient);

  obtenerCredencial(): Observable<CredencialPortalDto<ProfesorDto>> {
    return this.http.get<CredencialPortalDto<ProfesorDto>>(
      crearApiUrl(API_ROUTES.portalProfesor.obtenerCredencial),
      { context: this.contextoLectura('Credencial') },
    );
  }

  obtenerPerfil(): Observable<ProfesorDto> {
    return this.http.get<ProfesorDto>(crearApiUrl(API_ROUTES.portalProfesor.obtenerPerfil), {
      context: this.contextoLectura('Perfil'),
    });
  }

  actualizarPerfil(payload: ActualizarUsuarioInternoPayload): Observable<ProfesorDto> {
    return this.http.put<ProfesorDto>(
      crearApiUrl(API_ROUTES.portalProfesor.actualizarPerfil),
      payload,
      {
        context: new HttpContext()
          .set(MOSTRAR_TOAST_EXITO, { titulo: 'Perfil actualizado' })
          .set(MOSTRAR_TOAST_ERROR, { titulo: 'Perfil' }),
      },
    );
  }

  consultarCalendario(
    payload: CalendarioConsultaPayload,
  ): Observable<readonly CalendarioSlotDto[]> {
    return this.http.post<readonly CalendarioSlotDto[]>(
      crearApiUrl(API_ROUTES.portalProfesor.consultarCalendario),
      payload,
      { context: this.contextoLectura('Calendario') },
    );
  }

  crearEvento(command: EventoActividadCommand): Observable<EventoActividadDto> {
    return this.http.post<EventoActividadDto>(
      crearApiUrl(API_ROUTES.portalProfesor.crearEventoActividad),
      command,
      { context: this.contextoMutacion('Evento creado') },
    );
  }

  actualizarEvento(
    eventoUuid: string,
    command: EventoActividadCommand,
  ): Observable<EventoActividadDto> {
    const { actividadUuid: _actividadUuid, ...payload } = command;

    return this.http.put<EventoActividadDto>(
      crearApiUrl(API_ROUTES.portalProfesor.actualizarEventoActividad(eventoUuid)),
      payload,
      { context: this.contextoMutacion('Evento actualizado') },
    );
  }

  obtenerEvento(eventoUuid: string): Observable<EventoActividadDto> {
    return this.http.get<EventoActividadDto>(
      crearApiUrl(API_ROUTES.portalProfesor.obtenerEventoActividad(eventoUuid)),
      { context: this.contextoLectura('Evento') },
    );
  }

  eliminarEvento(eventoUuid: string): Observable<void> {
    return this.http.delete<void>(
      crearApiUrl(API_ROUTES.portalProfesor.eliminarEventoActividad(eventoUuid)),
      { context: this.contextoMutacion('Evento dado de baja') },
    );
  }

  paginarAsistencias(
    payload: PaginarAsistenciasProfesorPayload,
  ): Observable<PaginaAsistenciasActividadDto> {
    return this.http.post<PaginaAsistenciasActividadDto>(
      crearApiUrl(API_ROUTES.portalProfesor.paginarAsistencias),
      payload,
      { context: this.contextoLectura('Historial de asistencias') },
    );
  }

  obtenerPlanillaAsistencia(slotUuid: string): Observable<readonly AsistenciaProfesorItemDto[]> {
    return this.http
      .get<PlanillaAsistenciaProfesorDto>(
        crearApiUrl(API_ROUTES.portalProfesor.obtenerPlanillaAsistencia(slotUuid)),
        { context: this.contextoLectura('Asistencia') },
      )
      .pipe(
        map((planilla) =>
          planilla.alumnos.map((alumno) => ({
            memberUuid: alumno.memberUuid,
            nombre: alumno.memberNombre,
            apellido: alumno.memberApellido,
            estado: alumno.estado,
          })),
        ),
      );
  }

  guardarAsistencia(
    slotUuid: string,
    payload: GuardarAsistenciaProfesorPayload,
  ): Observable<PlanillaAsistenciaProfesorDto> {
    return this.http.put<PlanillaAsistenciaProfesorDto>(
      crearApiUrl(API_ROUTES.portalProfesor.guardarAsistencia(slotUuid)),
      payload,
      { context: this.contextoMutacion('Asistencia actualizada') },
    );
  }

  private contextoLectura(titulo: string): HttpContext {
    return new HttpContext().set(MOSTRAR_TOAST_ERROR, { titulo });
  }

  private contextoMutacion(titulo: string): HttpContext {
    return new HttpContext()
      .set(MOSTRAR_TOAST_EXITO, { titulo })
      .set(MOSTRAR_TOAST_ERROR, { titulo: 'Portal profesor' });
  }
}
