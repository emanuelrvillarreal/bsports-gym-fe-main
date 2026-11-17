import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EmpresaApiService } from '../../../../../core/api/services/empresa-api.service';
import { SysadminApiService } from '../../../../../core/api/services/sysadmin-api.service';
import { ToastAlertService } from '../../../../ui/toast-alert/services/toast-alert.service';
import { GestionCrmEmpresasComponent } from './gestion-crm-empresas.component';

describe('GestionCrmEmpresasComponent', () => {
  const empresasApi = {
    paginarClubes: vi.fn(() => of({ content: [], totalPages: 0 })),
  };
  const sysadminApi = {
    obtenerPlanesCrm: vi.fn(() => of([])),
    suscribirEmpresaCrm: vi.fn(() => of({})),
    cambiarPlanEmpresaCrm: vi.fn(() => of({})),
    desuscribirEmpresaCrm: vi.fn(() => of({})),
  };
  const toast = {
    confirm: vi.fn(() => Promise.resolve(true)),
    confirmDanger: vi.fn(() => Promise.resolve(true)),
    error: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn().mockImplementation((media: string) => ({
        matches: false,
        media,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    empresasApi.paginarClubes.mockReturnValue(of({ content: [], totalPages: 0 }));
    sysadminApi.obtenerPlanesCrm.mockReturnValue(of([]));
    TestBed.configureTestingModule({
      imports: [GestionCrmEmpresasComponent],
      providers: [
        { provide: EmpresaApiService, useValue: empresasApi },
        { provide: SysadminApiService, useValue: sysadminApi },
        { provide: ToastAlertService, useValue: toast },
      ],
    });
  });

  it('pagina clubes y carga el catálogo de planes al iniciar', async () => {
    const fixture = TestBed.createComponent(GestionCrmEmpresasComponent);
    fixture.detectChanges();
    await Promise.resolve();

    expect(empresasApi.paginarClubes).toHaveBeenCalledWith({ page: 1, size: 10, search: '' });
    expect(sysadminApi.obtenerPlanesCrm).toHaveBeenCalledOnce();
  });

  it('expone solo Suscribir sin plan y Cambio/Baja con suscripción', () => {
    const fixture = TestBed.createComponent(GestionCrmEmpresasComponent);
    const componente = fixture.componentInstance as unknown as {
      acciones: readonly {
        id: string;
        visible(fila: object): boolean;
        deshabilitada?: (fila: object) => boolean;
      }[];
    };
    const sinPlan = { uuid: 'club-1', suscripcionCrm: null };
    const conPlan = {
      uuid: 'club-2',
      suscripcionCrm: {
        uuidSuscripcionCrm: 'sus-1',
        codigoPlan: 'basico',
        nombrePlan: 'Básico',
        estado: 'ACTIVA',
        fechaProximaFacturacion: null,
      },
    };

    expect(componente.acciones.map((accion) => [accion.id, accion.visible(sinPlan)])).toEqual([
      ['suscribir', true],
      ['cambiar-plan', false],
      ['dar-de-baja', false],
    ]);
    expect(componente.acciones.map((accion) => [accion.id, accion.visible(conPlan)])).toEqual([
      ['suscribir', false],
      ['cambiar-plan', true],
      ['dar-de-baja', true],
    ]);

    const anulada = {
      uuid: 'club-3',
      suscripcionCrm: {
        uuidSuscripcionCrm: 'sus-3',
        codigoPlan: 'basico',
        nombrePlan: 'BÃ¡sico',
        estado: 'ANULADA',
        fechaProximaFacturacion: null,
      },
    };
    expect(
      componente.acciones
        .filter((accion) => accion.id !== 'suscribir')
        .map((accion) => [accion.id, accion.deshabilitada?.(anulada)]),
    ).toEqual([
      ['cambiar-plan', true],
      ['dar-de-baja', true],
    ]);
  });

  it('mapea las fechas de la última factura en la fila de la tabla', () => {
    const fixture = TestBed.createComponent(GestionCrmEmpresasComponent);
    const componente = fixture.componentInstance as unknown as {
      empresas: { set(valor: readonly object[]): void };
      filas(): readonly {
        fechaGeneracionUltimaFactura: string;
        fechaVencimientoUltimaFactura: string;
      }[];
    };

    componente.empresas.set([
      {
        uuid: 'club-1',
        suscripcionCrm: null,
        ultimaFacturaEstado: 'PENDIENTE',
        ultimaFacturaFechaGeneracion: '07/09/2026',
        ultimaFacturaFechaVencimiento: '17/09/2026',
      },
    ]);

    expect(componente.filas()[0]).toMatchObject({
      fechaGeneracionUltimaFactura: '07/09/2026',
      fechaVencimientoUltimaFactura: '17/09/2026',
    });
  });

  it('separa el estado de suscripcion del estado de pago de la ultima factura', () => {
    const fixture = TestBed.createComponent(GestionCrmEmpresasComponent);
    const componente = fixture.componentInstance as unknown as {
      empresas: { set(valor: readonly object[]): void };
      filas(): readonly { estadoSuscripcion: string | null; estadoPago: string | null }[];
    };

    componente.empresas.set([
      {
        uuid: 'club-1',
        suscripcionCrm: {
          codigoPlan: 'plan-1',
          nombrePlan: 'Plan 1',
          uuidSuscripcionCrm: 'suscripcion-1',
          estado: 'PENDIENTE_PAGO',
          fechaProximaFacturacion: null,
        },
        ultimaFacturaEstado: 'VENCIDA',
      },
    ]);

    expect(componente.filas()[0]).toMatchObject({
      estadoSuscripcion: 'PENDIENTE_PAGO',
      estadoPago: 'VENCIDA',
    });
  });

  it('muestra suscripcion formateada y pago tal como llega, con su color', () => {
    const fixture = TestBed.createComponent(GestionCrmEmpresasComponent);
    const componente = fixture.componentInstance as unknown as {
      columnas: readonly {
        id: string;
        estadoTexto?: (valor: unknown) => string;
        estadoClase?: (valor: unknown) => string | null;
      }[];
    };
    const columnaSuscripcion = componente.columnas.find(
      (columna) => columna.id === 'estadoSuscripcion',
    );
    const columnaPago = componente.columnas.find((columna) => columna.id === 'estadoPago');

    expect(columnaSuscripcion?.estadoTexto?.('PENDIENTE_PAGO')).toBe('PENDIENTE PAGO');
    expect(columnaSuscripcion?.estadoTexto?.('VENCIDA')).toBe('VENCIDA');
    expect(columnaSuscripcion?.estadoTexto?.('ACTIVA')).toBe('ACTIVA');
    expect(columnaSuscripcion?.estadoTexto?.('EN_REVISION')).toBe('EN REVISION');

    expect(columnaPago?.estadoTexto?.('PENDIENTE_PAGO')).toBe('PENDIENTE_PAGO');
    expect(columnaPago?.estadoTexto?.('VENCIDA')).toBe('VENCIDA');
    expect(columnaPago?.estadoClase?.('PENDIENTE_PAGO')).toBe('tabla-responsive__estado--debe');
    expect(columnaPago?.estadoClase?.('VENCIDA')).toBe('tabla-responsive__estado--vencida');
    expect(columnaSuscripcion?.estadoClase?.('ACTIVA')).toBeNull();
    expect(columnaSuscripcion?.estadoClase?.('EN_REVISION')).toBe(
      'tabla-responsive__estado--inhabilitado',
    );
  });

  it('explica el 502 del catálogo de planes como un problema de permisos del CRM', async () => {
    sysadminApi.obtenerPlanesCrm.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 502 })),
    );
    const fixture = TestBed.createComponent(GestionCrmEmpresasComponent);
    fixture.detectChanges();
    await Promise.resolve();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('permisos de integración');
  });

  it('conserva el descuento al confirmar un cambio de plan', async () => {
    const fixture = TestBed.createComponent(GestionCrmEmpresasComponent);
    const componente = fixture.componentInstance as unknown as {
      empresaSeleccionada: { set(valor: { uuid: string }): void };
      modoFormulario: { set(valor: 'suscribir' | 'cambiar-plan'): void };
      guardarSeleccion(seleccion: {
        codigoPlan: string;
        descuento: {
          tipoDescuento: 'MONTO' | 'PORCENTAJE';
          monto: number | null;
          porcentaje: number | null;
          cantPeriodos: number;
        };
      }): Promise<void>;
    };
    const seleccion = {
      codigoPlan: 'plan-premium',
      descuento: {
        tipoDescuento: 'PORCENTAJE' as const,
        monto: null,
        porcentaje: 10,
        cantPeriodos: 3,
      },
    };
    componente.empresaSeleccionada.set({ uuid: 'club-1' });
    componente.modoFormulario.set('cambiar-plan');

    await componente.guardarSeleccion(seleccion);

    expect(sysadminApi.cambiarPlanEmpresaCrm).toHaveBeenCalledWith('club-1', seleccion);
  });
});
