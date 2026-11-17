import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthSessionService } from '../../global-services/services/auth-session.service';
import { HEADER_COMPANY_UUID } from '../../interceptors/context/http-headers-context';
import {
  MOSTRAR_TOAST_ERROR,
  MOSTRAR_TOAST_EXITO,
} from '../../interceptors/context/http-toast-context';
import { crearApiUrl } from '../api-url';
import { SocioDto } from '../interfaces/socios.interfaces';
import { SociosApiService } from './socios-api.service';

class EventSourceFalso {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;

  readonly listeners = new Map<string, Array<(evento: Event) => void>>();
  readonly close = vi.fn(() => {
    this.readyState = EventSourceFalso.CLOSED;
  });
  readyState = EventSourceFalso.OPEN;

  constructor(readonly url: string) {
    fuentesEventSource.push(this);
  }

  addEventListener(tipo: string, listener: EventListenerOrEventListenerObject): void {
    const manejar =
      typeof listener === 'function' ? listener : (evento: Event) => listener.handleEvent(evento);
    this.listeners.set(tipo, [...(this.listeners.get(tipo) ?? []), manejar]);
  }

  emitir(tipo: string, data?: unknown): void {
    const evento =
      typeof data === 'undefined'
        ? new Event(tipo)
        : new MessageEvent(tipo, {
            data: typeof data === 'string' ? data : JSON.stringify(data),
          });
    for (const listener of this.listeners.get(tipo) ?? []) listener(evento);
  }
}

const fuentesEventSource: EventSourceFalso[] = [];

describe('SociosApiService', () => {
  let servicio: SociosApiService;
  let httpTesting: HttpTestingController;

  const socio: SocioDto = {
    memberUuid: 'member-1',
    nombre: 'Ana',
    apellido: 'Pérez',
    email: 'ana@example.com',
    estado: 'ACTIVO',
  };

  beforeEach(() => {
    fuentesEventSource.length = 0;
    vi.stubGlobal('EventSource', EventSourceFalso);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        SociosApiService,
        {
          provide: AuthSessionService,
          useValue: { obtenerCompanyUuid: () => 'company-1' },
        },
      ],
    });
    servicio = TestBed.inject(SociosApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('pagina socios con request plano, página 1-based y contexto de empresa', () => {
    servicio
      .paginar({ page: 1, size: 20, search: 'ana', titular: true, estados: ['ACTIVO'] })
      .subscribe();

    const request = httpTesting.expectOne(crearApiUrl('member/paginate'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      page: 1,
      size: 20,
      search: 'ana',
      titular: true,
      estados: ['ACTIVO'],
    });
    expect(request.request.context.get(HEADER_COMPANY_UUID)).toBe('company-1');
    expect(request.request.context.get(MOSTRAR_TOAST_ERROR)?.titulo).toBe('Socios');
    request.flush({
      content: [socio],
      totalElements: 1,
      totalPages: 1,
      size: 20,
      number: 0,
      first: true,
      last: true,
      numberOfElements: 1,
      empty: false,
    });
  });

  it('consulta los familiares por UUID del titular seleccionado', () => {
    servicio.listarFamiliares('titular-1').subscribe();

    const request = httpTesting.expectOne(crearApiUrl('member/uuid/titular-1/familiares'));
    expect(request.request.method).toBe('GET');
    expect(request.request.context.get(HEADER_COMPANY_UUID)).toBe('company-1');
    expect(request.request.context.get(MOSTRAR_TOAST_ERROR)?.titulo).toBe('Grupo familiar');
    request.flush([{ ...socio, memberUuid: 'familiar-1', parentesco: 'HIJO' }]);
  });

  it('envía el alta titular sin wrapper y configura feedback por interceptor', () => {
    const payload = {
      nombre: 'Ana',
      apellido: 'Pérez',
      email: 'ana@example.com',
      password: 'Cambiar123',
    };
    servicio.crearTitular(payload).subscribe();

    const request = httpTesting.expectOne(crearApiUrl('member/titular'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    expect(request.request.context.get(MOSTRAR_TOAST_EXITO)?.titulo).toBe('Socio titular creado');
    expect(request.request.context.get(MOSTRAR_TOAST_ERROR)?.fondoPeligro4xx).toBe(true);
    request.flush(socio);
  });

  it('actualiza únicamente el payload recibido mediante PUT', () => {
    servicio.actualizar('member-1', { nombre: 'Ana María', telefono: '1112345678' }).subscribe();

    const request = httpTesting.expectOne(crearApiUrl('member/uuid/member-1'));
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ nombre: 'Ana María', telefono: '1112345678' });
    request.flush({ ...socio, nombre: 'Ana María', telefono: '1112345678' });
  });

  it('actualiza el estado de un socio por UUID y devuelve el socio actualizado', () => {
    let respuesta: SocioDto | undefined;
    servicio.actualizarEstado('member-1', { estado: 'MOROSO' }).subscribe((socioActualizado) => {
      respuesta = socioActualizado;
    });

    const request = httpTesting.expectOne(crearApiUrl('member/uuid/member-1/estado'));
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ estado: 'MOROSO' });
    expect(request.request.context.get(HEADER_COMPANY_UUID)).toBe('company-1');
    expect(request.request.context.get(MOSTRAR_TOAST_EXITO)?.titulo).toBe(
      'Estado del socio actualizado',
    );
    request.flush({ ...socio, estado: 'MOROSO', titular: true, tieneFamiliares: true });
    expect(respuesta).toEqual({ ...socio, estado: 'MOROSO', titular: true, tieneFamiliares: true });
  });

  it('sube, lista y actualiza certificados médicos con el contexto de empresa', () => {
    const archivo = new File(['certificado'], 'aptitud.pdf', { type: 'application/pdf' });

    servicio.subirCertificado('member-1', archivo).subscribe();
    let request = httpTesting.expectOne(crearApiUrl('member/uuid/member-1/certificado'));
    expect(request.request.method).toBe('POST');
    expect((request.request.body as FormData).get('file')).toBe(archivo);
    expect(request.request.context.get(HEADER_COMPANY_UUID)).toBe('company-1');
    request.flush({ certificadoUuid: 'cert-1', memberUuid: 'member-1', estado: 'CONFIRMADO' });

    servicio.listarCertificados('member-1').subscribe();
    request = httpTesting.expectOne(crearApiUrl('member/uuid/member-1/certificado'));
    expect(request.request.method).toBe('GET');
    request.flush([]);

    servicio.actualizarEstadoCertificado('cert-1', { estado: 'CONFIRMADO' }).subscribe();
    request = httpTesting.expectOne(crearApiUrl('member/certificado/uuid/cert-1/estado'));
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ estado: 'CONFIRMADO' });
    request.flush({ certificadoUuid: 'cert-1', memberUuid: 'member-1', estado: 'CONFIRMADO' });

    servicio.actualizarEstadoCertificado('cert-1', { estado: 'DENEGADO' }).subscribe();
    request = httpTesting.expectOne(crearApiUrl('member/certificado/uuid/cert-1/estado'));
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ estado: 'DENEGADO' });
    request.flush({ certificadoUuid: 'cert-1', memberUuid: 'member-1', estado: 'DENEGADO' });
  });

  it('envía el alta familiar con password y sin número de socio', () => {
    const payload = {
      titularMemberUuid: 'titular-1',
      parentesco: 'HIJO' as const,
      nombre: 'Luis',
      apellido: 'Pérez',
      email: 'luis@example.com',
      password: 'Familiar123',
    };
    servicio.crearFamiliar(payload).subscribe();

    const request = httpTesting.expectOne(crearApiUrl('member/familiar'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    expect(request.request.body.password).toBe('Familiar123');
    expect(request.request.body).not.toHaveProperty('numeroSocio');
    request.flush({ ...socio, memberUuid: 'familiar-1', parentesco: 'HIJO' });
  });

  it('inicia la importación como multipart y espera la respuesta 202', () => {
    const archivo = new File(['contenido'], 'socios.xlsx');
    servicio.iniciarImportacion(archivo).subscribe();

    const request = httpTesting.expectOne(crearApiUrl('member/import'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBeInstanceOf(FormData);
    expect((request.request.body as FormData).get('file')).toBe(archivo);
    expect(request.request.context.get(HEADER_COMPANY_UUID)).toBe('company-1');
    expect(request.request.context.get(MOSTRAR_TOAST_EXITO)).toBeNull();
    request.flush(
      { message: 'Procesando', importId: 'import-1', filasTotales: 10 },
      { status: 202, statusText: 'Accepted' },
    );
  });

  it('pagina los resultados persistidos de importaciones', () => {
    servicio.listarResultadosImportacion(0, 10).subscribe();

    const request = httpTesting.expectOne(
      (peticion) =>
        peticion.url === crearApiUrl('member/import/results') &&
        peticion.params.get('page') === '0' &&
        peticion.params.get('size') === '10',
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.context.get(HEADER_COMPANY_UUID)).toBe('company-1');
    request.flush({
      content: [],
      page: 0,
      size: 10,
      totalElements: 0,
      totalPages: 0,
      hasNext: false,
      hasPrevious: false,
    });
  });

  it('obtiene el detalle completo de una importación', () => {
    servicio.obtenerResultadoImportacion('import id').subscribe((resultado) => {
      expect(resultado.rows[0]?.status).toBe('SUCCESS');
    });

    const request = httpTesting.expectOne(crearApiUrl('member/import/import%20id/result'));
    expect(request.request.method).toBe('GET');
    expect(request.request.context.get(HEADER_COMPANY_UUID)).toBe('company-1');
    request.flush({
      importId: 'import id',
      totalRows: 1,
      successCount: 1,
      errorCount: 0,
      warningCount: 0,
      importStatus: 'COMPLETED',
      errorMessage: null,
      dateCreated: '2026-08-19T10:30:00',
      rows: [
        {
          rowNumber: 1,
          status: 'SUCCESS',
          tipo: 'TITULAR',
          memberUuid: 'member-1',
          numeroSocio: '001',
          errorMessage: null,
          warnings: [],
        },
      ],
    });
  });

  it('sigue progreso, reconexión y finalización mediante EventSource', () => {
    const recibidos: unknown[] = [];
    servicio.observarProgresoImportacion('import id').subscribe((evento) => recibidos.push(evento));
    const fuente = fuentesEventSource[0];

    expect(fuente.url).toBe(crearApiUrl('member/import/import%20id/progress'));
    fuente.emitir('open');
    fuente.emitir('progress', {
      filasProcesadas: 4,
      filasTotales: 10,
      porcentajeCompletado: 40,
      errorCount: 1,
      warningCount: 2,
      errorMessage: null,
    });
    fuente.readyState = EventSourceFalso.CONNECTING;
    fuente.emitir('error');
    fuente.emitir('open');
    fuente.emitir('completed', {
      filasProcesadas: 10,
      filasTotales: 10,
      porcentajeCompletado: 100,
      errorCount: 1,
      warningCount: 2,
      errorMessage: null,
    });

    expect(recibidos).toEqual([
      { tipo: 'conectado' },
      {
        tipo: 'progreso',
        datos: {
          filasProcesadas: 4,
          filasTotales: 10,
          porcentajeCompletado: 40,
          errorCount: 1,
          warningCount: 2,
          errorMessage: null,
        },
      },
      { tipo: 'reconectando' },
      { tipo: 'conectado' },
      {
        tipo: 'completada',
        datos: {
          filasProcesadas: 10,
          filasTotales: 10,
          porcentajeCompletado: 100,
          errorCount: 1,
          warningCount: 2,
          errorMessage: null,
        },
      },
    ]);
    expect(fuente.close).toHaveBeenCalledOnce();
  });

  it('distingue el error de negocio del error nativo terminal', () => {
    const erroresNegocio: unknown[] = [];
    servicio
      .observarProgresoImportacion('import-1')
      .subscribe((evento) => erroresNegocio.push(evento));
    const fuenteNegocio = fuentesEventSource[0];
    fuenteNegocio.emitir('error', {
      filasProcesadas: 3,
      filasTotales: 10,
      porcentajeCompletado: 30,
      errorMessage: 'La importación fue abortada.',
    });

    expect(erroresNegocio).toEqual([
      {
        tipo: 'error',
        datos: {
          filasProcesadas: 3,
          filasTotales: 10,
          porcentajeCompletado: 30,
          errorMessage: 'La importación fue abortada.',
        },
      },
    ]);
    expect(fuenteNegocio.close).toHaveBeenCalledOnce();

    let errorConexion: unknown;
    servicio.observarProgresoImportacion('import-2').subscribe({
      error: (error) => (errorConexion = error),
    });
    const fuenteConexion = fuentesEventSource[1];
    fuenteConexion.readyState = EventSourceFalso.CLOSED;
    fuenteConexion.emitir('error');

    expect(errorConexion).toBeInstanceOf(Error);
    expect(fuenteConexion.close).toHaveBeenCalledOnce();
  });

  it('cierra el EventSource ante un payload inválido y al cancelar la suscripción', () => {
    let errorPayload: unknown;
    servicio.observarProgresoImportacion('import-1').subscribe({
      error: (error) => (errorPayload = error),
    });
    const fuenteInvalida = fuentesEventSource[0];
    fuenteInvalida.emitir('progress', '{json-invalido');

    expect(errorPayload).toBeInstanceOf(Error);
    expect(fuenteInvalida.close).toHaveBeenCalledOnce();

    const suscripcion = servicio.observarProgresoImportacion('import-2').subscribe();
    const fuenteCancelada = fuentesEventSource[1];
    suscripcion.unsubscribe();
    expect(fuenteCancelada.close).toHaveBeenCalledOnce();
  });

  it('consolida solicitudes y limita el rechazo al body contractual', () => {
    servicio.listarSolicitudes({ page: 1, size: 10, search: '' }).subscribe();
    const listado = httpTesting.expectOne(crearApiUrl('member/solicitudes/paginate'));
    expect(listado.request.body).toEqual({ page: 1, size: 10, search: '' });
    listado.flush({
      content: [],
      totalElements: 0,
      totalPages: 0,
      size: 10,
      number: 0,
      first: true,
      last: true,
      numberOfElements: 0,
      empty: true,
    });

    servicio.rechazarSolicitud('member-1', '  Datos incorrectos  ').subscribe();
    const rechazo = httpTesting.expectOne(crearApiUrl('member/uuid/member-1/rechazar-registro'));
    expect(rechazo.request.method).toBe('POST');
    expect(rechazo.request.body).toEqual({ motivo: 'Datos incorrectos' });
    rechazo.flush({});
  });

  it('aprueba solicitudes con body vacío o con descuentos recurrentes', () => {
    servicio.aprobarSolicitud('member-sin-descuentos').subscribe();
    const aprobacionSimple = httpTesting.expectOne(
      crearApiUrl('member/uuid/member-sin-descuentos/aprobar-registro'),
    );
    expect(aprobacionSimple.request.method).toBe('POST');
    expect(aprobacionSimple.request.body).toEqual({});
    aprobacionSimple.flush({});

    const payload = {
      descuentos: [
        {
          descuentoUuid: 'descuento-1',
          fechaDesde: '2026-09-01',
          fechaHasta: null,
        },
      ],
    } as const;
    servicio.aprobarSolicitud('member-con-descuento', payload).subscribe();
    const aprobacionConDescuento = httpTesting.expectOne(
      crearApiUrl('member/uuid/member-con-descuento/aprobar-registro'),
    );
    expect(aprobacionConDescuento.request.method).toBe('POST');
    expect(aprobacionConDescuento.request.body).toEqual(payload);
    expect(aprobacionConDescuento.request.context.get(HEADER_COMPANY_UUID)).toBe('company-1');
    expect(aprobacionConDescuento.request.context.get(MOSTRAR_TOAST_EXITO)).toMatchObject({
      titulo: 'Solicitud aprobada',
    });
    aprobacionConDescuento.flush({});
  });
});
