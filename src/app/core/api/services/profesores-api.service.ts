import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { MOSTRAR_TOAST_ERROR, MOSTRAR_TOAST_EXITO } from '../../interceptors/context/http-toast-context';
import { API_ROUTES } from '../api-routes';
import { crearApiUrl } from '../api-url';
import {
  ActualizarUsuarioInternoPayload,
  CrearUsuarioInternoPayload,
  PaginaUsuariosInternosResponse,
  PaginarProfesoresPayload,
  ProfesorDto,
} from '../interfaces/usuarios-internos.interfaces';

@Injectable({ providedIn: 'root' })
export class ProfesoresApiService {
  private readonly http = inject(HttpClient);

  paginar(payload: PaginarProfesoresPayload): Observable<PaginaUsuariosInternosResponse<ProfesorDto>> {
    return this.http.post<PaginaUsuariosInternosResponse<ProfesorDto>>(crearApiUrl(API_ROUTES.profesores.paginar), payload, {
      context: new HttpContext().set(MOSTRAR_TOAST_ERROR, { titulo: 'Profesores' }),
    });
  }

  crear(payload: CrearUsuarioInternoPayload): Observable<ProfesorDto> {
    return this.http.post<ProfesorDto>(crearApiUrl(API_ROUTES.profesores.crear), payload, {
      context: this.contextoMutacion('Profesor creado'),
    });
  }

  actualizar(
    profesorUuid: string,
    payload: ActualizarUsuarioInternoPayload,
  ): Observable<ProfesorDto> {
    return this.http.put<ProfesorDto>(
      crearApiUrl(API_ROUTES.profesores.actualizar(profesorUuid)),
      payload,
      { context: this.contextoMutacion('Profesor actualizado') },
    );
  }

  darDeBaja(profesorUuid: string): Observable<void> {
    return this.http.delete<unknown>(crearApiUrl(API_ROUTES.profesores.eliminar(profesorUuid)), {
      context: this.contextoMutacion('Profesor dado de baja'),
    }).pipe(map(() => void 0));
  }

  private contextoMutacion(titulo: string): HttpContext {
    return new HttpContext()
      .set(MOSTRAR_TOAST_EXITO, { titulo })
      .set(MOSTRAR_TOAST_ERROR, { titulo: 'Profesores' });
  }
}
