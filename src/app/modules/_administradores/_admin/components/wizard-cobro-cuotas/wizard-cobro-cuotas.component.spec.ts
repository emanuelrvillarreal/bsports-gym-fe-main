import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CuotaRowDto } from '../../../../../core/api/interfaces/tesoreria.interfaces';
import { SocioDto } from '../../../../../core/api/interfaces/socios.interfaces';
import { SociosApiService } from '../../../../../core/api/services/socios-api.service';
import { TesoreriaApiService } from '../../../../../core/api/services/tesoreria-api.service';
import { ColorThemeService } from '../../../../ui/color-mod/color-theme.service';
import { ThemeModeService } from '../../../../ui/dark-mode/theme-mode.service';
import { ToastAlertService } from '../../../../ui/toast-alert/services/toast-alert.service';
import { MercadoPagoCheckoutService } from '../../../../pagos/services/mercado-pago-checkout.service';
import { WizardCobroCuotasComponent } from './wizard-cobro-cuotas.component';

const familiar: SocioDto = {
  memberUuid: 'familiar-1',
  nombre: 'María',
  apellido: 'Gómez',
  email: 'maria@example.com',
  estado: 'MOROSO',
  titular: false,
  titularMemberUuid: 'titular-1',
  parentesco: 'HIJA',
};

const cuota = (
  uuid: string,
  medioPersona = 'familiar-1',
  montoFinal?: number | null,
): CuotaRowDto => ({
  cuotaUuid: uuid,
  concepto: `Cuota ${uuid}`,
  tipo: 'SOCIAL',
  origen: 'CICLO_MENSUAL',
  monto: 200,
  montoFinal,
  vencimiento: '21/06/2026',
  estado: 'VENCIDA',
  diasMora: 10,
  personaMemberUuid: medioPersona,
  personaNombre: 'María',
  personaApellido: 'Gómez',
  personaEstado: 'MOROSO',
  titularMemberUuid: 'titular-1',
  titularNombre: 'Carlos',
  titularApellido: 'Gómez',
});

describe('WizardCobroCuotasComponent', () => {
  let fixture: ComponentFixture<WizardCobroCuotasComponent>;
  let tesoreriaApi: {
    paginarCuotas: ReturnType<typeof vi.fn>;
    cobrarManual: ReturnType<typeof vi.fn>;
    iniciarCobroMercadoPago: ReturnType<typeof vi.fn>;
  };
  let toast: {
    confirm: ReturnType<typeof vi.fn>;
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    tesoreriaApi = {
      paginarCuotas: vi.fn((payload: { page: number }) =>
        of({
          content: payload.page === 1 ? [cuota('c-1')] : [cuota('c-2')],
          totalElements: 2,
          totalPages: 2,
        }),
      ),
      cobrarManual: vi.fn((payload: { cuotaUuids: readonly string[] }) =>
        of({
          items: payload.cuotaUuids.map((cuotaUuid) => ({ cuotaUuid, exitoso: true })),
          exitosas: payload.cuotaUuids.length,
          fallidas: 0,
        }),
      ),
      iniciarCobroMercadoPago: vi.fn(() =>
        of({
          mercadoPagoInitPoint: 'https://www.mercadopago.com.ar/checkout',
          mercadoPagoPreferenceId: 'preferencia-wizard',
        }),
      ),
    };
    toast = {
      confirm: vi.fn(() => Promise.resolve(true)),
      success: vi.fn(),
      error: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [WizardCobroCuotasComponent],
      providers: [
        {
          provide: SociosApiService,
          useValue: { paginar: () => of({ content: [], totalPages: 0 }) },
        },
        { provide: TesoreriaApiService, useValue: tesoreriaApi },
        {
          provide: MercadoPagoCheckoutService,
          useValue: {
            normalizarEnlace: (enlace: string) => enlace,
            generarQr: vi.fn(() => Promise.resolve('data:image/png;base64,qr')),
            copiarEnlace: vi.fn(() => Promise.resolve(true)),
            abrirCheckout: vi.fn(() => true),
          },
        },
        { provide: ToastAlertService, useValue: toast },
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

    fixture = TestBed.createComponent(WizardCobroCuotasComponent);
    fixture.componentRef.setInput('abierto', true);
    fixture.detectChanges();
  });

  it('consulta únicamente la deuda del familiar seleccionado', () => {
    fixture.componentInstance['manejarSocio']({
      accion: 'seleccionar',
      fila: { ...familiar, tipoIntegrante: 'Familiar · HIJA', deuda: '' },
    });

    expect(tesoreriaApi.paginarCuotas).toHaveBeenCalledWith({
      page: 1,
      size: 20,
      estados: ['PENDIENTE', 'VENCIDA'],
      personaMemberUuid: 'familiar-1',
      orden: 'VENCIMIENTO_ASC',
    });
    expect(fixture.componentInstance.pasoActual()).toBe('deuda');
  });

  it('usa montoFinal para el total y muestra ambos importes cuando difieren', () => {
    const componente = fixture.componentInstance;
    componente['cuotasPagina'].set([cuota('c-final', 'familiar-1', 250)]);
    componente['cuotasConocidas'].set([cuota('c-final', 'familiar-1', 250)]);
    componente['seleccionadas'].set(new Set(['c-final']));

    expect(componente['totalSeleccionado']()).toBe(250);
    expect(componente['montoFinalDifiere'](cuota('c-final', 'familiar-1', 250))).toBe(true);

    componente['pasoActual'].set('deuda');
    fixture.detectChanges();

    const importe = fixture.nativeElement.querySelector('.wizard-cobro__importe-cuota');
    expect(importe.textContent).toContain('$200');
    expect(importe.textContent).toContain('$250');
    expect(importe.querySelector('del')).not.toBeNull();

    componente['pasoActual'].set('confirmacion');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.wizard-cobro__resumen del')).not.toBeNull();
  });

  it('consulta la deuda de todo el grupo cuando se selecciona al titular', () => {
    fixture.componentInstance['manejarSocio']({
      accion: 'seleccionar',
      fila: {
        ...familiar,
        memberUuid: 'titular-1',
        titular: true,
        titularMemberUuid: null,
        tipoIntegrante: 'Titular',
        deuda: '',
      },
    });

    expect(tesoreriaApi.paginarCuotas).toHaveBeenCalledWith({
      page: 1,
      size: 20,
      estados: ['PENDIENTE', 'VENCIDA'],
      titularMemberUuid: 'titular-1',
      orden: 'VENCIMIENTO_ASC',
    });
  });

  it('selecciona todas las páginas conservando UUID únicos', () => {
    fixture.componentInstance['manejarSocio']({
      accion: 'seleccionar',
      fila: { ...familiar, tipoIntegrante: 'Familiar · HIJA', deuda: '' },
    });
    // Arranca todo marcado: el botón primero destilda y después vuelve a marcar todas las páginas.
    fixture.componentInstance['alternarSeleccionTotal']();
    expect(fixture.componentInstance.cuotasSeleccionadas()).toEqual([]);
    fixture.componentInstance['alternarSeleccionTotal']();

    expect(
      fixture.componentInstance
        .cuotasSeleccionadas()
        .map((item) => item.cuotaUuid)
        .sort(),
    ).toEqual(['c-1', 'c-2']);
  });

  it('agrupa por medio de pago y evita un request por cuota', async () => {
    const componente = fixture.componentInstance as any;
    componente.cuotasConocidas.set([cuota('c-1'), cuota('c-2'), cuota('c-3')]);
    componente.seleccionadas.set(new Set(['c-1', 'c-2', 'c-3']));
    componente.modoMedios.set('por-cuota');
    componente.mediosPorCuota.set({
      'c-1': 'EFECTIVO',
      'c-2': 'EFECTIVO',
      'c-3': 'TRANSFERENCIA',
    });
    componente.pasoActual.set('confirmacion');

    await fixture.componentInstance.confirmarCobro();

    expect(tesoreriaApi.cobrarManual).toHaveBeenCalledTimes(2);
    expect(tesoreriaApi.cobrarManual).toHaveBeenCalledWith(
      { cuotaUuids: ['c-1', 'c-2'], canalCobro: 'MANUAL', medioPago: 'EFECTIVO' },
      { mostrarToastExito: false },
    );
    expect(tesoreriaApi.cobrarManual).toHaveBeenCalledWith(
      { cuotaUuids: ['c-3'], canalCobro: 'MANUAL', medioPago: 'TRANSFERENCIA' },
      { mostrarToastExito: false },
    );
  });

  it('crea una sola preferencia Mercado Pago para el total seleccionado', async () => {
    const componente = fixture.componentInstance as any;
    componente.cuotasConocidas.set([cuota('c-1'), cuota('c-2')]);
    componente.seleccionadas.set(new Set(['c-1', 'c-2']));
    componente.modoMedios.set('total');
    componente.medioGlobal.set('MERCADO_PAGO');
    componente.pasoActual.set('confirmacion');

    await fixture.componentInstance.confirmarCobro();
    await Promise.resolve();

    expect(tesoreriaApi.iniciarCobroMercadoPago).toHaveBeenCalledOnce();
    expect(tesoreriaApi.iniciarCobroMercadoPago).toHaveBeenCalledWith({
      cuotaUuids: ['c-1', 'c-2'],
      canalCobro: 'MERCADO_PAGO',
      medioPago: 'MERCADO_PAGO',
    });
    expect(tesoreriaApi.cobrarManual).not.toHaveBeenCalled();
    expect(componente.checkout()).toMatchObject({
      preferenceId: 'preferencia-wizard',
      qr: 'data:image/png;base64,qr',
    });
    expect(componente.cuotasSeleccionadas().map((item: CuotaRowDto) => item.cuotaUuid)).toEqual([
      'c-1',
      'c-2',
    ]);
  });

  it('conserva únicamente las cuotas fallidas para reintentar', async () => {
    tesoreriaApi.cobrarManual.mockReturnValueOnce(
      of({
        items: [
          { cuotaUuid: 'c-1', exitoso: true },
          { cuotaUuid: 'c-2', exitoso: false, mensajeError: 'Rechazado' },
        ],
        exitosas: 1,
        fallidas: 1,
      }),
    );
    const componente = fixture.componentInstance as any;
    componente.cuotasConocidas.set([cuota('c-1'), cuota('c-2')]);
    componente.seleccionadas.set(new Set(['c-1', 'c-2']));
    componente.modoMedios.set('total');
    componente.medioGlobal.set('EFECTIVO');
    componente.pasoActual.set('confirmacion');
    const actualizado = vi.spyOn(fixture.componentInstance.cobrosActualizados, 'emit');

    await fixture.componentInstance.confirmarCobro();

    expect(actualizado).toHaveBeenCalledOnce();
    expect(componente.seleccionadas()).toEqual(new Set(['c-2']));
    expect(toast.error).toHaveBeenCalled();
  });

  it('marca toda la deuda al elegir al socio', () => {
    fixture.componentInstance['manejarSocio']({
      accion: 'seleccionar',
      fila: { ...familiar, tipoIntegrante: 'Familiar · HIJA', deuda: '' },
    });

    expect(
      fixture.componentInstance
        .cuotasSeleccionadas()
        .map((item) => item.cuotaUuid)
        .sort(),
    ).toEqual(['c-1', 'c-2']);
  });

  it('arranca en "¿Cómo paga?" con la cuota elegida desde la tabla', () => {
    fixture.componentInstance.iniciarConCuota(cuota('c-tabla', 'familiar-1', 300));

    expect(fixture.componentInstance.pasoActual()).toBe('confirmacion');
    expect(fixture.componentInstance.cuotasSeleccionadas().map((item) => item.cuotaUuid)).toEqual([
      'c-tabla',
    ]);
    expect(fixture.componentInstance.textoConfirmar()).toBe('Cobrar $300');
  });

  it('muestra la pantalla de cobro registrado en lugar de cerrar', async () => {
    const componente = fixture.componentInstance as any;
    componente.cuotasConocidas.set([cuota('c-1')]);
    componente.seleccionadas.set(new Set(['c-1']));
    componente.pagador.set('Ana Pérez');
    componente.medioGlobal.set('EFECTIVO');
    componente.pasoActual.set('confirmacion');
    const completado = vi.spyOn(fixture.componentInstance.completado, 'emit');

    await fixture.componentInstance.confirmarCobro();
    fixture.detectChanges();

    expect(fixture.componentInstance.pasoActual()).toBe('listo');
    expect(completado).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Cobro registrado');
    expect(fixture.nativeElement.textContent).toContain('Ana Pérez pagó 1 cuota con efectivo.');

    fixture.componentInstance.finalizar();
    expect(completado).toHaveBeenCalledOnce();
  });
});
