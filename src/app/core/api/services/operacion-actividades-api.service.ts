import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { MOSTRAR_TOAST_ERROR } from '../../interceptors/context/http-toast-context';
import { API_ROUTES } from '../api-routes';
import { crearApiUrl } from '../api-url';
import {
  PaginaAsistenciasActividadDto,
  PaginarAsistenciasActividadCommand,
} from '../interfaces/actividades.interfaces';
import {
  CalendarioConsultaPayload,
  CalendarioSlotDto,
} from '../interfaces/portal.interfaces';

@Injectable({ providedIn: 'root' })
export class OperacionActividadesApiService {
  private readonly http = inject(HttpClient);

  consultarCalendario(
    command: CalendarioConsultaPayload,
  ): Observable<readonly CalendarioSlotDto[]> {
    return this.http.post<readonly CalendarioSlotDto[]>(
      crearApiUrl(API_ROUTES.calendario.consultar),
      command,
      { context: this.contextoConsulta() },
    );
  }

  paginarAsistencias(
    command: PaginarAsistenciasActividadCommand,
  ): Observable<PaginaAsistenciasActividadDto> {
    return this.http.post<PaginaAsistenciasActividadDto>(
      crearApiUrl(API_ROUTES.asistenciaActividad.paginar),
      command,
      { context: this.contextoConsulta() },
    );
  }

  private contextoConsulta(): HttpContext {
    return new HttpContext().set(MOSTRAR_TOAST_ERROR, {
      titulo: 'Operación de actividades',
    });
  }
}
