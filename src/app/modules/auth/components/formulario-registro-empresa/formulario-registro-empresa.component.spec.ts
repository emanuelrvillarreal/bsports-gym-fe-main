import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RegistroEmpresaPayload } from '../../../../core/api/interfaces/empresa.interfaces';
import { FormularioRegistroEmpresaComponent } from './formulario-registro-empresa.component';

interface FormularioEmpresaTesteable {
  readonly registroForm: {
    setValue(valor: Record<string, unknown>): void;
    patchValue(valor: Record<string, unknown>): void;
  };
  obtenerPayloadValido(): RegistroEmpresaPayload | null;
}

describe('FormularioRegistroEmpresaComponent', () => {
  beforeEach(async () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    });
    await TestBed.configureTestingModule({
      imports: [FormularioRegistroEmpresaComponent],
    }).compileComponents();
  });

  it('rechaza el alta si faltan los códigos fiscales obligatorios del CRM', () => {
    const fixture = TestBed.createComponent(FormularioRegistroEmpresaComponent);
    const component = fixture.componentInstance as unknown as FormularioEmpresaTesteable;
    component.registroForm.setValue(crearValorFormulario());

    expect(component.obtenerPayloadValido()).toBeNull();
    fixture.destroy();
  });

  it('normaliza y emite los códigos fiscales sin suscripción inicial', () => {
    const fixture = TestBed.createComponent(FormularioRegistroEmpresaComponent);
    const component = fixture.componentInstance as unknown as FormularioEmpresaTesteable;
    component.registroForm.setValue(
      crearValorFormulario({
        codigoCondicionImpositiva: 'RI',
        codigoProvincia: 'BA',
        periodicidadCuotaSocial: 'TRIMESTRAL',
      }),
    );

    const payload = component.obtenerPayloadValido();
    expect(payload).not.toBeNull();
    expect(payload).toMatchObject({
      path: 'club-atletico-norte',
      codigoCondicionImpositiva: 'RI',
      codigoProvincia: 'BA',
      periodicidadCuotaSocial: 'TRIMESTRAL',
    });
    expect(payload).not.toHaveProperty('codigoPlan');
    expect(payload).not.toHaveProperty('fax');
    expect(payload).not.toHaveProperty('importeCuotaSocial');
    expect(payload).not.toHaveProperty('domicilioEntregaFacturas');
    expect(payload).not.toHaveProperty('telefonoPagoProveedores');
    expect(payload).not.toHaveProperty('personasAutorizadasOpenData');
    fixture.destroy();
  });

  it('usa MENSUAL como periodicidad inicial', () => {
    const fixture = TestBed.createComponent(FormularioRegistroEmpresaComponent);
    const component = fixture.componentInstance as unknown as FormularioEmpresaTesteable;
    component.registroForm.setValue(
      crearValorFormulario({
        codigoCondicionImpositiva: 'RI',
        codigoProvincia: 'BA',
      }),
    );

    expect(component.obtenerPayloadValido()?.periodicidadCuotaSocial).toBe('MENSUAL');
    fixture.destroy();
  });
});

function crearValorFormulario(codigos?: {
  readonly codigoCondicionImpositiva: string;
  readonly codigoProvincia: string;
  readonly periodicidadCuotaSocial?: string;
}): Record<string, unknown> {
  const domicilio = { direccion: 'Av. Libertador 1200', codigoPostal: '1425', localidad: 'CABA' };
  return {
    nombreComercial: ' Club Atletico Norte ',
    razonSocial: 'Club Atletico Norte S.A.',
    cuit: '20000000001',
    domicilio,
    domicilioFacturacion: domicilio,
    telefono: '1140001000',
    emailFacturaElectronica: 'facturas@club.com',
    emailInstitucional: 'info@club.com',
    colorPrimario: '#003366',
    colorSecundario: '#FFCC00',
    cuotaSocialHabilitada: false,
    codigoCondicionImpositiva: codigos?.codigoCondicionImpositiva ?? '',
    codigoProvincia: codigos?.codigoProvincia ?? '',
    periodicidadCuotaSocial: codigos?.periodicidadCuotaSocial ?? 'MENSUAL',
    diasVencimientoMoroso: null,
    diasInhabilitacion: null,
    admin: {
      nombre: 'Maria',
      apellido: 'Gonzalez',
      email: 'admin@club.com',
      password: 'abc',
      confirmarPassword: 'abc',
    },
  };
}
