import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { AuthSessionService } from '../../global-services/services/auth-session.service';
import { conCompanyUuid } from '../../interceptors/context/http-headers-context';
import {
  MOSTRAR_TOAST_ERROR,
  MOSTRAR_TOAST_EXITO,
} from '../../interceptors/context/http-toast-context';
import { API_ROUTES } from '../api-routes';
import { crearApiUrl } from '../api-url';
import {
  AsignarDescuentoPayload,
  DescuentoAsignadoDto,
  DescuentoDto,
  DescuentosPaginateRequest,
  DescuentosPaginateResponse,
  FinalizarDescuentoPayload,
  GuardarDescuentoPayload,
  MemberDescuentosPaginateResponse,
} from '../interfaces/descuentos.interfaces';

@Injectable({ providedIn: 'root' })
export class DescuentosApiService {
  private readonly http = inject(HttpClient);
  private readonly authSessionService = inject(AuthSessionService);

  paginarCatalogo(payload: DescuentosPaginateRequest): Observable<DescuentosPaginateResponse> {
    return this.http.post<DescuentosPaginateResponse>(
      crearApiUrl(API_ROUTES.descuentos.paginarCatalogo),
      payload,
      { context: this.contextoConsulta() },
    );
  }

  crear(payload: GuardarDescuentoPayload): Observable<DescuentoDto> {
    return this.http.post<DescuentoDto>(crearApiUrl(API_ROUTES.descuentos.crear), payload, {
      context: this.contextoMutacion('Descuento creado'),
    });
  }

  actualizar(descuentoUuid: string, payload: GuardarDescuentoPayload): Observable<DescuentoDto> {
    return this.http.put<DescuentoDto>(
      crearApiUrl(API_ROUTES.descuentos.actualizar(descuentoUuid)),
      payload,
      { context: this.contextoMutacion('Descuento actualizado') },
    );
  }

  eliminar(descuentoUuid: string): Observable<void> {
    return this.http.delete<void>(crearApiUrl(API_ROUTES.descuentos.eliminar(descuentoUuid)), {
      context: this.contextoMutacion('Descuento eliminado'),
    });
  }

  paginarPorSocio(
    payload: DescuentosPaginateRequest,
  ): Observable<MemberDescuentosPaginateResponse> {
    return this.http.post<MemberDescuentosPaginateResponse>(
      crearApiUrl(API_ROUTES.descuentos.paginarPorSocio),
      payload,
      { context: this.contextoConsulta() },
    );
  }

  asignarASocio(
    memberUuid: string,
    payload: AsignarDescuentoPayload,
  ): Observable<DescuentoAsignadoDto> {
    return this.http.post<DescuentoAsignadoDto>(
      crearApiUrl(API_ROUTES.descuentos.asignarASocio(memberUuid)),
      payload,
      { context: this.contextoMutacion('Descuento asignado al socio') },
    );
  }

  eliminarAsignacionSocio(asignacionUuid: string): Observable<void> {
    return this.http.delete<void>(
      crearApiUrl(API_ROUTES.descuentos.eliminarAsignacionSocio(asignacionUuid)),
      { context: this.contextoMutacion('Asignación de descuento eliminada') },
    );
  }

  finalizarAsignacionSocio(
    asignacionUuid: string,
    payload: FinalizarDescuentoPayload,
  ): Observable<DescuentoAsignadoDto> {
    return this.http.put<DescuentoAsignadoDto>(
      crearApiUrl(API_ROUTES.descuentos.finalizarAsignacionSocio(asignacionUuid)),
      payload,
      { context: this.contextoMutacion('Asignación de descuento finalizada') },
    );
  }

  asignarAActividad(
    inscripcionActividadUuid: string,
    payload: AsignarDescuentoPayload,
  ): Observable<DescuentoAsignadoDto> {
    return this.http.post<DescuentoAsignadoDto>(
      crearApiUrl(API_ROUTES.descuentos.asignarAActividad(inscripcionActividadUuid)),
      payload,
      { context: this.contextoMutacion('Descuento asignado a la actividad') },
    );
  }

  eliminarAsignacionActividad(asignacionUuid: string): Observable<void> {
    return this.http.delete<void>(
      crearApiUrl(API_ROUTES.descuentos.eliminarAsignacionActividad(asignacionUuid)),
      { context: this.contextoMutacion('Asignación de descuento eliminada') },
    );
  }

  finalizarAsignacionActividad(
    asignacionUuid: string,
    payload: FinalizarDescuentoPayload,
  ): Observable<DescuentoAsignadoDto> {
    return this.http.put<DescuentoAsignadoDto>(
      crearApiUrl(API_ROUTES.descuentos.finalizarAsignacionActividad(asignacionUuid)),
      payload,
      { context: this.contextoMutacion('Asignación de descuento finalizada') },
    );
  }

  private contextoConsulta(): HttpContext {
    return this.crearContextoCompany().set(MOSTRAR_TOAST_ERROR, { titulo: 'Descuentos' });
  }

  private contextoMutacion(titulo: string): HttpContext {
    return this.contextoConsulta()
      .set(MOSTRAR_TOAST_EXITO, { titulo })
      .set(MOSTRAR_TOAST_ERROR, { titulo: 'Descuentos', fondoPeligro4xx: true });
  }

  private crearContextoCompany(): HttpContext {
    const companyUuid = this.authSessionService.obtenerCompanyUuid();
    return companyUuid ? conCompanyUuid(new HttpContext(), companyUuid) : new HttpContext();
  }
}
