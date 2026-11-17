import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PerfilEmpresaDto } from '../../../../../core/api/interfaces/empresa.interfaces';
import { FormularioPerfilClubComponent } from './formulario-perfil-club.component';

const perfilCompleto: PerfilEmpresaDto = {
  path: 'club-norte',
  nombreComercial: ' Club Norte ',
  razonSocial: 'Club Norte SA',
  cuit: '20000000001',
  domicilio: { direccion: 'Av. Siempre Viva 123', codigoPostal: '1406', localidad: 'CABA' },
  domicilioFacturacion: {
    direccion: 'Av. Siempre Viva 123',
    codigoPostal: '1406',
    localidad: 'CABA',
  },
  telefono: '1140001000',
  emailFacturaElectronica: 'FACTURAS@CLUBNORTE.COM',
  emailInstitucional: 'INFO@CLUBNORTE.COM',
  colorPrimario: '#003366',
  colorSecundario: '#FFCC00',
  cuotaSocialHabilitada: true,
  periodicidadCuotaSocial: 'SEMESTRAL',
};

describe('FormularioPerfilClubComponent', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi
        .fn()
        .mockReturnValue({
          matches: false,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        }),
    });
  });

  it('no emite cuando faltan campos obligatorios', () => {
    TestBed.configureTestingModule({ imports: [FormularioPerfilClubComponent] });
    const fixture = TestBed.createComponent(FormularioPerfilClubComponent);
    const enviados: unknown[] = [];
    fixture.componentInstance.enviado.subscribe((payload) => enviados.push(payload));
    fixture.detectChanges();

    fixture.nativeElement
      .querySelector('#formulario-perfil-club')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(enviados).toEqual([]);
  });

  it('precarga y emite el perfil completo normalizado', () => {
    TestBed.configureTestingModule({ imports: [FormularioPerfilClubComponent] });
    const fixture = TestBed.createComponent(FormularioPerfilClubComponent);
    fixture.componentRef.setInput('perfil', perfilCompleto);
    const enviados: unknown[] = [];
    fixture.componentInstance.enviado.subscribe((payload) => enviados.push(payload));
    fixture.detectChanges();

    fixture.nativeElement
      .querySelector('#formulario-perfil-club')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(enviados[0]).toEqual({
      ...perfilCompleto,
      nombreComercial: 'Club Norte',
      emailFacturaElectronica: 'facturas@clubnorte.com',
      emailInstitucional: 'info@clubnorte.com',
      periodicidadCuotaSocial: 'SEMESTRAL',
    });
    expect(enviados[0]).not.toHaveProperty('fax');
    expect(enviados[0]).not.toHaveProperty('domicilioEntregaFacturas');
    expect(enviados[0]).not.toHaveProperty('telefonoPagoProveedores');
    expect(enviados[0]).not.toHaveProperty('personasAutorizadasOpenData');
  });

  it('usa MENSUAL cuando el perfil no tiene una periodicidad reconocida', () => {
    TestBed.configureTestingModule({ imports: [FormularioPerfilClubComponent] });
    const fixture = TestBed.createComponent(FormularioPerfilClubComponent);
    fixture.componentRef.setInput('perfil', { ...perfilCompleto, periodicidadCuotaSocial: null });
    const enviados: unknown[] = [];
    fixture.componentInstance.enviado.subscribe((payload) => enviados.push(payload));
    fixture.detectChanges();

    fixture.nativeElement
      .querySelector('#formulario-perfil-club')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(enviados[0]).toMatchObject({ periodicidadCuotaSocial: 'MENSUAL' });
  });
});
