import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { conCompanyUuid } from '../../interceptors/context/http-headers-context';
import {
  MOSTRAR_TOAST_ERROR,
  MOSTRAR_TOAST_EXITO,
} from '../../interceptors/context/http-toast-context';
import { API_ROUTES } from '../api-routes';
import { crearApiUrl } from '../api-url';
import {
  ActualizarAdministradorClubPayload,
  AdministradorClubDto,
  AdministradoresClubPaginateRequest,
  AdministradoresClubPaginateResponse,
  CrearAdministradorClubPayload,
} from '../interfaces/administradores-club.interfaces';

@Injectable({ providedIn: 'root' })
export class AdministradoresClubApiService {
  private readonly http = inject(HttpClient);

  paginar(
    companyUuid: string,
    payload: AdministradoresClubPaginateRequest,
  ): Observable<AdministradoresClubPaginateResponse> {
    return this.http.post<AdministradoresClubPaginateResponse>(
      crearApiUrl(API_ROUTES.administradoresClub.paginar),
      payload,
      {
        context: this.crearContexto(companyUuid).set(MOSTRAR_TOAST_ERROR, {
          titulo: 'Administradores',
        }),
      },
    );
  }

  crear(
    companyUuid: string,
    payload: CrearAdministradorClubPayload,
  ): Observable<AdministradorClubDto> {
    return this.http.post<AdministradorClubDto>(
      crearApiUrl(API_ROUTES.administradoresClub.crear),
      payload,
      {
        context: this.crearContexto(companyUuid)
          .set(MOSTRAR_TOAST_EXITO, { titulo: 'Administrador creado' })
          .set(MOSTRAR_TOAST_ERROR, { titulo: 'Administradores' }),
      },
    );
  }

  actualizar(
    companyUuid: string,
    userUuid: string,
    payload: ActualizarAdministradorClubPayload,
  ): Observable<AdministradorClubDto> {
    return this.http.put<AdministradorClubDto>(
      crearApiUrl(API_ROUTES.administradoresClub.actualizar(userUuid.trim())),
      payload,
      {
        context: this.crearContexto(companyUuid)
          .set(MOSTRAR_TOAST_EXITO, { titulo: 'Administrador actualizado' })
          .set(MOSTRAR_TOAST_ERROR, { titulo: 'Administradores' }),
      },
    );
  }

  private crearContexto(companyUuid: string): HttpContext {
    return conCompanyUuid(new HttpContext(), companyUuid.trim());
  }
}
