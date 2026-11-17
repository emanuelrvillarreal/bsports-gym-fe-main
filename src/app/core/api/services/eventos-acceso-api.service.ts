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
  EventoAccesoAltaCommand,
  EventoAccesoCobroCommand,
  EventoAccesoCobroResultDto,
  EventoAccesoDetalleDto,
  EventoAccesoEdicionCommand,
  EventoAccesoHistorialPaginateRequest,
  EventoAccesoHistorialPaginateResponse,
  EventoAccesoPaginateRequest,
  EventoAccesoPaginateResponse,
  EventoAccesoScanCommand,
  EventoAccesoScanResultDto,
} from '../interfaces/eventos-acceso.interfaces';

export interface FeedbackEventoAccesoOptions {
  readonly mostrarToastError?: boolean;
  readonly mostrarToastExito?: boolean;
}

export type EscanearEventoAccesoOptions = FeedbackEventoAccesoOptions;

@Injectable({ providedIn: 'root' })
export class EventosAccesoApiService {
  private readonly http = inject(HttpClient);

  crear(
    command: EventoAccesoAltaCommand,
    options: FeedbackEventoAccesoOptions = {},
  ): Observable<EventoAccesoDetalleDto> {
    return this.http.post<EventoAccesoDetalleDto>(
      crearApiUrl(API_ROUTES.eventosAcceso.crear),
      command,
      { context: this.contextoMutacion('Evento de acceso creado', options) },
    );
  }

  paginar(
    command: EventoAccesoPaginateRequest = {},
    options: FeedbackEventoAccesoOptions = {},
  ): Observable<EventoAccesoPaginateResponse> {
    return this.http.post<EventoAccesoPaginateResponse>(
      crearApiUrl(API_ROUTES.eventosAcceso.paginate),
      command,
      { context: this.contextoConsulta(options.mostrarToastError !== false) },
    );
  }

  obtenerDetalle(
    eventoAccesoUuid: string,
    options: FeedbackEventoAccesoOptions = {},
  ): Observable<EventoAccesoDetalleDto> {
    return this.http.get<EventoAccesoDetalleDto>(
      crearApiUrl(API_ROUTES.eventosAcceso.detalle(eventoAccesoUuid)),
      { context: this.contextoConsulta(options.mostrarToastError !== false) },
    );
  }

  actualizar(
    eventoAccesoUuid: string,
    command: EventoAccesoEdicionCommand,
    options: FeedbackEventoAccesoOptions = {},
  ): Observable<EventoAccesoDetalleDto> {
    return this.http.put<EventoAccesoDetalleDto>(
      crearApiUrl(API_ROUTES.eventosAcceso.actualizar(eventoAccesoUuid)),
      command,
      { context: this.contextoMutacion('Evento de acceso actualizado', options) },
    );
  }

  eliminar(eventoAccesoUuid: string, options: FeedbackEventoAccesoOptions = {}): Observable<void> {
    return this.http.delete<void>(
      crearApiUrl(API_ROUTES.eventosAcceso.eliminar(eventoAccesoUuid)),
      { context: this.contextoMutacion('Evento de acceso dado de baja', options) },
    );
  }

  escanear(
    eventoAccesoUuid: string,
    command: EventoAccesoScanCommand,
    options: EscanearEventoAccesoOptions = {},
  ): Observable<EventoAccesoScanResultDto> {
    return this.http.post<EventoAccesoScanResultDto>(
      crearApiUrl(API_ROUTES.eventosAcceso.escanearQr(eventoAccesoUuid)),
      command,
      {
        context: this.contextoConsulta(options.mostrarToastError !== false),
      },
    );
  }

  cobrar(
    eventoAccesoUuid: string,
    command: EventoAccesoCobroCommand,
    options: FeedbackEventoAccesoOptions = {},
  ): Observable<EventoAccesoCobroResultDto> {
    return this.http.post<EventoAccesoCobroResultDto>(
      crearApiUrl(API_ROUTES.eventosAcceso.cobrar(eventoAccesoUuid)),
      command,
      { context: this.contextoMutacion('Cobro de entrada registrado', options) },
    );
  }

  paginarHistorial(
    eventoAccesoUuid: string,
    command: EventoAccesoHistorialPaginateRequest = {},
    options: FeedbackEventoAccesoOptions = {},
  ): Observable<EventoAccesoHistorialPaginateResponse> {
    return this.http.post<EventoAccesoHistorialPaginateResponse>(
      crearApiUrl(API_ROUTES.eventosAcceso.paginarHistorial(eventoAccesoUuid)),
      command,
      { context: this.contextoConsulta(options.mostrarToastError !== false) },
    );
  }

  private contextoConsulta(mostrarToastError = true): HttpContext {
    const contexto = new HttpContext();
    return mostrarToastError
      ? contexto.set(MOSTRAR_TOAST_ERROR, { titulo: 'Eventos de acceso' })
      : contexto;
  }

  private contextoMutacion(titulo: string, options: FeedbackEventoAccesoOptions = {}): HttpContext {
    const contexto = this.contextoConsulta(options.mostrarToastError !== false);
    return options.mostrarToastExito === false
      ? contexto
      : contexto.set(MOSTRAR_TOAST_EXITO, { titulo });
  }
}
