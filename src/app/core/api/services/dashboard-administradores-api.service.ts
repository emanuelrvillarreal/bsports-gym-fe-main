import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { MOSTRAR_TOAST_ERROR } from '../../interceptors/context/http-toast-context';
import { API_ROUTES } from '../api-routes';
import { crearApiUrl } from '../api-url';
import { DashboardAdministradoresResumenDto } from '../interfaces/dashboard-administradores.interfaces';

@Injectable({ providedIn: 'root' })
export class DashboardAdministradoresApiService {
  private readonly http = inject(HttpClient);

  // TODO(BACKEND-PENDIENTE): endpoint provisional.
  // Reemplazar cuando se publique el contrato definitivo en OpenAPI.
  obtenerResumen(): Observable<DashboardAdministradoresResumenDto> {
    return this.http.get<DashboardAdministradoresResumenDto>(
      crearApiUrl(API_ROUTES.dashboardAdministradores.resumen),
      {
        context: new HttpContext().set(MOSTRAR_TOAST_ERROR, { titulo: 'Dashboard' }),
      },
    );
  }
}
