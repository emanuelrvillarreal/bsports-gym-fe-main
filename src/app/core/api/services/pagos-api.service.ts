import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_ROUTES } from '../api-routes';
import { crearApiUrl } from '../api-url';
import { PagoDetalleDto } from '../interfaces/pagos.interfaces';

@Injectable({ providedIn: 'root' })
export class PagosApiService {
  private readonly http = inject(HttpClient);

  obtenerPorReferenciaExterna(referenciaExterna: string): Observable<PagoDetalleDto> {
    return this.http.get<PagoDetalleDto>(
      crearApiUrl(API_ROUTES.pagos.obtenerPorReferenciaExterna(referenciaExterna)),
    );
  }
}
