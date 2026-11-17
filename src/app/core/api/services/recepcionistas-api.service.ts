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
  PaginarRecepcionistasPayload,
  RecepcionistaDto,
} from '../interfaces/usuarios-internos.interfaces';

@Injectable({ providedIn: 'root' })
export class RecepcionistasApiService {
  private readonly http = inject(HttpClient);

  paginar(payload: PaginarRecepcionistasPayload): Observable<PaginaUsuariosInternosResponse<RecepcionistaDto>> {
    return this.http.post<PaginaUsuariosInternosResponse<RecepcionistaDto>>(crearApiUrl(API_ROUTES.recepcionistas.paginar), payload, {
      context: new HttpContext().set(MOSTRAR_TOAST_ERROR, { titulo: 'Usuarios de recepción' }),
    });
  }

  crear(payload: CrearUsuarioInternoPayload): Observable<RecepcionistaDto> {
    return this.http.post<RecepcionistaDto>(crearApiUrl(API_ROUTES.recepcionistas.crear), payload, {
      context: this.contextoMutacion('Usuario de recepción creado'),
    });
  }

  actualizar(
    recepcionistaUuid: string,
    payload: ActualizarUsuarioInternoPayload,
  ): Observable<RecepcionistaDto> {
    return this.http.put<RecepcionistaDto>(
      crearApiUrl(API_ROUTES.recepcionistas.actualizar(recepcionistaUuid)),
      payload,
      { context: this.contextoMutacion('Usuario de recepción actualizado') },
    );
  }

  darDeBaja(recepcionistaUuid: string): Observable<void> {
    return this.http.delete<unknown>(crearApiUrl(API_ROUTES.recepcionistas.eliminar(recepcionistaUuid)), {
      context: this.contextoMutacion('Usuario de recepción dado de baja'),
    }).pipe(map(() => void 0));
  }

  private contextoMutacion(titulo: string): HttpContext {
    return new HttpContext()
      .set(MOSTRAR_TOAST_EXITO, { titulo })
      .set(MOSTRAR_TOAST_ERROR, { titulo: 'Usuarios de recepción' });
  }
}
