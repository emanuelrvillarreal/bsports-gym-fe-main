import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PerfilEmpresaDto } from '../../../../core/api/interfaces/empresa.interfaces';
import { FormularioConfiguracionEmpresaComponent } from './formulario-configuracion-empresa.component';

const perfil = {
  nombreComercial: 'Club Norte',
  razonSocial: 'Club Norte SA',
  cuit: '20000000001',
  domicilio: { direccion: 'Av. Norte 1', codigoPostal: '1000', localidad: 'CABA' },
  domicilioFacturacion: { direccion: 'Av. Norte 1', codigoPostal: '1000', localidad: 'CABA' },
  telefono: '1140001000',
  emailFacturaElectronica: 'facturas@clubnorte.com',
  emailInstitucional: 'info@clubnorte.com',
  colorPrimario: '#003366',
  colorSecundario: '#FFCC00',
  cuotaSocialHabilitada: true,
  importeCuotaSocial: 15000,
  diasVencimientoCuota: 10,
  diasVencimientoMoroso: 31,
  diasInhabilitacion: 91,
} satisfies PerfilEmpresaDto;

describe('FormularioConfiguracionEmpresaComponent', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((media: string) => ({
        matches: false,
        media,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  it('emite solo los campos de contacto y comunicación', () => {
    TestBed.configureTestingModule({ imports: [FormularioConfiguracionEmpresaComponent] });
    const fixture = TestBed.createComponent(FormularioConfiguracionEmpresaComponent);
    fixture.componentRef.setInput('perfil', perfil);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#empresa-dias-vencimiento-cuota')).toBeNull();
    const enviados: unknown[] = [];
    fixture.componentInstance.configuracionEnviada.subscribe((payload) => enviados.push(payload));

    fixture.nativeElement
      .querySelector('#formulario-configuracion-empresa')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(enviados).toEqual([
      {
        telefono: perfil.telefono,
        emailInstitucional: perfil.emailInstitucional,
        emailFacturaElectronica: perfil.emailFacturaElectronica,
      },
    ]);
  });
});
