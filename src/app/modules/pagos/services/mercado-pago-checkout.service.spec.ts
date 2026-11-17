import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

import { MercadoPagoCheckoutService } from './mercado-pago-checkout.service';

describe('MercadoPagoCheckoutService', () => {
  function crearServicio() {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const ventanaCheckout = { opener: {} };
    const open = vi.fn<(url: string, target: string) => { opener: unknown } | null>(
      () => ventanaCheckout,
    );
    TestBed.configureTestingModule({
      providers: [
        MercadoPagoCheckoutService,
        {
          provide: DOCUMENT,
          useValue: {
            defaultView: {
              navigator: { clipboard: { writeText } },
              open,
            },
          },
        },
      ],
    });

    return {
      servicio: TestBed.inject(MercadoPagoCheckoutService),
      open,
      writeText,
      ventanaCheckout,
    };
  }

  it('abre un init point HTTPS solo mediante una acción explícita', () => {
    const { servicio, open, ventanaCheckout } = crearServicio();

    expect(servicio.abrirCheckout('https://www.mercadopago.com.ar/checkout/v1/redirect')).toBe(
      true,
    );
    expect(open).toHaveBeenCalledWith(
      'https://www.mercadopago.com.ar/checkout/v1/redirect',
      '_blank',
    );
    expect(ventanaCheckout.opener).toBeNull();
  });

  it('rechaza destinos vacíos, inválidos o sin HTTPS', () => {
    const { servicio, open } = crearServicio();

    expect(servicio.abrirCheckout('')).toBe(false);
    expect(servicio.abrirCheckout('javascript:alert(1)')).toBe(false);
    expect(servicio.abrirCheckout('http://www.mercadopago.com.ar/checkout')).toBe(false);
    expect(open).not.toHaveBeenCalled();
  });

  it('copia el enlace HTTPS normalizado', async () => {
    const { servicio, writeText } = crearServicio();

    await expect(servicio.copiarEnlace(' https://www.mercadopago.com.ar/checkout ')).resolves.toBe(
      true,
    );
    expect(writeText).toHaveBeenCalledWith('https://www.mercadopago.com.ar/checkout');
  });

  it('genera un QR local sin enviar el enlace a terceros', async () => {
    const { servicio } = crearServicio();

    const qr = await servicio.generarQr('https://www.mercadopago.com.ar/checkout');

    expect(qr).toMatch(/^data:image\/png;base64,/);
  });

  it('informa cuando el navegador bloquea la nueva pestaña', () => {
    const { servicio, open } = crearServicio();
    open.mockReturnValueOnce(null);

    expect(servicio.abrirCheckout('https://www.mercadopago.com.ar/checkout')).toBe(false);
  });
});
