import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { AuthSessionService } from '../../global-services/services/auth-session.service';
import { HEADER_COMPANY_UUID } from '../../interceptors/context/http-headers-context';
import {
  MOSTRAR_TOAST_ERROR,
  MOSTRAR_TOAST_EXITO,
} from '../../interceptors/context/http-toast-context';
import { API_ROUTES } from '../api-routes';
import { crearApiUrl } from '../api-url';
import {
  DescuentoAsignadoDto,
  DescuentoDto,
  GuardarDescuentoPayload,
} from '../interfaces/descuentos.interfaces';
import { DescuentosApiService } from './descuentos-api.service';

const descuento: DescuentoDto = {
  descuentoUuid: 'descuento-1',
  titulo: 'Convenio Empresa X',
  tipoValor: 'PORCENTAJE',
  porcentaje: 20,
  montoFijo: null,
};

const asignacion: DescuentoAsignadoDto = {
  ...descuento,
  asignacionUuid: 'asignacion-1',
  fechaDesde: '2026-06-01',
  fechaHasta: null,
  vigente: true,
};

const guardarPayload: GuardarDescuentoPayload = {
  titulo: descuento.titulo,
  tipoValor: descuento.tipoValor,
  porcentaje: descuento.porcentaje,
  montoFijo: descuento.montoFijo,
};

describe('DescuentosApiService', () => {
  let servicio: DescuentosApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        DescuentosApiService,
        {
          provide: AuthSessionService,
          useValue: { obtenerCompanyUuid: () => 'company-1' },
        },
      ],
    });
    servicio = TestBed.inject(DescuentosApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('pagina el catálogo y los socios con el body plano 1-based', () => {
    const payload = { page: 1, size: 10, search: 'convenio' };

    servicio.paginarCatalogo(payload).subscribe();
    let request = httpTesting.expectOne(crearApiUrl(API_ROUTES.descuentos.paginarCatalogo));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    expect(request.request.context.get(HEADER_COMPANY_UUID)).toBe('company-1');
    expect(request.request.context.get(MOSTRAR_TOAST_ERROR)).toEqual({ titulo: 'Descuentos' });
    request.flush({ content: [descuento], totalElements: 1, totalPages: 1 });

    servicio.paginarPorSocio(payload).subscribe();
    request = httpTesting.expectOne(crearApiUrl(API_ROUTES.descuentos.paginarPorSocio));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    request.flush({ content: [], totalElements: 0, totalPages: 0 });
  });

  it('crea, actualiza y elimina descuentos del catálogo por UUID', () => {
    servicio.crear(guardarPayload).subscribe();
    let request = httpTesting.expectOne(crearApiUrl(API_ROUTES.descuentos.crear));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(guardarPayload);
    expect(request.request.context.get(HEADER_COMPANY_UUID)).toBe('company-1');
    expect(request.request.context.get(MOSTRAR_TOAST_EXITO)).toEqual({
      titulo: 'Descuento creado',
    });
    expect(request.request.context.get(MOSTRAR_TOAST_ERROR)?.fondoPeligro4xx).toBe(true);
    request.flush(descuento);

    servicio.actualizar('descuento-1', guardarPayload).subscribe();
    request = httpTesting.expectOne(crearApiUrl(API_ROUTES.descuentos.actualizar('descuento-1')));
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(guardarPayload);
    request.flush(descuento);

    servicio.eliminar('descuento-1').subscribe();
    request = httpTesting.expectOne(crearApiUrl(API_ROUTES.descuentos.eliminar('descuento-1')));
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
  });

  it('gestiona el ciclo de vida de una asignación social con el UUID correcto', () => {
    const payload = {
      descuentoUuid: 'descuento-1',
      fechaDesde: '2026-06-01',
      fechaHasta: null,
    };

    servicio.asignarASocio('member-1', payload).subscribe();
    let request = httpTesting.expectOne(
      crearApiUrl(API_ROUTES.descuentos.asignarASocio('member-1')),
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    request.flush(asignacion);

    servicio.finalizarAsignacionSocio('asignacion-1', { fecha: '2026-12-31' }).subscribe();
    request = httpTesting.expectOne(
      crearApiUrl(API_ROUTES.descuentos.finalizarAsignacionSocio('asignacion-1')),
    );
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ fecha: '2026-12-31' });
    request.flush({ ...asignacion, fechaHasta: '2026-12-31' });

    servicio.eliminarAsignacionSocio('asignacion-1').subscribe();
    request = httpTesting.expectOne(
      crearApiUrl(API_ROUTES.descuentos.eliminarAsignacionSocio('asignacion-1')),
    );
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
  });

  it('gestiona asignaciones de actividad usando inscripción y asignación según la operación', () => {
    const payload = {
      descuentoUuid: 'descuento-1',
      fechaDesde: '2026-06-01',
      fechaHasta: null,
    };

    servicio.asignarAActividad('inscripcion-1', payload).subscribe();
    let request = httpTesting.expectOne(
      crearApiUrl(API_ROUTES.descuentos.asignarAActividad('inscripcion-1')),
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    request.flush(asignacion);

    servicio.finalizarAsignacionActividad('asignacion-1', { fecha: '2026-12-31' }).subscribe();
    request = httpTesting.expectOne(
      crearApiUrl(API_ROUTES.descuentos.finalizarAsignacionActividad('asignacion-1')),
    );
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ fecha: '2026-12-31' });
    request.flush({ ...asignacion, fechaHasta: '2026-12-31' });

    servicio.eliminarAsignacionActividad('asignacion-1').subscribe();
    request = httpTesting.expectOne(
      crearApiUrl(API_ROUTES.descuentos.eliminarAsignacionActividad('asignacion-1')),
    );
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
  });
});
