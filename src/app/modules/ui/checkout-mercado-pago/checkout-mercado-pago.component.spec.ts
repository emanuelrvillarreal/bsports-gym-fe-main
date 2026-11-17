import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';

import { ColorThemeService } from '../color-mod/color-theme.service';
import { ThemeModeService } from '../dark-mode/theme-mode.service';
import { CheckoutMercadoPagoComponent } from './checkout-mercado-pago.component';

describe('CheckoutMercadoPagoComponent', () => {
  let fixture: ComponentFixture<CheckoutMercadoPagoComponent>;

  beforeEach(async () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
    await TestBed.configureTestingModule({
      imports: [CheckoutMercadoPagoComponent],
      providers: [
        { provide: ThemeModeService, useValue: { resolvedMode: signal<'dark' | 'light'>('dark') } },
        {
          provide: ColorThemeService,
          useValue: {
            colorPrimario: signal('#4982fd'),
            colorSecundario: signal('#2563eb'),
            colorTerciario: signal('#06b6d4'),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CheckoutMercadoPagoComponent);
    fixture.componentRef.setInput('abierto', true);
    fixture.componentRef.setInput('enlace', 'https://www.mercadopago.com.ar/checkout');
    fixture.componentRef.setInput('qr', 'data:image/png;base64,qr');
    fixture.componentRef.setInput('resumen', 'Tres cuotas seleccionadas');
    fixture.componentRef.setInput('monto', '$ 30.000');
    fixture.detectChanges();
  });

  it('muestra QR, resumen, monto y enlace', () => {
    const elemento = fixture.nativeElement as HTMLElement;

    expect(elemento.querySelector('app-titulo-hero')).not.toBeNull();
    expect(elemento.querySelector('.checkout-mp__logo')?.getAttribute('src')).toContain(
      'MP_RGB_HANDSHAKE_pluma_horizontal.svg',
    );
    expect(elemento.querySelector('.checkout-mp__qr img')?.getAttribute('src')).toBe(
      'data:image/png;base64,qr',
    );
    expect(elemento.textContent).toContain('Tres cuotas seleccionadas');
    expect(elemento.textContent).toContain('$ 30.000');
    expect(elemento.querySelector<HTMLInputElement>('input')?.value).toBe(
      'https://www.mercadopago.com.ar/checkout',
    );
    expect(elemento.querySelector('.checkout-mp__instrucciones app-boton')?.textContent).toContain(
      'Copiar enlace',
    );
    expect(elemento.textContent).toContain('El estado se actualizará después de abonarlo');
  });

  it('emite las acciones sin ejecutar lógica de negocio', () => {
    const abrir = vi.fn();
    const copiar = vi.fn();
    const cerrar = vi.fn();
    fixture.componentInstance.abrirCheckout.subscribe(abrir);
    fixture.componentInstance.copiarEnlace.subscribe(copiar);
    fixture.componentInstance.cerrar.subscribe(cerrar);

    fixture.componentInstance.abrirCheckout.emit();
    fixture.componentInstance.copiarEnlace.emit();
    fixture.componentInstance.cerrar.emit();

    expect(abrir).toHaveBeenCalledOnce();
    expect(copiar).toHaveBeenCalledOnce();
    expect(cerrar).toHaveBeenCalledOnce();
  });

  it('admite un checkout solo QR sin mostrar acciones de enlace', () => {
    fixture.componentRef.setInput('enlace', '');
    fixture.componentRef.setInput(
      'subtitulo',
      'El pago quedará pendiente hasta recibir el webhook.',
    );
    fixture.detectChanges();

    const elemento = fixture.nativeElement as HTMLElement;
    expect(elemento.querySelector('input')).toBeNull();
    expect(elemento.textContent).not.toContain('Copiar enlace');
    expect(elemento.textContent).not.toContain('Abrir Mercado Pago');
    expect(elemento.textContent).toContain('webhook');
    expect(elemento.textContent).toContain('Escaneá el QR');
  });
});
