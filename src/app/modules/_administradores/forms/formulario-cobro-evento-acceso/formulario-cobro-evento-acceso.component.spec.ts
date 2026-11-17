import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FormularioCobroEventoAccesoComponent } from './formulario-cobro-evento-acceso.component';

const EVENTO = {
  uuid: 'evento-1',
  titulo: 'Cena',
  descripcion: 'Entrada',
  monto: 2500,
  montoMorosos: 3500,
  montoInvitados: 5000,
  permiteMorosos: true,
  permiteInvitados: true,
};

function crearComponente(modo: 'socio' | 'invitado', userUuid: string | null = null) {
  const fixture = TestBed.createComponent(FormularioCobroEventoAccesoComponent);
  fixture.componentRef.setInput('evento', EVENTO);
  fixture.componentRef.setInput('modo', modo);
  fixture.componentRef.setInput('userUuid', userUuid);
  fixture.componentRef.setInput('montoUnitario', modo === 'socio' ? 3500 : 5000);
  fixture.componentRef.setInput('abierto', true);
  fixture.detectChanges();
  return { fixture, componente: fixture.componentInstance as any };
}

describe('FormularioCobroEventoAccesoComponent', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  it('emite el command INVITADO de Mercado Pago con nombre obligatorio normalizado', () => {
    const { componente, fixture } = crearComponente('invitado');
    const solicitudCobro = vi.fn();
    fixture.componentInstance.solicitudCobro.subscribe(solicitudCobro);
    componente.nombreInvitado.set('  Juan Pérez  ');
    componente.cantidadEntradas.set(2);
    componente.cambiarCanal('MERCADO_PAGO');

    componente.guardar();

    expect(solicitudCobro).toHaveBeenCalledWith({
      tipo: 'INVITADO',
      payload: {
        canalCobro: 'MERCADO_PAGO',
        cantidadEntradas: 2,
        nombre: 'Juan Pérez',
      },
    });
  });

  it('no emite invitado sin nombre', () => {
    const { componente, fixture } = crearComponente('invitado');
    const solicitudCobro = vi.fn();
    fixture.componentInstance.solicitudCobro.subscribe(solicitudCobro);

    componente.guardar();

    expect(solicitudCobro).not.toHaveBeenCalled();
    expect(componente.formularioInvalido()).toBe(true);
  });

  it('emite el command SOCIO manual exacto con userUuid', () => {
    const { componente, fixture } = crearComponente('socio', ' user-socio ');
    const solicitudCobro = vi.fn();
    fixture.componentInstance.solicitudCobro.subscribe(solicitudCobro);
    componente.observaciones.set('  Entrada en puerta  ');

    componente.guardar();

    expect(solicitudCobro).toHaveBeenCalledWith({
      tipo: 'SOCIO',
      payload: {
        canalCobro: 'MANUAL',
        cantidadEntradas: 1,
        medioPago: 'EFECTIVO',
        observaciones: 'Entrada en puerta',
        userUuid: 'user-socio',
      },
    });
  });

  it('rechaza un socio sin userUuid y una cantidad inválida', () => {
    const { componente, fixture } = crearComponente('socio');
    const solicitudCobro = vi.fn();
    fixture.componentInstance.solicitudCobro.subscribe(solicitudCobro);
    componente.cantidadEntradas.set(0);

    componente.guardar();

    expect(solicitudCobro).not.toHaveBeenCalled();
  });

  it('presenta checkout solo para resultado pendiente con QR válido', () => {
    const { componente, fixture } = crearComponente('invitado');
    fixture.componentRef.setInput('estadoOperacion', {
      guardando: false,
      error: '',
      resultado: {
        eventoUuid: 'evento-1',
      tipo: 'INVITADO',
      resultado: 'DEBE_PAGAR',
      cantidadEntradas: 1,
      monto: 5000,
      concepto: 'Invitado',
      movimientoUuid: null,
      qr: 'YWJj',
      memberUuid: null,
      nombre: null,
        apellido: null,
        numeroSocio: null,
      },
    });
    fixture.detectChanges();

    expect(componente.qrNormalizado()).toBe('data:image/png;base64,YWJj');
    expect(componente.checkoutAbierto()).toBe(true);
    expect(componente.pagoPendienteSinQr()).toBe(false);
  });

  it('informa un pago pendiente sin QR y no abre checkout', () => {
    const { componente, fixture } = crearComponente('invitado');
    fixture.componentRef.setInput('estadoOperacion', {
      guardando: false,
      error: '',
      resultado: {
        eventoUuid: 'evento-1',
      tipo: 'INVITADO',
      resultado: 'DEBE_PAGAR',
      cantidadEntradas: 1,
      monto: 5000,
      concepto: 'Invitado',
      movimientoUuid: null,
      qr: null,
      memberUuid: null,
      nombre: null,
        apellido: null,
        numeroSocio: null,
      },
    });
    fixture.detectChanges();

    expect(componente.checkoutAbierto()).toBe(false);
    expect(componente.pagoPendienteSinQr()).toBe(true);
  });

  it('decide el resultado manual por resultado y no por movimientoUuid', () => {
    const { componente, fixture } = crearComponente('socio', 'user-1');
    fixture.componentRef.setInput('estadoOperacion', {
      guardando: false,
      error: '',
      resultado: {
        eventoUuid: 'evento-1',
      tipo: 'SOCIO',
      resultado: 'ACCESO_PERMITIDO',
      cantidadEntradas: 1,
      monto: 3500,
      concepto: 'Socio',
      movimientoUuid: null,
      qr: null,
      memberUuid: 'member-1',
      nombre: 'Ana',
        apellido: 'Pérez',
        numeroSocio: '10',
      },
    });
    fixture.detectChanges();

    expect(componente.resultado()?.resultado).toBe('ACCESO_PERMITIDO');
    expect(componente.checkoutAbierto()).toBe(false);
  });
});
