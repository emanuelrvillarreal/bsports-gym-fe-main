import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EventosAccesoApiService } from '../../../../core/api/services/eventos-acceso-api.service';
import { OperacionEventoAccesoComponent } from './operacion-evento-acceso.component';

describe('OperacionEventoAccesoComponent', () => {
  const escanear = vi.fn();
  const cobrar = vi.fn();

  beforeEach(() => {
    escanear.mockReset();
    cobrar.mockReset();
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined);
    TestBed.configureTestingModule({
      imports: [OperacionEventoAccesoComponent],
      providers: [{ provide: EventosAccesoApiService, useValue: { escanear, cobrar } }],
    });
  });

  function crearComponente() {
    const fixture = TestBed.createComponent(OperacionEventoAccesoComponent);
    fixture.componentRef.setInput('evento', {
      uuid: 'evento-1',
      titulo: 'Cena',
      descripcion: 'Entrada',
      monto: 2500,
      permiteMorosos: true,
      permiteInvitados: true,
      montoMorosos: 3000,
      montoInvitados: 4000,
    });
    fixture.componentRef.setInput('abierto', true);
    fixture.detectChanges();
    return fixture.componentInstance as any;
  }

  const socio = {
    memberUuid: 'm-1',
    nombre: 'Ana',
    apellido: 'Pérez',
    numeroSocio: '10',
  };

  it('procesa un acceso permitido y bloquea el mismo código duplicado', () => {
    escanear.mockReturnValue(
      of({ ...socio, estado: 'ACCESO_PERMITIDO', motivo: null, montoAPagar: null }),
    );
    const componente = crearComponente();

    componente.procesarCodigo('user-1');
    componente.procesarCodigo('user-1');

    expect(escanear).toHaveBeenCalledTimes(1);
    expect(componente.estado()).toBe('error');
  });

  it('ofrece el cobro explícito cuando el scan devuelve DEBE_PAGAR', () => {
    escanear.mockReturnValue(
      of({
        ...socio,
        estado: 'DEBE_PAGAR',
        motivo: 'Debe pagar para ingresar.',
        montoAPagar: 3500,
      }),
    );
    const componente = crearComponente();

    componente.procesarCodigo(JSON.stringify({ userUuid: 'user-moroso' }));

    expect(componente.estado()).toBe('pago');
    expect(componente.userUuidSocio()).toBe('user-moroso');
    expect(componente.montoSocio()).toBe(3500);
    expect(componente.cobroAbierto()).toBe(false);
    expect(componente.lectorActivo()).toBe(false);

    componente.abrirCobroSocio();
    expect(componente.modoCobro()).toBe('socio');
    expect(componente.cobroAbierto()).toBe(true);
  });

  it('permite reintentar el mismo código al cancelar el cobro', () => {
    escanear.mockReturnValue(
      of({ ...socio, estado: 'DEBE_PAGAR', motivo: 'Debe pagar.', montoAPagar: 3500 }),
    );
    const componente = crearComponente();

    componente.procesarCodigo('user-moroso');
    componente.abrirCobroSocio();
    componente.cerrarCobro();
    componente.procesarCodigo('user-moroso');

    expect(escanear).toHaveBeenCalledTimes(2);
  });

  it('muestra el motivo bloqueado sin ofrecer cobro', () => {
    escanear.mockReturnValue(
      of({ ...socio, estado: 'BLOQUEADO', motivo: 'Socio suspendido.', montoAPagar: null }),
    );
    const componente = crearComponente();

    componente.procesarCodigo('user-2');

    expect(componente.estado()).toBe('rechazado');
    expect(componente.mensaje()).toBe('Socio suspendido.');
    expect(componente.cobroAbierto()).toBe(false);
  });

  it('permite cancelar y reintentar si DEBE_PAGAR no trae un monto válido', () => {
    escanear.mockReturnValue(
      of({ ...socio, estado: 'DEBE_PAGAR', motivo: 'Debe pagar.', montoAPagar: null }),
    );
    const componente = crearComponente();

    componente.procesarCodigo('user-sin-monto');
    expect(componente.estado()).toBe('pago');
    expect(componente.lectorActivo()).toBe(false);

    componente.omitirCobroSocio();
    expect(componente.estado()).toBe('inicial');
    expect(componente.lectorActivo()).toBe(true);
  });

  it('coordina el cobro unificado y resuelve el resultado manual', () => {
    cobrar.mockReturnValue(
      of({
        eventoUuid: 'evento-1',
        tipo: 'INVITADO',
        resultado: 'ACCESO_PERMITIDO',
        cantidadEntradas: 1,
        monto: 4000,
        concepto: 'Invitado',
        movimientoUuid: 'mov-1',
        qr: null,
        memberUuid: null,
        nombre: null,
        apellido: null,
        numeroSocio: null,
      }),
    );
    const componente = crearComponente();
    const command = {
      tipo: 'INVITADO' as const,
      payload: {
        canalCobro: 'MANUAL' as const,
        cantidadEntradas: 1,
        medioPago: 'EFECTIVO' as const,
        nombre: 'Juan Pérez',
      },
    };

    componente.solicitarCobro(command);

    expect(cobrar).toHaveBeenCalledWith('evento-1', command, {
      mostrarToastError: false,
      mostrarToastExito: false,
    });
    expect(componente.estado()).toBe('exito');
  });

  it('muestra un error controlado si Mercado Pago no devuelve QR', () => {
    cobrar.mockReturnValue(
      of({
        eventoUuid: 'evento-1',
        tipo: 'INVITADO',
        resultado: 'DEBE_PAGAR',
        cantidadEntradas: 1,
        monto: 4000,
        concepto: 'Invitado',
        movimientoUuid: null,
        qr: null,
        memberUuid: null,
        nombre: null,
        apellido: null,
        numeroSocio: null,
      }),
    );
    const componente = crearComponente();

    componente.solicitarCobro({
      tipo: 'INVITADO',
      payload: { canalCobro: 'MERCADO_PAGO', cantidadEntradas: 1, nombre: 'Juan' },
    });

    expect(componente.errorCobro()).toContain('no se recibió un QR válido');
    componente.cerrarCobro();
    expect(componente.estado()).toBe('inicial');
    expect(componente.lectorActivo()).toBe(true);
  });

  it('libera el código cuando falla el transporte del scan', () => {
    escanear.mockReturnValue(throwError(() => new Error('sin red')));
    const componente = crearComponente();
    componente.procesarCodigo('user-3');
    componente.procesarCodigo('user-3');
    expect(escanear).toHaveBeenCalledTimes(2);
  });

  it.each([403, 409])('muestra el mensaje del backend si el cobro responde %s', (status) => {
    cobrar.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status,
            error: { message: `Cobro rechazado ${status}.` },
          }),
      ),
    );
    const componente = crearComponente();

    componente.solicitarCobro({
      tipo: 'INVITADO',
      payload: {
        canalCobro: 'MANUAL',
        cantidadEntradas: 1,
        medioPago: 'EFECTIVO',
        nombre: 'Juan',
      },
    });

    expect(componente.errorCobro()).toBe(`Cobro rechazado ${status}.`);
  });
});
