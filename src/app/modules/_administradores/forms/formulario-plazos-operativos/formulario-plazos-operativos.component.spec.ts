import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PerfilEmpresaDto } from '../../../../core/api/interfaces/empresa.interfaces';
import { FormularioPlazosOperativosComponent } from './formulario-plazos-operativos.component';

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
  periodicidadCuotaSocial: 'TRIMESTRAL',
  diasVencimientoCuota: 12,
  diasVencimientoMoroso: 31,
  diasInhabilitacion: 91,
} satisfies PerfilEmpresaDto;

describe('FormularioPlazosOperativosComponent', () => {
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

  it('emite la periodicidad y plazos precargados', () => {
    TestBed.configureTestingModule({ imports: [FormularioPlazosOperativosComponent] });
    const fixture = TestBed.createComponent(FormularioPlazosOperativosComponent);
    fixture.componentRef.setInput('perfil', perfil);
    const enviados: unknown[] = [];
    fixture.componentInstance.enviado.subscribe((payload) => enviados.push(payload));
    fixture.detectChanges();

    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(enviados).toEqual([
      {
        periodicidadCuotaSocial: 'TRIMESTRAL',
        diasVencimientoCuota: 12,
        diasVencimientoMoroso: 31,
        diasInhabilitacion: 91,
      },
    ]);
  });

  it('usa MENSUAL y 10 días de vencimiento cuando faltan valores en el perfil', () => {
    TestBed.configureTestingModule({ imports: [FormularioPlazosOperativosComponent] });
    const fixture = TestBed.createComponent(FormularioPlazosOperativosComponent);
    fixture.componentRef.setInput('perfil', null);
    const enviados: unknown[] = [];
    fixture.componentInstance.enviado.subscribe((payload) => enviados.push(payload));
    fixture.detectChanges();

    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(enviados).toEqual([
      {
        periodicidadCuotaSocial: 'MENSUAL',
        diasVencimientoCuota: 10,
      },
    ]);
  });

  it('no emite plazos inválidos', () => {
    TestBed.configureTestingModule({ imports: [FormularioPlazosOperativosComponent] });
    const fixture = TestBed.createComponent(FormularioPlazosOperativosComponent);
    const enviados: unknown[] = [];
    fixture.componentInstance.enviado.subscribe((payload) => enviados.push(payload));
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector(
      '#plazos-dias-vencimiento-cuota',
    ) as HTMLInputElement;
    input.value = '0';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(enviados).toEqual([]);
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'mayor a cero',
    );
  });
});
