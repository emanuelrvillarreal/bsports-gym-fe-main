import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { AuthSessionService } from '../../global-services/services/auth-session.service';
import { conCompanyUuid } from '../../interceptors/context/http-headers-context';
import { MOSTRAR_TOAST_ERROR, MOSTRAR_TOAST_EXITO } from '../../interceptors/context/http-toast-context';
import { API_ROUTES } from '../api-routes';
import { crearApiUrl } from '../api-url';
import {
  EjemploEntidadApiDto,
  EjemploEntidadFormPayload,
  EjemploEntidadPaginateResponse,
} from '../interfaces/ejemplo-entidad.interfaces';
import { PaginateRequest } from '../interfaces/paginate.interface';

/**
 * Servicio de referencia para crear APIs de dominio en apps derivadas del template.
 * Copiar este archivo, renombrar entidad/rutas y registrar en `API_ROUTES`.
 */
@Injectable({
  providedIn: 'root',
})
export class EjemploEntidadApiService {
  private readonly http = inject(HttpClient);
  private readonly authSessionService = inject(AuthSessionService);

  listar(payload?: Partial<PaginateRequest>): Observable<EjemploEntidadPaginateResponse> {
    return this.http.post<EjemploEntidadPaginateResponse>(
      crearApiUrl(API_ROUTES.ejemploEntidad.paginar),
      {
        page: this.normalizarPage(payload?.page),
        size: payload?.size ?? 10,
        parametros: payload?.parametros ?? [],
        filtros: payload?.filtros ?? [],
        relaciones: payload?.relaciones ?? [],
        ordenes: payload?.ordenes ?? [],
      } satisfies PaginateRequest,
      {
        context: this.crearContextoCompany(),
      },
    );
  }

  guardar(payload: EjemploEntidadFormPayload): Observable<EjemploEntidadApiDto> {
    return this.http.post<EjemploEntidadApiDto>(
      crearApiUrl(API_ROUTES.ejemploEntidad.guardar),
      payload,
      {
        context: this.crearContextoCompany()
          .set(MOSTRAR_TOAST_EXITO, { titulo: 'Ejemplo' })
          .set(MOSTRAR_TOAST_ERROR, { titulo: 'Ejemplo' }),
      },
    );
  }

  eliminar(uuid: string): Observable<void> {
    return this.http.delete<unknown>(crearApiUrl(API_ROUTES.ejemploEntidad.eliminar(uuid)), {
      context: this.crearContextoCompany()
        .set(MOSTRAR_TOAST_EXITO, { titulo: 'Ejemplo' })
        .set(MOSTRAR_TOAST_ERROR, { titulo: 'Ejemplo' }),
    }).pipe(
      map(() => void 0),
    );
  }

  private normalizarPage(page?: number): number {
    return Math.max(1, page ?? 1);
  }

  private crearContextoCompany(): HttpContext {
    const companyUuid = this.authSessionService.obtenerCompanyUuid();
    return companyUuid
      ? conCompanyUuid(new HttpContext(), companyUuid)
      : new HttpContext();
  }
}
