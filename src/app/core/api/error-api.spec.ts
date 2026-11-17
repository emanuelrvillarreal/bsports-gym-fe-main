import { describe, expect, it } from 'vitest';

import { extraerMensajeErrorApi } from './error-api';

describe('extraerMensajeErrorApi', () => {
  it('prioriza los campos del DTO y conserva su orden', () => {
    const mensaje = extraerMensajeErrorApi({
      error: {
        userMessage: 'Error en el formulario',
        fields: [
          { nombreCampo: 'cuit', message: 'no debe estar vacio' },
          { nombreCampo: 'emailInstitucional', message: 'debe tener formato valido' },
        ],
      },
    });

    expect(mensaje).toBe(
      'cuit: no debe estar vacio \u00b7 emailInstitucional: debe tener formato valido',
    );
  });

  it('descarta campos invalidos y mensajes duplicados', () => {
    const mensaje = extraerMensajeErrorApi({
      error: {
        fields: [
          { nombreCampo: 'cuit', message: '  no debe estar vacio  ' },
          { nombreCampo: 'cuit', message: 'no debe estar vacio' },
          { nombreCampo: 'email', message: '   ' },
          { nombreCampo: 12, message: 'debe ser valido' },
          null,
        ],
      },
    });

    expect(mensaje).toBe('cuit: no debe estar vacio \u00b7 debe ser valido');
  });

  it('usa los mensajes genericos en el orden del contrato', () => {
    expect(extraerMensajeErrorApi({ error: { userMessage: 'Mensaje usuario', message: 'Mensaje API' } }))
      .toBe('Mensaje usuario');
    expect(extraerMensajeErrorApi({ error: { message: 'Mensaje API', error: 'Mensaje error' } }))
      .toBe('Mensaje API');
    expect(extraerMensajeErrorApi({ error: { error: 'Mensaje error' } })).toBe('Mensaje error');
    expect(extraerMensajeErrorApi({ error: { fields: {}, userMessage: 'Fields malformado' } }))
      .toBe('Fields malformado');
  });

  it('no filtra developerMessage y usa el fallback seguro', () => {
    expect(extraerMensajeErrorApi({ error: { developerMessage: 'detalle interno' } }, 'Fallback'))
      .toBe('Fallback');
    expect(extraerMensajeErrorApi(new Error('Error de red'), 'Fallback')).toBe('Error de red');
  });

  it('muestra el 400 de email de administrador ya registrado', () => {
    expect(extraerMensajeErrorApi({ status: 400, error: { message: 'Email ya registrado' } }))
      .toBe('Email ya registrado');
  });
});
