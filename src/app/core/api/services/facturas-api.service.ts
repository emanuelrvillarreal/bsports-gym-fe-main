import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { AuthSessionService } from '../../global-services/services/auth-session.service';
import { conCompanyUuid, sinCompanyUuid } from '../../interceptors/context/http-headers-context';
import {
  MOSTRAR_TOAST_ERROR,
} from '../../interceptors/context/http-toast-context';
import { API_ROUTES } from '../api-routes';
import { crearApiUrl } from '../api-url';
import {
  FacturasPaginateRequest,
  FacturasPaginateResponse,
  GenerarPagoFacturasPayload,
  PagoFacturasDto,
} from '../interfaces/facturas.interfaces';

@Injectable({ providedIn: 'root' })
export class FacturasApiService {
  private readonly http = inject(HttpClient);
  private readonly authSessionService = inject(AuthSessionService);

  paginar(payload: FacturasPaginateRequest): Observable<FacturasPaginateResponse> {
    const context = payload.companyUuid ? sinCompanyUuid() : this.crearContextoEmpresaActiva();

    return this.http.post<FacturasPaginateResponse>(
      crearApiUrl(API_ROUTES.facturas.paginar),
      payload,
      { context: context.set(MOSTRAR_TOAST_ERROR, { titulo: 'Facturas' }) },
    );
  }

  generarPago(payload: GenerarPagoFacturasPayload): Observable<PagoFacturasDto> {
    return this.http.post<PagoFacturasDto>(crearApiUrl(API_ROUTES.facturas.generarPago), payload, {
      context: this.crearContextoEmpresaActiva()
        .set(MOSTRAR_TOAST_ERROR, { titulo: 'Pago de factura', fondoPeligro4xx: true }),
    });
  }

  private crearContextoEmpresaActiva(): HttpContext {
    const companyUuid = this.authSessionService.obtenerCompanyUuid();
    return companyUuid ? conCompanyUuid(new HttpContext(), companyUuid) : new HttpContext();
  }
}
