import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { crearApiUrl } from '../api-url';
import { AmenitiesApiService } from './amenities-api.service';

describe('AmenitiesApiService', () => {
  let api: AmenitiesApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), AmenitiesApiService],
    });
    api = TestBed.inject(AmenitiesApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('registra un cobro manual de seña con sus datos completos', () => {
    const command = {
      canalCobro: 'MANUAL' as const,
      monto: 1500,
      medioPago: 'EFECTIVO' as const,
      fecha: '2026-07-30',
      observaciones: 'Seña en recepción',
    };

    api.cobrarSena('reserva-1', command).subscribe();

    const request = http.expectOne(crearApiUrl('amenities/reservas/reserva-1/cobro-sena'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(command);
    request.flush({ tipoCobro: 'SENA', monto: 1500, concepto: 'Seña reserva' });
  });

  it('inicia Mercado Pago con el payload mínimo y conserva el QR recibido', () => {
    api.cobrarTotal('reserva-1', { canalCobro: 'MERCADO_PAGO' }).subscribe((resultado) => {
      expect(resultado.qr).toBe('qr-base64');
    });

    const request = http.expectOne(crearApiUrl('amenities/reservas/reserva-1/cobro-total'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ canalCobro: 'MERCADO_PAGO' });
    request.flush({ tipoCobro: 'TOTAL', monto: 3000, concepto: 'Reserva', qr: 'qr-base64' });
  });
});
