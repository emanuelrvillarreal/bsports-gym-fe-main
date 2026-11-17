import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  PerfilEmpresaDto,
  PerfilEmpresaPayload,
} from '../../../../core/api/interfaces/empresa.interfaces';
import { AuthSessionService } from '../../../../core/global-services/services/auth-session.service';
import { PerfilEmpresaActivaService } from '../../../_compartido-perfiles/services/perfil-empresa-activa.service';
import { ColorThemeService } from '../../../ui/color-mod/color-theme.service';
import { GestionPlazosOperativosComponent } from './gestion-plazos-operativos.component';

const perfil = {
  path: 'club-norte',
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
  periodicidadCuotaSocial: 'BIMESTRAL',
  diasVencimientoCuota: 10,
  diasVencimientoMoroso: 31,
  diasInhabilitacion: 91,
} satisfies PerfilEmpresaDto;

describe('GestionPlazosOperativosComponent', () => {
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

  it('guarda periodicidad y plazos preservando el perfil institucional', () => {
    const actualizarPerfil = vi.fn((_companyUuid: string, _payload: PerfilEmpresaPayload) =>
      of({}),
    );
    TestBed.configureTestingModule({
      imports: [GestionPlazosOperativosComponent],
      providers: [
        {
          provide: AuthSessionService,
          useValue: { obtenerCompanyUuid: () => 'empresa-1', obtenerRolActivo: () => 'ADMIN' },
        },
        {
          provide: PerfilEmpresaActivaService,
          useValue: { obtenerPerfil: () => of(perfil), actualizarPerfil },
        },
        {
          provide: ColorThemeService,
          useValue: {
            obtenerPaletaPredeterminada: () => ({ primario: '#4982fd', secundario: '#2563eb' }),
          },
        },
      ],
    });
    TestBed.overrideComponent(GestionPlazosOperativosComponent, {
      set: { template: '', imports: [] },
    });
    const fixture = TestBed.createComponent(GestionPlazosOperativosComponent);
    fixture.detectChanges();

    const componente = fixture.componentInstance as unknown as {
      guardarPlazos(valor: {
        periodicidadCuotaSocial: 'ANUAL';
        diasVencimientoCuota: number;
      }): void;
    };
    componente.guardarPlazos({ periodicidadCuotaSocial: 'ANUAL', diasVencimientoCuota: 10 });

    expect(actualizarPerfil).toHaveBeenCalledWith(
      'empresa-1',
      expect.objectContaining({
        nombreComercial: 'Club Norte',
        path: 'club-norte',
        cuotaSocialHabilitada: true,
        periodicidadCuotaSocial: 'ANUAL',
        diasVencimientoCuota: 10,
      }),
    );
    const payload = actualizarPerfil.mock.calls[0][1] as unknown as Record<string, unknown>;
    expect(payload).not.toHaveProperty('diasVencimientoMoroso');
    expect(payload).not.toHaveProperty('diasInhabilitacion');
    fixture.destroy();
  });
});
