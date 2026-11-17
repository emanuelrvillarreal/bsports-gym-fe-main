import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  FacturaDto,
  GenerarPagoFacturasPayload,
} from '../../../../core/api/interfaces/facturas.interfaces';
import { FacturasApiService } from '../../../../core/api/services/facturas-api.service';
import { AuthSessionService } from '../../../../core/global-services/services/auth-session.service';
import { MercadoPagoCheckoutService } from '../../../pagos/services/mercado-pago-checkout.service';
import { CheckoutFacturaComponent } from './checkout-factura.component';

describe('CheckoutFacturaComponent', () => {
  let fixture: ComponentFixture<CheckoutFacturaComponent>;
  const generarPago = vi.fn((_payload: GenerarPagoFacturasPayload) =>
    of({ id: 'preferencia-1', init_point: 'https://mp.example/pago' }),
  );
  const mercadoPago = {
    normalizarEnlace: vi.fn((enlace: string) => enlace),
    generarQr: vi.fn(() => Promise.resolve('data:image/png;base64,qr')),
    abrirCheckout: vi.fn(() => true),
    copiarEnlace: vi.fn(() => Promise.resolve(true)),
  };
  const factura: FacturaDto = {
    facturaUuid: 'factura-local',
    uuidFacturaCrm: 'factura-crm',
    codigoPlan: 'plan-estandar',
    codigosProductos: [],
    importe: 25000,
    fechaGeneracion: '01/09/2026',
    fechaVencimiento: '15/09/2026',
    estado: 'VENCIDA',
  };

  beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  beforeEach(async () => {
    generarPago.mockClear();
    await TestBed.configureTestingModule({ imports: [CheckoutFacturaComponent] })
      .overrideProvider(FacturasApiService, { useValue: { generarPago } })
      .overrideProvider(AuthSessionService, { useValue: { companyName: () => 'Club Deportivo' } })
      .overrideProvider(MercadoPagoCheckoutService, { useValue: mercadoPago })
      .compileComponents();
    fixture = TestBed.createComponent(CheckoutFacturaComponent);
  });

  it('genera el pago con el UUID local, referencia única y fecha local', () => {
    fixture.componentRef.setInput('factura', factura);
    fixture.detectChanges();

    expect(generarPago).toHaveBeenCalledOnce();
    const payload = generarPago.mock.calls[0]?.[0];
    expect(payload).toBeDefined();
    if (!payload) return;
    expect(payload.facturasUuid).toEqual(['factura-local']);
    expect(payload.referencia).toBe('factura-Club Deportivo');
    expect(payload.fechaPago).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
