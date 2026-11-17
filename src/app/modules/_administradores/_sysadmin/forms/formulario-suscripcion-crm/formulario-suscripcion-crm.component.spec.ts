import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PlanCrmDto } from '../../../../../core/api/interfaces/crm.interfaces';
import {
  FormularioSuscripcionCrmComponent,
  SeleccionSuscripcionCrm,
} from './formulario-suscripcion-crm.component';

const PLAN_ECONOMICO: PlanCrmDto = {
  codigo: 'basico',
  nombre: 'Básico',
  descripcion: 'Plan inicial',
  precio: 10000,
  precioEsFinal: true,
  alicuotaIva: 21,
  periodicidad: { codigo: 'mensual' },
  productos: [{ codigo: 'socios', nombre: 'Socios', unidades: 100 }],
};

const PLAN_PREMIUM: PlanCrmDto = {
  ...PLAN_ECONOMICO,
  codigo: 'premium',
  nombre: 'Premium',
  precio: 30000,
};

describe('FormularioSuscripcionCrmComponent', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    });
    TestBed.configureTestingModule({ imports: [FormularioSuscripcionCrmComponent] });
  });

  it('muestra primero el plan vigente al cambiarlo y lo deja seleccionado', () => {
    const fixture = TestBed.createComponent(FormularioSuscripcionCrmComponent);
    fixture.componentRef.setInput('modo', 'cambiar-plan');
    fixture.componentRef.setInput('planes', [PLAN_PREMIUM, PLAN_ECONOMICO]);
    fixture.componentRef.setInput('codigoPlanActual', 'premium');
    fixture.detectChanges();

    const componente = fixture.componentInstance as unknown as {
      planesVista(): readonly {
        plan: PlanCrmDto;
        esActual: boolean;
        tarjeta: { badge?: { text: string } | null };
      }[];
      codigoPlan(): string;
    };
    expect(componente.planesVista()[0].plan.codigo).toBe('premium');
    expect(componente.planesVista()[0].esActual).toBe(true);
    expect(componente.planesVista()[1].tarjeta.badge?.text).toBe('Más económico');
    expect(componente.codigoPlan()).toBe('premium');
  });

  it('aplica el plan visible al navegar el carrusel de cambio', () => {
    const fixture = TestBed.createComponent(FormularioSuscripcionCrmComponent);
    fixture.componentRef.setInput('modo', 'cambiar-plan');
    fixture.componentRef.setInput('planes', [PLAN_PREMIUM, PLAN_ECONOMICO]);
    fixture.componentRef.setInput('codigoPlanActual', 'premium');
    fixture.detectChanges();

    const componente = fixture.componentInstance as unknown as {
      seleccionarPlanVisible(indice: number): void;
      enviar(): void;
    };
    const emitido = vi.fn<(payload: SeleccionSuscripcionCrm) => void>();
    fixture.componentInstance.enviado.subscribe(emitido);

    componente.seleccionarPlanVisible(1);
    componente.enviar();

    expect(emitido).toHaveBeenCalledWith({
      codigoPlan: 'basico',
    });
  });

  it('emite únicamente el código del plan al suscribir', () => {
    const fixture = TestBed.createComponent(FormularioSuscripcionCrmComponent);
    fixture.componentRef.setInput('modo', 'suscribir');
    fixture.componentRef.setInput('planes', [PLAN_ECONOMICO]);
    fixture.detectChanges();

    const componente = fixture.componentInstance as unknown as {
      codigoPlan: { set(value: string): void };
      enviar(): void;
    };
    const emitido = vi.fn<(payload: SeleccionSuscripcionCrm) => void>();
    fixture.componentInstance.enviado.subscribe(emitido);
    componente.codigoPlan.set('basico');
    componente.enviar();

    expect(emitido).toHaveBeenCalledWith({ codigoPlan: 'basico' });
  });

  it('emite un descuento por monto con dos decimales al suscribir', () => {
    const fixture = TestBed.createComponent(FormularioSuscripcionCrmComponent);
    fixture.componentRef.setInput('modo', 'suscribir');
    fixture.componentRef.setInput('planes', [PLAN_ECONOMICO]);
    fixture.detectChanges();

    const componente = fixture.componentInstance as unknown as {
      aplicarDescuento: { set(value: boolean): void };
      tipoDescuento: { set(value: 'MONTO' | 'PORCENTAJE'): void };
      montoDescuento: { set(value: string): void };
      cantidadPeriodosDescuento: { set(value: string): void };
      enviar(): void;
    };
    const emitido = vi.fn<(payload: SeleccionSuscripcionCrm) => void>();
    fixture.componentInstance.enviado.subscribe(emitido);
    componente.aplicarDescuento.set(true);
    componente.tipoDescuento.set('MONTO');
    componente.montoDescuento.set('1500.25');
    componente.cantidadPeriodosDescuento.set('3');
    componente.enviar();

    expect(emitido).toHaveBeenCalledWith({
      codigoPlan: 'basico',
      descuento: {
        tipoDescuento: 'MONTO',
        monto: 1500.25,
        porcentaje: null,
        cantPeriodos: 3,
      },
    });
  });

  it('emite un descuento por porcentaje y rechaza valores decimales', () => {
    const fixture = TestBed.createComponent(FormularioSuscripcionCrmComponent);
    fixture.componentRef.setInput('modo', 'suscribir');
    fixture.componentRef.setInput('planes', [PLAN_ECONOMICO]);
    fixture.detectChanges();

    const componente = fixture.componentInstance as unknown as {
      aplicarDescuento: { set(value: boolean): void };
      tipoDescuento: { set(value: 'MONTO' | 'PORCENTAJE'): void };
      porcentajeDescuento: { set(value: string): void };
      cantidadPeriodosDescuento: { set(value: string): void };
      enviar(): void;
    };
    const emitido = vi.fn<(payload: SeleccionSuscripcionCrm) => void>();
    fixture.componentInstance.enviado.subscribe(emitido);
    componente.aplicarDescuento.set(true);
    componente.tipoDescuento.set('PORCENTAJE');
    componente.porcentajeDescuento.set('10.5');
    componente.cantidadPeriodosDescuento.set('3');
    componente.enviar();

    expect(emitido).not.toHaveBeenCalled();

    componente.porcentajeDescuento.set('10');
    componente.enviar();

    expect(emitido).toHaveBeenCalledWith({
      codigoPlan: 'basico',
      descuento: {
        tipoDescuento: 'PORCENTAJE',
        monto: null,
        porcentaje: 10,
        cantPeriodos: 3,
      },
    });
  });

  it('selecciona la card principal ordenada por precio al suscribir', () => {
    const fixture = TestBed.createComponent(FormularioSuscripcionCrmComponent);
    fixture.componentRef.setInput('modo', 'suscribir');
    fixture.componentRef.setInput('planes', [PLAN_PREMIUM, PLAN_ECONOMICO]);
    fixture.detectChanges();

    const componente = fixture.componentInstance as unknown as {
      codigoPlan(): string;
      enviar(): void;
    };
    const emitido = vi.fn<(payload: SeleccionSuscripcionCrm) => void>();
    fixture.componentInstance.enviado.subscribe(emitido);

    expect(componente.codigoPlan()).toBe('basico');
    componente.enviar();

    expect(emitido).toHaveBeenCalledWith({ codigoPlan: 'basico' });
  });
});
