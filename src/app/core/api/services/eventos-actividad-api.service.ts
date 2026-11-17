import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  MOSTRAR_TOAST_ERROR,
  MOSTRAR_TOAST_EXITO,
} from '../../interceptors/context/http-toast-context';
import { API_ROUTES } from '../api-routes';
import { crearApiUrl } from '../api-url';
import {
  EventoActividadCommand,
  EventoActividadDto,
  PaginaEventosActividadDto,
  PaginarEventosActividadPayload,
} from '../interfaces/actividades.interfaces';

@Injectable({ providedIn: 'root' })
export class EventosActividadApiService {
  private readonly http = inject(HttpClient);

  crear(command: EventoActividadCommand): Observable<EventoActividadDto> {
    return this.http.post<EventoActividadDto>(
      crearApiUrl(API_ROUTES.eventosActividad.crear),
      command,
      { context: this.contextoMutacion('Evento creado') },
    );
  }

  actualizar(eventoUuid: string, command: EventoActividadCommand): Observable<EventoActividadDto> {
    const { actividadUuid: _actividadUuid, ...payload } = command;

    return this.http.put<EventoActividadDto>(
      crearApiUrl(API_ROUTES.eventosActividad.actualizar(eventoUuid)),
      payload,
      { context: this.contextoMutacion('Evento actualizado') },
    );
  }

  obtenerDetalle(eventoUuid: string): Observable<EventoActividadDto> {
    return this.http.get<EventoActividadDto>(
      crearApiUrl(API_ROUTES.eventosActividad.obtenerDetalle(eventoUuid)),
      { context: this.contextoConsulta() },
    );
  }

  cambiarEstado(
    eventoUuid: string,
    estado: EventoActividadDto['estado'],
  ): Observable<EventoActividadDto> {
    return this.http.post<EventoActividadDto>(
      crearApiUrl(API_ROUTES.eventosActividad.cambiarEstado(eventoUuid)),
      { estado },
      {
        context: this.contextoMutacion(
          estado === 'CANCELADO' ? 'Evento cancelado' : 'Evento confirmado',
        ),
      },
    );
  }

  /** Conserva la acción actual de la interfaz como atajo explícito. */
  cancelar(eventoUuid: string): Observable<EventoActividadDto> {
    return this.cambiarEstado(eventoUuid, 'CANCELADO');
  }

  eliminar(eventoUuid: string): Observable<void> {
    return this.http.delete<void>(crearApiUrl(API_ROUTES.eventosActividad.eliminar(eventoUuid)), {
      context: this.contextoMutacion('Evento dado de baja'),
    });
  }

  paginar(command: PaginarEventosActividadPayload): Observable<PaginaEventosActividadDto> {
    return this.http.post<PaginaEventosActividadDto>(
      crearApiUrl(API_ROUTES.eventosActividad.paginar),
      command,
      { context: this.contextoConsulta() },
    );
  }

  private contextoConsulta(): HttpContext {
    return new HttpContext().set(MOSTRAR_TOAST_ERROR, { titulo: 'Eventos' });
  }

  private contextoMutacion(titulo: string): HttpContext {
    return this.contextoConsulta().set(MOSTRAR_TOAST_EXITO, { titulo });
  }
}
