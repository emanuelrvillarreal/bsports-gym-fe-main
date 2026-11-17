import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { crearApiUrl } from '../api-url';
import { MOSTRAR_TOAST_EXITO } from '../../interceptors/context/http-toast-context';
import { TesoreriaApiService } from './tesoreria-api.service';

describe('TesoreriaApiService', () => {
  let api: TesoreriaApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), TesoreriaApiService],
    });
    api = TestBed.inject(TesoreriaApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('pagina cuotas con filtros de búsqueda, estado y tipo', () => {
    const payload = {
      page: 1,
      size: 20,
      estados: ['VENCIDA'] as const,
      tipos: ['SOCIAL'] as const,
      search: 'Perez',
      orden: 'VENCIMIENTO_ASC' as const,
    };

    api.paginarCuotas(payload).subscribe();

    const request = http.expectOne(crearApiUrl('treasury/cuota/paginate'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    expect(request.request.body).not.toHaveProperty('personaMemberUuid');
    expect(request.request.body).not.toHaveProperty('titularMemberUuid');
    request.flush({ content: [], totalElements: 0, totalPages: 0 });
  });

  it('genera el ciclo mensual con un período opcional', () => {
    api.generarCuotasDiarias({ fecha: '2026-07-15' }).subscribe();

    const request = http.expectOne(
      (peticion) =>
        peticion.url === crearApiUrl('treasury/cuota/generacion/diaria') &&
        peticion.params.get('fecha') === '2026-07-15',
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBeNull();
    request.flush({ social: { yearMonth: '2026-07' }, actividad: { yearMonth: '2026-07' } });
  });

  it('genera cuotas de actividad hasta la fecha solicitada', () => {
    api.generarCuotasActividad({ hasta: '31/12/2026' }).subscribe((resultado) => {
      expect(resultado.hasta).toBe('31/12/2026');
      expect(resultado.cuotasGeneradas).toBe(42);
    });

    const request = http.expectOne(
      (peticion) =>
        peticion.url === crearApiUrl('treasury/cuota/generacion/actividad') &&
        peticion.params.get('hasta') === '31/12/2026',
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBeNull();
    request.flush({ hasta: '31/12/2026', companiesProcessed: 1, cuotasGeneradas: 42, cuotasOmitidas: 1 });
  });

  it('genera cuotas sociales hasta la fecha solicitada', () => {
    api.generarCuotasSociales({ hasta: '31/12/2026' }).subscribe((resultado) => {
      expect(resultado.hasta).toBe('31/12/2026');
      expect(resultado.cuotasGeneradas).toBe(18);
    });

    const request = http.expectOne(
      (peticion) =>
        peticion.url === crearApiUrl('treasury/cuota/generacion/social') &&
        peticion.params.get('hasta') === '31/12/2026',
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBeNull();
    request.flush({ hasta: '31/12/2026', companiesProcessed: 1, cuotasGeneradas: 18, cuotasOmitidas: 0 });
  });

  it('incluye soloImpagas en las consultas de deuda por persona', () => {
    api.listarCuotasPersona('s-1', { estados: ['VENCIDA'], soloImpagas: true }).subscribe();

    const request = http.expectOne(
      crearApiUrl('treasury/cuota/persona/s-1?estado=VENCIDA&soloImpagas=true'),
    );
    expect(request.request.method).toBe('GET');
    request.flush({ cuotas: [] });
  });

  it('genera el ciclo mensual con un período opcional', () => {
    api.generarCuotasDiarias({ fecha: '2026-07-15' }).subscribe();

    const request = http.expectOne(
      (peticion) =>
        peticion.url === crearApiUrl('treasury/cuota/generacion/diaria') &&
        peticion.params.get('fecha') === '2026-07-15',
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBeNull();
    request.flush({ social: { yearMonth: '2026-07' }, actividad: { yearMonth: '2026-07' } });
  });

  it('incluye soloImpagas en las consultas de deuda por persona', () => {
    api.listarCuotasPersona('s-1', { estados: ['VENCIDA'], soloImpagas: true }).subscribe();

    const request = http.expectOne(
      crearApiUrl('treasury/cuota/persona/s-1?estado=VENCIDA&soloImpagas=true'),
    );
    expect(request.request.method).toBe('GET');
    request.flush({ cuotas: [] });
  });

  it('anula una cuota y devuelve su detalle con auditoría', () => {
    api.anularCuota('c-1', { motivo: 'Error' }).subscribe((respuesta) => {
      expect(respuesta.estado).toBe('ANULADA');
      expect(respuesta.anuladaMotivo).toBe('Error');
    });
    const request = http.expectOne(crearApiUrl('treasury/cuota/uuid/c-1/anular'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ motivo: 'Error' });
    request.flush({
      cuotaUuid: 'c-1',
      estado: 'ANULADA',
      anuladaPorUuid: 'admin-1',
      anuladaPorNombre: 'María',
      anuladaPorApellido: 'González',
      anuladaMotivo: 'Error',
      anuladaAt: '2026-07-24T12:00:00Z',
    });
  });

  it('registra el cobro manual de una cuota con medio presencial', () => {
    const payload = {
      cuotaUuids: ['c-1'],
      canalCobro: 'MANUAL' as const,
      medioPago: 'TRANSFERENCIA' as const,
    };

    api.cobrarManual(payload).subscribe((respuesta) => expect(respuesta.exitosas).toBe(1));

    const request = http.expectOne(crearApiUrl('treasury/cuota/cobro'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    request.flush({ items: [{ cuotaUuid: 'c-1', exitoso: true }], exitosas: 1, fallidas: 0 });
  });

  it('inicia un único checkout Mercado Pago para varias cuotas', () => {
    const payload = {
      cuotaUuids: ['c-1', 'c-2'],
      canalCobro: 'MERCADO_PAGO' as const,
      medioPago: 'MERCADO_PAGO' as const,
    };

    api.iniciarCobroMercadoPago(payload).subscribe((respuesta) => {
      expect(respuesta.mercadoPagoPreferenceId).toBe('preferencia-1');
    });

    const request = http.expectOne(crearApiUrl('treasury/cuota/cobro'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    request.flush({
      mercadoPagoInitPoint: 'https://www.mercadopago.com.ar/checkout',
      mercadoPagoPreferenceId: 'preferencia-1',
    });
  });

  it('puede omitir el toast de éxito para consolidar varios cobros', () => {
    api
      .cobrarManual(
        { cuotaUuids: ['c-1', 'c-2'], canalCobro: 'MANUAL', medioPago: 'EFECTIVO' },
        { mostrarToastExito: false },
      )
      .subscribe();

    const request = http.expectOne(crearApiUrl('treasury/cuota/cobro'));
    expect(request.request.context.get(MOSTRAR_TOAST_EXITO)).toBeNull();
    request.flush({ items: [], exitosas: 0, fallidas: 0 });
  });

  it('pagina la deuda familiar usando solamente el UUID del titular', () => {
    const payload = {
      page: 1,
      size: 20,
      estados: ['PENDIENTE', 'VENCIDA'] as const,
      titularMemberUuid: 'titular-1',
      orden: 'PERSONA_APELLIDO' as const,
    };
    api.paginarCuotas(payload).subscribe();

    const request = http.expectOne(crearApiUrl('treasury/cuota/paginate'));
    expect(request.request.body).toEqual(payload);
    expect(request.request.body).not.toHaveProperty('personaMemberUuid');
    expect(request.request.body).not.toHaveProperty('soloImpagas');
    request.flush({ content: [], totalElements: 0, totalPages: 0 });
  });

  it('pagina, crea, detalla y anula movimientos sin duplicar contratos', () => {
    const payload = {
      page: 1,
      size: 20,
      tipo: 'INGRESO' as const,
      fechaDesde: '2026-05-01',
      fechaHasta: '2026-05-31',
      estados: ['ACTIVO'] as const,
    };
    api.paginarMovimientos(payload).subscribe();
    let request = http.expectOne(crearApiUrl('treasury/movimiento/paginate'));
    expect(request.request.body).toEqual(payload);
    expect(request.request.body).not.toHaveProperty('periodo');
    request.flush({ content: [], totalElements: 0, totalPages: 0 });

    api
      .crearMovimiento({ tipo: 'INGRESO', monto: 100, concepto: 'Caja', medioPago: 'EFECTIVO' })
      .subscribe();
    request = http.expectOne(crearApiUrl('treasury/movimiento'));
    expect(request.request.method).toBe('POST');
    request.flush({ movimientoUuid: 'm-1' });

    api.obtenerMovimiento('m-1').subscribe();
    request = http.expectOne(crearApiUrl('treasury/movimiento/uuid/m-1'));
    expect(request.request.method).toBe('GET');
    request.flush({ movimientoUuid: 'm-1' });

    api.anularMovimiento('m-1', { motivo: 'Duplicado' }).subscribe();
    request = http.expectOne(crearApiUrl('treasury/movimiento/uuid/m-1/anular'));
    expect(request.request.body).toEqual({ motivo: 'Duplicado' });
    request.flush({ movimientoUuid: 'm-1', estado: 'ANULADO' });
  });
});
