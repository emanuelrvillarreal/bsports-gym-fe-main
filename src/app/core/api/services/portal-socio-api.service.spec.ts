import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { MOSTRAR_TOAST_ERROR, MOSTRAR_TOAST_EXITO } from '../../interceptors/context/http-toast-context';
import { crearApiUrl } from '../api-url';
import { PortalSocioApiService } from './portal-socio-api.service';

describe('PortalSocioApiService', () => {
  let api: PortalSocioApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), PortalSocioApiService] });
    api = TestBed.inject(PortalSocioApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('reserva un amenity del titular y recibe el QR de Mercado Pago', () => {
    const payload = { fechaDesde: '2026-08-28T18:00:00', fechaHasta: '2026-08-28T19:00:00', tipoPago: 'SENA' as const };
    api.reservarAmenity('amenity-1', payload).subscribe((resultado) => expect(resultado.reservaUuid).toBe('reserva-1'));

    const request = http.expectOne(crearApiUrl('portal/amenities/amenity-1/reservar'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    request.flush({ reservaUuid: 'reserva-1', tipoCobro: 'SENA', monto: 3000, concepto: 'Seña reserva', movimientoUuid: null, qr: 'qr-base64' });
  });

  it('regenera el checkout de una reserva propia sin crear otra reserva', () => {
    api.reintentarPagoReservaAmenity('reserva-1', { tipoPago: 'TOTAL' }).subscribe();

    const request = http.expectOne(crearApiUrl('portal/amenities/reservas/reserva-1/pago'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ tipoPago: 'TOTAL' });
    request.flush({ reservaUuid: 'reserva-1', tipoCobro: 'TOTAL', monto: 9000, concepto: 'Reserva', movimientoUuid: null, qr: 'qr-base64' });
  });
  it('inscribe al titular en una actividad con memberUuid nulo', () => {
    const payload = { actividadUuid: 'actividad-1', memberUuid: null };
    api.inscribirActividad(payload).subscribe((resultado) => {
      expect(resultado.inscripcionUuid).toBe('inscripcion-1');
      expect(resultado.memberNombre).toBe('Juana');
    });

    const request = http.expectOne(crearApiUrl('portal/member/actividad/inscripcion'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    expect(request.request.context.get(MOSTRAR_TOAST_EXITO)).toBeNull();
    expect(request.request.context.get(MOSTRAR_TOAST_ERROR)).toBeNull();
    request.flush({
      inscripcionUuid: 'inscripcion-1',
      actividadUuid: 'actividad-1',
      actividadNombre: 'Yoga',
      memberUuid: 'titular-1',
      memberNombre: 'Juana',
      memberApellido: 'Perez',
      fechaInscripcion: '26/08/2026',
      actividadCompleta: false,
      cuotaGenerada: true,
      cuotaUuid: 'cuota-1',
      cuotaAdvertencia: null,
    });
  });

  it('envía el UUID del familiar elegido sin modificar el payload', () => {
    const payload = { actividadUuid: 'actividad-1', memberUuid: 'familiar-1' };
    api.inscribirActividad(payload).subscribe();

    const request = http.expectOne(crearApiUrl('portal/member/actividad/inscripcion'));
    expect(request.request.body).toEqual(payload);
    request.flush({
      inscripcionUuid: 'inscripcion-2',
      actividadUuid: 'actividad-1',
      actividadNombre: 'Yoga',
      memberUuid: 'familiar-1',
      memberNombre: 'Lucas',
      memberApellido: 'Perez',
      fechaInscripcion: '26/08/2026',
      actividadCompleta: false,
      cuotaGenerada: false,
      cuotaUuid: null,
      cuotaAdvertencia: 'La cuota se generará en el próximo ciclo.',
    });
  });

  it('lista las inscripciones propias del socio logueado', () => {
    const inscripciones = [
      {
        inscripcionUuid: 'inscripcion-1',
        actividadUuid: 'actividad-1',
        actividadNombre: 'Yoga',
        memberUuid: 'titular-1',
        memberNombre: 'Juana',
        memberApellido: 'Perez',
        fechaInscripcion: '26/08/2026',
        actividadCompleta: false,
        cuotaGenerada: false,
        cuotaUuid: null,
        cuotaAdvertencia: null,
      },
    ];
    api.listarMisInscripcionesActividades().subscribe((resultado) => {
      expect(resultado).toEqual(inscripciones);
    });

    const request = http.expectOne(crearApiUrl('portal/member/actividad/inscripcion'));
    expect(request.request.method).toBe('GET');
    expect(request.request.context.get(MOSTRAR_TOAST_ERROR)).toEqual({ titulo: 'Mis actividades' });
    request.flush(inscripciones);
  });

  it('lista las inscripciones de un familiar del grupo', () => {
    api.listarInscripcionesActividadesFamiliar('familiar-1').subscribe((resultado) => {
      expect(resultado).toEqual([]);
    });

    const request = http.expectOne(crearApiUrl('portal/member/actividad/inscripcion/familiar/familiar-1'));
    expect(request.request.method).toBe('GET');
    expect(request.request.context.get(MOSTRAR_TOAST_ERROR)).toEqual({ titulo: 'Actividades del familiar' });
    request.flush([]);
  });
});
