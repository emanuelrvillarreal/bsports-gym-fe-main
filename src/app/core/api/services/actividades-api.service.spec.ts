import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { crearApiUrl } from '../api-url';
import { GuardarActividadPayload } from '../interfaces/actividades.interfaces';
import { ActividadesApiService } from './actividades-api.service';

describe('ActividadesApiService', () => {
  let api: ActividadesApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ActividadesApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(ActividadesApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('obtiene el detalle completo por UUID y normaliza las horas en array', () => {
    let horaInicio = '';
    let horaFin = '';
    api.obtenerDetalle('actividad-1').subscribe((actividad) => {
      horaInicio = actividad.horaInicio;
      horaFin = actividad.horaFin;
    });

    const request = httpTesting.expectOne(crearApiUrl('actividad/actividad-1'));
    expect(request.request.method).toBe('GET');
    request.flush({
      actividadUuid: 'actividad-1',
      nombre: 'Yoga',
      ubicacion: 'Sala 1',
      cupoMaximo: 20,
      diasSemana: 'LUNES',
      horaInicio: [18, 0],
      horaFin: [19, 30],
      importeCuota: 1000,
      completa: false,
      profesores: [],
      categoria: null,
      inscriptos: [],
    });

    expect(horaInicio).toBe('18:00');
    expect(horaFin).toBe('19:30');
  });

  it('envia profesorUuids dentro del PUT de actividad', () => {
    const payload: GuardarActividadPayload = {
      nombre: 'Yoga',
      ubicacion: 'Sala 1',
      horarios: [{ diaSemana: 'LUNES', horaInicio: '18:00:00', horaFin: '19:00:00', cupoMaximo: 20 }],
      importeCuota: 1000,
      diaVencimientoFijo: null,
      periodicidadCuota: 'MENSUAL',
      diasVencimientoCuota: 45,
      categoriaUuids: ['categoria-1'],
      profesorUuids: ['profesor-1'],
    };

    api.actualizar('actividad-1', payload).subscribe();

    const request = httpTesting.expectOne(crearApiUrl('actividad/actividad-1'));
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(payload);
    request.flush({
      actividadUuid: 'actividad-1',
      ...payload,
      completa: false,
      profesores: [],
      categoria: null,
      inscriptos: [],
    });
  });

  it('envía días de vencimiento dentro del POST de actividad', () => {
    const payload: GuardarActividadPayload = {
      nombre: 'Yoga',
      ubicacion: 'Sala 1',
      horarios: [{ diaSemana: 'LUNES', horaInicio: '18:00:00', horaFin: '19:00:00', cupoMaximo: 20 }],
      importeCuota: 1000,
      diaVencimientoFijo: null,
      periodicidadCuota: 'TRIMESTRAL',
      diasVencimientoCuota: 30,
      categoriaUuids: [],
    };

    api.crear(payload).subscribe();

    const request = httpTesting.expectOne(crearApiUrl('actividad'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    request.flush({
      actividadUuid: 'actividad-2',
      ...payload,
      completa: false,
      profesores: [],
      categoria: null,
      inscriptos: [],
    });
  });

  it('envía descuentos opcionales dentro de la inscripción administrativa', () => {
    const payload = {
      memberUuid: 'member-1',
      descuentos: [
        {
          descuentoUuid: 'descuento-1',
          fechaDesde: '2026-09-01',
          fechaHasta: null,
        },
      ],
    };

    api.inscribir('actividad-1', payload).subscribe();

    const request = httpTesting.expectOne(crearApiUrl('actividad/actividad-1/inscripcion'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    request.flush({
      inscripcionUuid: 'inscripcion-1',
      actividadCompleta: false,
      cuotaGenerada: true,
      cuotaUuid: 'cuota-1',
    });
  });

  it('envía descuentos opcionales dentro de la inscripción administrativa', () => {
    const payload = {
      memberUuid: 'member-1',
      descuentos: [
        {
          descuentoUuid: 'descuento-1',
          fechaDesde: '2026-09-01',
          fechaHasta: null,
        },
      ],
    };

    api.inscribir('actividad-1', payload).subscribe();

    const request = httpTesting.expectOne(crearApiUrl('actividad/actividad-1/inscripcion'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    request.flush({
      inscripcionUuid: 'inscripcion-1',
      actividadCompleta: false,
      cuotaGenerada: true,
      cuotaUuid: 'cuota-1',
    });
  });
});
