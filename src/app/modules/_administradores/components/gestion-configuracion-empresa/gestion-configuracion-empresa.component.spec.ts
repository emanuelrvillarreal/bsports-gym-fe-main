import { describe, expect, it } from 'vitest';

import { PerfilEmpresaDto } from '../../../../core/api/interfaces/empresa.interfaces';
import { GestionConfiguracionEmpresaComponent } from './gestion-configuracion-empresa.component';

const perfil = {
  uuid: 'empresa-1',
  nombreComercial: 'Club Norte', razonSocial: 'Club Norte SA', cuit: '20000000001',
  domicilio: { direccion: 'Av. Norte 1', codigoPostal: '1000', localidad: 'CABA' },
  domicilioFacturacion: { direccion: 'Av. Norte 1', codigoPostal: '1000', localidad: 'CABA' },
  telefono: '1140001000',
  emailFacturaElectronica: 'facturas@clubnorte.com',
  emailInstitucional: 'info@clubnorte.com',
  colorPrimario: '#003366', colorSecundario: '#FFCC00', cuotaSocialHabilitada: true,
  diasVencimientoCuota: 10,
  path: 'club-norte',
} satisfies PerfilEmpresaDto;

describe('GestionConfiguracionEmpresaComponent', () => {
  const componente = Object.assign(Object.create(GestionConfiguracionEmpresaComponent.prototype), {
    colorThemeService: {
      obtenerPaletaPredeterminada: () => ({ primario: '#4982fd', secundario: '#2563eb' }),
    },
  }) as {
    extraerPayload(valor: PerfilEmpresaDto): Record<string, unknown>;
  };

  it('no reenvía metadatos de la respuesta al actualizar el perfil', () => {
    const payload = componente.extraerPayload.call(
      componente,
      { ...perfil, status: 'ACTIVA' } as PerfilEmpresaDto,
    );

    expect(payload).not.toHaveProperty('status');
    expect(payload).not.toHaveProperty('fax');
    expect(payload).not.toHaveProperty('importeCuotaSocial');
    expect(payload).not.toHaveProperty('uuid');
    expect(payload).toMatchObject({
      telefono: perfil.telefono,
      path: 'club-norte',
      diasVencimientoCuota: 10,
    });
  });

  it('completa colores nulos con la paleta predeterminada al construir el PUT', () => {
    const payload = componente.extraerPayload({ ...perfil, colorPrimario: null, colorSecundario: null });

    expect(payload).toMatchObject({ colorPrimario: '#4982fd', colorSecundario: '#2563eb' });
  });
});
