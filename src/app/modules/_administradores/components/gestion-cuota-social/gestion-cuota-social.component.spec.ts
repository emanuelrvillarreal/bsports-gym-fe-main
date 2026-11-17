import { describe, expect, it } from 'vitest';

import { PerfilEmpresaDto, PerfilEmpresaPayload } from '../../../../core/api/interfaces/empresa.interfaces';
import { GestionCuotaSocialComponent } from './gestion-cuota-social.component';

describe('GestionCuotaSocialComponent', () => {
  it('usa los colores predeterminados al actualizar un perfil sin paleta', () => {
    const componente = Object.assign(Object.create(GestionCuotaSocialComponent.prototype), {
      colorThemeService: {
        obtenerPaletaPredeterminada: () => ({ primario: '#4982fd', secundario: '#2563eb' }),
      },
    }) as { extraerPayload(perfil: PerfilEmpresaDto, cuotaSocialHabilitada?: boolean): PerfilEmpresaPayload };
    const domicilio = { direccion: 'Calle 1', codigoPostal: '1000', localidad: 'CABA' };
    const perfil: PerfilEmpresaDto = {
      path: 'club-norte',
      nombreComercial: 'Club Norte',
      razonSocial: 'Club Norte SA',
      cuit: '20000000001',
      domicilio,
      domicilioFacturacion: domicilio,
      telefono: '1140001000',
      emailFacturaElectronica: 'facturas@club.com',
      emailInstitucional: 'info@club.com',
      colorPrimario: null,
      colorSecundario: null,
      cuotaSocialHabilitada: false,
    };

    expect(componente.extraerPayload(perfil)).toMatchObject({
      colorPrimario: '#4982fd',
      colorSecundario: '#2563eb',
      cuotaSocialHabilitada: false,
    });
  });

  it('convierte cuota social nula al estado booleano seleccionado', () => {
    const componente = Object.assign(Object.create(GestionCuotaSocialComponent.prototype), {
      colorThemeService: {
        obtenerPaletaPredeterminada: () => ({ primario: '#4982fd', secundario: '#2563eb' }),
      },
    }) as { extraerPayload(perfil: PerfilEmpresaDto, cuotaSocialHabilitada: boolean): PerfilEmpresaPayload };
    const domicilio = { direccion: 'Calle 1', codigoPostal: '1000', localidad: 'CABA' };
    const perfil: PerfilEmpresaDto = {
      path: 'club-norte', nombreComercial: 'Club Norte', razonSocial: 'Club Norte SA',
      cuit: '20000000001', domicilio, domicilioFacturacion: domicilio,
      telefono: '1140001000', emailFacturaElectronica: 'facturas@club.com',
      emailInstitucional: 'info@club.com', colorPrimario: null, colorSecundario: null,
      cuotaSocialHabilitada: null,
    };

    expect(componente.extraerPayload(perfil, true).cuotaSocialHabilitada).toBe(true);
  });
});
