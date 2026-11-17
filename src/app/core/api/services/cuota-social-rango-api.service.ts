import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { AuthSessionService } from '../../global-services/services/auth-session.service';
import { conCompanyUuid } from '../../interceptors/context/http-headers-context';
import { MOSTRAR_TOAST_ERROR, MOSTRAR_TOAST_EXITO } from '../../interceptors/context/http-toast-context';
import { API_ROUTES } from '../api-routes';
import { crearApiUrl } from '../api-url';
import {
  CuotaSocialRangoDto,
  GuardarCuotaSocialRangoCommand,
  PaginaCuotasSocialesRangoDto,
  PaginarCuotasSocialesRangoCommand,
} from '../interfaces/cuotas-sociales-rango.interfaces';

@Injectable({ providedIn: 'root' })
export class CuotaSocialRangoApiService {
  private readonly http = inject(HttpClient);
  private readonly authSessionService = inject(AuthSessionService);

  paginar(command: PaginarCuotasSocialesRangoCommand): Observable<PaginaCuotasSocialesRangoDto> {
    return this.http.post<PaginaCuotasSocialesRangoDto>(
      crearApiUrl(API_ROUTES.cuotasSocialesRango.paginar),
      command,
      { context: this.contextoConsulta() },
    );
  }

  crear(command: GuardarCuotaSocialRangoCommand): Observable<CuotaSocialRangoDto> {
    return this.http.post<CuotaSocialRangoDto>(
      crearApiUrl(API_ROUTES.cuotasSocialesRango.crear),
      command,
      { context: this.contextoMutacion('Categoría de cuota social creada') },
    );
  }

  actualizar(
    cuotaSocialRangoUuid: string,
    command: GuardarCuotaSocialRangoCommand,
  ): Observable<CuotaSocialRangoDto> {
    return this.http.put<CuotaSocialRangoDto>(
      crearApiUrl(API_ROUTES.cuotasSocialesRango.actualizar(cuotaSocialRangoUuid)),
      command,
      { context: this.contextoMutacion('Categoría de cuota social actualizada') },
    );
  }

  eliminar(cuotaSocialRangoUuid: string): Observable<void> {
    return this.http.delete<void>(
      crearApiUrl(API_ROUTES.cuotasSocialesRango.eliminar(cuotaSocialRangoUuid)),
      { context: this.contextoMutacion('Categoría de cuota social eliminada') },
    );
  }

  private contextoConsulta(): HttpContext {
    return this.crearContextoCompany().set(MOSTRAR_TOAST_ERROR, {
      titulo: 'Cuota social',
    });
  }

  private contextoMutacion(titulo: string): HttpContext {
    return this.contextoConsulta().set(MOSTRAR_TOAST_EXITO, { titulo });
  }

  private crearContextoCompany(): HttpContext {
    const companyUuid = this.authSessionService.obtenerCompanyUuid();
    return companyUuid ? conCompanyUuid(new HttpContext(), companyUuid) : new HttpContext();
  }
}
