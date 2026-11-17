import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { crearApiUrl } from '../api-url';
import { PagosApiService } from './pagos-api.service';

describe('PagosApiService', () => {
  let api: PagosApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), PagosApiService],
    });
    api = TestBed.inject(PagosApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('obtiene el pago codificando la referencia externa en la URL', () => {
    api.obtenerPorReferenciaExterna('referencia con espacios/1').subscribe((pago) => {
      expect(pago.paymentId).toBe('173629676192');
    });

    const request = http.expectOne(crearApiUrl('pago/referencia%20con%20espacios%2F1'));
    expect(request.request.method).toBe('GET');
    request.flush({
      estado: 'APROBADO',
      montoTotal: 15000,
      paymentId: '173629676192',
      items: [],
    });
  });
});
