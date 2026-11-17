import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  MOSTRAR_TOAST_ERROR,
  MOSTRAR_TOAST_EXITO,
} from '../../interceptors/context/http-toast-context';
import { crearApiUrl } from '../api-url';
import {
  EstadoEventoAcceso,
  EventoAccesoAltaCommand,
  EventoAccesoCobroCommand,
  EventoAccesoDetalleDto,
  EventoAccesoEdicionCommand,
} from '../interfaces/eventos-acceso.interfaces';
import { EventosAccesoApiService } from './eventos-acceso-api.service';

describe('EventosAccesoApiService', () => {
  let api: EventosAccesoApiService;
  let httpTesting: HttpTestingController;

  const detalle: EventoAccesoDetalleDto = {
    uuid: 'evento-1',
    titulo: 'Partido amistoso',
    descripcion: 'Entrada general',
    monto: 2500,
    permiteMorosos: true,
    permiteInvitados: true,
    montoMorosos: 3500,
    montoInvitados: 4000,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), EventosAccesoApiService],
    });
    api = TestBed.inject(EventosAccesoApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('crea un evento enviando precios y permisos explícitos', () => {
    const command: EventoAccesoAltaCommand = {
      titulo: detalle.titulo,
      descripcion: detalle.descripcion,
      monto: detalle.monto,
      permiteMorosos: detalle.permiteMorosos,
      permiteInvitados: detalle.permiteInvitados,
      montoMorosos: detalle.montoMorosos,
      montoInvitados: detalle.montoInvitados,
    };

    api.crear(command).subscribe();

    const request = httpTesting.expectOne(crearApiUrl('evento-acceso'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(command);
    expect(request.request.context.get(MOSTRAR_TOAST_EXITO)?.titulo).toBe(
      'Evento de acceso creado',
    );
    expect(request.request.context.get(MOSTRAR_TOAST_ERROR)?.titulo).toBe('Eventos de acceso');
    request.flush(detalle, { status: 201, statusText: 'Created' });
  });

  it('pagina eventos con búsqueda y conserva la respuesta PageResponse', () => {
    const command = { page: 1, size: 20, search: 'partido' };
    let total = -1;

    api.paginar(command).subscribe((pagina) => (total = pagina.totalElements));

    const request = httpTesting.expectOne(crearApiUrl('evento-acceso/paginate'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(command);
    expect(request.request.context.get(MOSTRAR_TOAST_EXITO)).toBeNull();
    request.flush(pagina([detalle]));
    expect(total).toBe(1);
  });

  it('permite paginar con body vacío y obtiene el detalle por UUID', () => {
    api.paginar().subscribe();
    const paginado = httpTesting.expectOne(crearApiUrl('evento-acceso/paginate'));
    expect(paginado.request.body).toEqual({});
    paginado.flush(pagina([]));

    api.obtenerDetalle('evento-1').subscribe((evento) => expect(evento).toEqual(detalle));
    const request = httpTesting.expectOne(crearApiUrl('evento-acceso/evento-1'));
    expect(request.request.method).toBe('GET');
    request.flush(detalle);
  });

  it('edita el evento enviando el contrato completo', () => {
    const command: EventoAccesoEdicionCommand = {
      titulo: 'Partido actualizado',
      descripcion: 'Precio actualizado',
      monto: 3000,
      permiteMorosos: false,
      permiteInvitados: true,
      montoMorosos: 4500,
      montoInvitados: 5000,
    };
    api.actualizar('evento-1', command).subscribe();

    const request = httpTesting.expectOne(crearApiUrl('evento-acceso/evento-1'));
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(command);
    request.flush({ ...detalle, ...command });
  });

  it('da de baja el evento mediante DELETE', () => {
    api.eliminar('evento-1').subscribe();
    const request = httpTesting.expectOne(crearApiUrl('evento-acceso/evento-1'));
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });
  });

  it.each<EstadoEventoAcceso>(['ACCESO_PERMITIDO', 'DEBE_PAGAR', 'BLOQUEADO'])(
    'modela el scan 200 con estado %s y sin toast automático de éxito',
    (estado) => {
      api.escanear('evento-1', { userUuid: 'user-1' }).subscribe((resultado) => {
        expect(resultado.estado).toBe(estado);
      });

      const request = httpTesting.expectOne(crearApiUrl('evento-acceso/evento-1/scan'));
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({ userUuid: 'user-1' });
      expect(request.request.context.get(MOSTRAR_TOAST_EXITO)).toBeNull();
      request.flush({
        memberUuid: 'member-1',
        nombre: 'Ana',
        apellido: 'Pérez',
        numeroSocio: '123',
        estado,
        motivo: estado === 'ACCESO_PERMITIDO' ? null : 'Resultado del control',
        montoAPagar: estado === 'DEBE_PAGAR' ? 3500 : null,
      });
    },
  );

  const cobros: readonly EventoAccesoCobroCommand[] = [
    {
      tipo: 'SOCIO',
      payload: {
        userUuid: 'user-1',
        canalCobro: 'MANUAL',
        cantidadEntradas: 1,
        medioPago: 'EFECTIVO',
        fecha: '2026-08-24',
        observaciones: 'En puerta',
      },
    },
    {
      tipo: 'SOCIO',
      payload: { userUuid: 'user-1', canalCobro: 'MERCADO_PAGO', cantidadEntradas: 1 },
    },
    {
      tipo: 'INVITADO',
      payload: {
        nombre: 'Juan Pérez',
        canalCobro: 'MANUAL',
        cantidadEntradas: 2,
        medioPago: 'TRANSFERENCIA',
      },
    },
    {
      tipo: 'INVITADO',
      payload: { nombre: 'Juan Pérez', canalCobro: 'MERCADO_PAGO' },
    },
  ];

  it.each(cobros)('unifica el cobro $tipo/$payload.canalCobro en /cobro', (command) => {
    api.cobrar('evento-1', command).subscribe();

    const request = httpTesting.expectOne(crearApiUrl('evento-acceso/evento-1/cobro'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(command);
    expect(request.request.context.get(MOSTRAR_TOAST_EXITO)?.titulo).toBe(
      'Cobro de entrada registrado',
    );
    request.flush({
      eventoUuid: 'evento-1',
      tipo: command.tipo,
      resultado: command.payload.canalCobro === 'MANUAL' ? 'ACCESO_PERMITIDO' : 'DEBE_PAGAR',
      cantidadEntradas: command.payload.cantidadEntradas ?? 1,
      monto: 3500,
      concepto: 'Entrada Partido amistoso',
      movimientoUuid: command.payload.canalCobro === 'MANUAL' ? 'movimiento-1' : null,
      qr: command.payload.canalCobro === 'MERCADO_PAGO' ? 'qr-base64' : null,
      memberUuid: command.tipo === 'SOCIO' ? 'member-1' : null,
      nombre: command.tipo === 'SOCIO' ? 'Ana' : null,
      apellido: command.tipo === 'SOCIO' ? 'Pérez' : null,
      numeroSocio: command.tipo === 'SOCIO' ? '123' : null,
    });
  });

  it('pagina el historial por evento con URL y body exactos', () => {
    const command = { page: 1, size: 10, search: 'ana' };
    api.paginarHistorial('evento-1', command).subscribe();

    const request = httpTesting.expectOne(crearApiUrl('evento-acceso/evento-1/historial/paginate'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(command);
    expect(request.request.context.get(MOSTRAR_TOAST_EXITO)).toBeNull();
    request.flush(pagina([]));
  });
});

function pagina<T>(content: readonly T[]) {
  return {
    content,
    totalElements: content.length,
    totalPages: content.length > 0 ? 1 : 0,
    size: 10,
    number: 0,
    first: true,
    last: true,
    numberOfElements: content.length,
    empty: content.length === 0,
  };
}
