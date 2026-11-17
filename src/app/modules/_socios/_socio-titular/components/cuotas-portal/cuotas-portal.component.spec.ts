import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PortalSocioApiService } from '../../../../../core/api/services/portal-socio-api.service';
import { TesoreriaApiService } from '../../../../../core/api/services/tesoreria-api.service';
import { MercadoPagoCheckoutService } from '../../../../pagos/services/mercado-pago-checkout.service';
import { CuotasPortalComponent } from './cuotas-portal.component';

describe('CuotasPortalComponent', () => {
  const grupo = {
    titularMemberUuid: 'titular-1',
    titularNombre: 'Ana',
    titularApellido: 'Titular',
    montoTotalGrupo: 3000,
    montoDeudaGrupo: 2000,
    totalPorPagarGrupo: 2000,
    personas: [
      {
        personaMemberUuid: 'titular-1',
        nombre: 'Ana',
        apellido: 'Titular',
        estadoMember: 'ACTIVO',
        titularMemberUuid: 'titular-1',
        cuotas: [
          {
            cuotaUuid: 'cuota-pendiente',
            concepto: 'Cuota social',
            tipo: 'SOCIAL',
            monto: 5000,
            montoFinal: 4500,
            fechaGeneracion: '01/08/2026',
            vencimiento: '2026-08-10',
            estado: 'PENDIENTE',
          },
          {
            cuotaUuid: 'cuota-pagada',
            concepto: 'Natación',
            tipo: 'ACTIVIDAD',
            monto: 500,
            fechaGeneracion: '31/07/2026',
            vencimiento: '2026-08-10',
            estado: 'PAGADA',
          },
        ],
        subtotalPersona: 1500,
        subtotalDeudaPersona: 1000,
        totalPorPagar: 1000,
      },
      {
        personaMemberUuid: 'familiar-1',
        nombre: 'Luis',
        apellido: 'Familiar',
        parentesco: 'HIJO',
        estadoMember: 'ACTIVO',
        titularMemberUuid: 'titular-1',
        cuotas: [
          {
            cuotaUuid: 'cuota-vencida',
            concepto: 'Cuota social',
            tipo: 'SOCIAL',
            monto: 1000,
            fechaGeneracion: '10/07/2026',
            vencimiento: '2026-07-10',
            estado: 'VENCIDA',
          },
        ],
        subtotalPersona: 1000,
        subtotalDeudaPersona: 1000,
        totalPorPagar: 1000,
      },
    ],
  } as const;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 12));
  });

  afterEach(() => vi.useRealTimers());

  function crear() {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
    const iniciarCobroMercadoPago = vi.fn(() =>
      of({
        mercadoPagoInitPoint: 'https://www.mercadopago.com.ar/checkout',
        mercadoPagoPreferenceId: 'preferencia-1',
      }),
    );
    const generarQr = vi.fn(() => Promise.resolve('data:image/png;base64,qr'));

    const listarCuotasGrupoFamiliar = vi.fn(() => of(grupo));
    TestBed.configureTestingModule({
      imports: [CuotasPortalComponent],
      providers: [
        { provide: PortalSocioApiService, useValue: { listarCuotasGrupoFamiliar } },
        { provide: TesoreriaApiService, useValue: { iniciarCobroMercadoPago } },
        {
          provide: MercadoPagoCheckoutService,
          useValue: {
            normalizarEnlace: (enlace: string) => enlace,
            generarQr,
            copiarEnlace: vi.fn(() => Promise.resolve(true)),
            abrirCheckout: vi.fn(() => true),
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(CuotasPortalComponent);
    fixture.detectChanges();
    return { fixture, iniciarCobroMercadoPago, listarCuotasGrupoFamiliar, generarQr };
  }

  it('muestra las cuotas de familiares por defecto y las oculta sin recargar', () => {
    const { fixture } = crear();

    expect(fixture.nativeElement.textContent).toContain('Luis Familiar');

    const checkbox = fixture.nativeElement.querySelector(
      'input[type="checkbox"]',
    ) as HTMLInputElement;
    checkbox.checked = false;
    checkbox.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Luis Familiar');
    expect(fixture.nativeElement.textContent).toContain('Ana Titular');
  });

  it('muestra el monto original tachado junto al monto final cuando difieren', () => {
    const { fixture } = crear();

    const importe = fixture.nativeElement.querySelector('.cuotas-portal__importe');
    expect(importe.querySelector('del')?.textContent).toContain('$5000');
    expect(importe.querySelector('strong')?.textContent).toContain('$4500');
  });

  it('solo ofrece pago para cuotas pendientes o vencidas', () => {
    const { fixture } = crear();

    expect(
      fixture.nativeElement.querySelectorAll('button[aria-label="Ver QR de pago"]'),
    ).toHaveLength(2);
  });

  it('permite elegir entre uno y doce meses y vuelve a consultar al cambiar', () => {
    const { fixture, listarCuotasGrupoFamiliar } = crear();
    const rango = fixture.nativeElement.querySelector('input[type="range"]') as HTMLInputElement;

    expect(rango.min).toBe('1');
    expect(rango.max).toBe('12');
    expect(listarCuotasGrupoFamiliar).toHaveBeenCalledWith({ ultimosMeses: 6 });
    expect(fixture.nativeElement.textContent).toContain('Luis Familiar');

    rango.value = '1';
    rango.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(listarCuotasGrupoFamiliar).toHaveBeenLastCalledWith({ ultimosMeses: 1 });
    expect(fixture.nativeElement.textContent).not.toContain('Luis Familiar');
    expect(fixture.nativeElement.textContent).not.toContain('NataciÃ³n');
    expect(fixture.nativeElement.textContent).toContain('Mostrar el último mes');
  });

  it('inicia el checkout con una única cuota', () => {
    const { fixture, iniciarCobroMercadoPago } = crear();
    const componente = fixture.componentInstance as unknown as {
      manejarAccion: (evento: {
        accion: string;
        fila: { cuotaUuid: string; estado: 'PENDIENTE'; concepto: string; monto: number };
      }) => void;
    };

    componente.manejarAccion({
      accion: 'pagar-qr',
      fila: {
        cuotaUuid: 'cuota-pendiente',
        estado: 'PENDIENTE',
        concepto: 'Cuota social',
        monto: 1000,
      },
    });

    expect(iniciarCobroMercadoPago).toHaveBeenCalledWith({
      cuotaUuids: ['cuota-pendiente'],
      canalCobro: 'MERCADO_PAGO',
      medioPago: 'MERCADO_PAGO',
    });
  });

  it('muestra el checkout con QR sin marcar la cuota localmente', async () => {
    const { fixture, iniciarCobroMercadoPago, generarQr } = crear();
    iniciarCobroMercadoPago.mockReturnValue(
      of({
        mercadoPagoInitPoint: 'https://www.mercadopago.com.ar/checkout',
        mercadoPagoPreferenceId: 'preferencia-1',
      }),
    );
    const componente = fixture.componentInstance as unknown as {
      manejarAccion: (evento: {
        accion: string;
        fila: { cuotaUuid: string; estado: 'PENDIENTE'; concepto: string; monto: number };
      }) => void;
    };

    componente.manejarAccion({
      accion: 'pagar-qr',
      fila: {
        cuotaUuid: 'cuota-pendiente',
        estado: 'PENDIENTE',
        concepto: 'Cuota social',
        monto: 1000,
      },
    });
    await Promise.resolve();

    expect(generarQr).toHaveBeenCalledWith('https://www.mercadopago.com.ar/checkout');
    expect((fixture.componentInstance as any).checkout()).toMatchObject({
      enlace: 'https://www.mercadopago.com.ar/checkout',
      qr: 'data:image/png;base64,qr',
      preferenceId: 'preferencia-1',
    });
    expect((fixture.componentInstance as any).grupo().personas[0].cuotas[0].estado).toBe(
      'PENDIENTE',
    );
  });
});
