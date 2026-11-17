import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { MOSTRAR_TOAST_ERROR, MOSTRAR_TOAST_EXITO } from '../../interceptors/context/http-toast-context';
import { API_ROUTES } from '../api-routes';
import { crearApiUrl } from '../api-url';
import {
  AltaPersonalPayload,
  ListadoPersonalDto,
  PersonaEncontradaDto,
  RolesPersonal,
} from '../interfaces/personal.interfaces';

@Injectable({ providedIn: 'root' })
export class PersonalApiService {
  private readonly http = inject(HttpClient);

  listar(search = ''): Observable<ListadoPersonalDto> {
    const params = search.trim() ? new HttpParams().set('search', search.trim()) : undefined;
    return this.http.get<ListadoPersonalDto>(crearApiUrl(API_ROUTES.personal.listar), {
      params,
      context: new HttpContext().set(MOSTRAR_TOAST_ERROR, { titulo: 'Personal' }),
    });
  }

  buscar(q: string): Observable<PersonaEncontradaDto> {
    return this.http.get<PersonaEncontradaDto>(crearApiUrl(API_ROUTES.personal.buscar), {
      params: new HttpParams().set('q', q.trim()),
    });
  }

  crear(payload: AltaPersonalPayload): Observable<ListadoPersonalDto> {
    return this.http.post<ListadoPersonalDto>(crearApiUrl(API_ROUTES.personal.crear), payload, {
      context: new HttpContext()
        .set(MOSTRAR_TOAST_EXITO, { titulo: 'Persona agregada al personal' })
        .set(MOSTRAR_TOAST_ERROR, { titulo: 'Personal' }),
    });
  }

  cambiarRoles(userUuid: string, roles: RolesPersonal): Observable<ListadoPersonalDto> {
    return this.http.put<ListadoPersonalDto>(crearApiUrl(API_ROUTES.personal.roles(userUuid)), roles, {
      context: new HttpContext()
        .set(MOSTRAR_TOAST_EXITO, { titulo: 'Roles actualizados' })
        .set(MOSTRAR_TOAST_ERROR, { titulo: 'Personal' }),
    });
  }
}
