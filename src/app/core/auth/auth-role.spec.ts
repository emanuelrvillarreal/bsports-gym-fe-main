import { describe, expect, it } from 'vitest';

import {
  extraerRolesEmpresa,
  normalizarRolUsuario,
  normalizarValorRol,
  obtenerRutaPrincipalPorRol,
  usuarioTieneAlgunRol,
} from './auth-role';

describe('auth-role', () => {
  it('normaliza los roles del backend y alias transitorios', () => {
    expect(normalizarValorRol('ADM_RECEPCION')).toBe('ADM_RECEPCION');
    expect(normalizarValorRol('ROLE_SOCIO_TITULAR')).toBe('SOCIO_TITULAR');
    expect(normalizarValorRol('ROLE_FAMILIAR')).toBe('FAMILIAR');
    expect(normalizarValorRol('RECEPCIONISTA')).toBe('ADM_RECEPCION');
    expect(normalizarValorRol('INSTRUCTOR')).toBe('PROFESOR');
  });

  it('extrae solamente los roles de la empresa solicitada', () => {
    const usuario = {
      userCompanyRoles: [
        { companyUuid: 'club-a', roles: [{ name: 'ADMIN' }, { name: 'ADM_RECEPCION' }] },
        { companyUuid: 'club-b', roles: [{ name: 'SOCIO_TITULAR' }] },
      ],
    };

    expect(extraerRolesEmpresa(usuario, 'club-a')).toEqual(['ADMIN', 'ADM_RECEPCION']);
    expect(extraerRolesEmpresa(usuario, 'club-b')).toEqual(['SOCIO_TITULAR']);
  });

  it('no elige implicitamente entre varios roles', () => {
    expect(normalizarRolUsuario({ roles: ['ADMIN', 'PROFESOR'] })).toBeNull();
    expect(normalizarRolUsuario({ role: 'PROFESOR' })).toBe('PROFESOR');
  });

  it('resuelve un inicio diferente para cada rol canonico', () => {
    expect(obtenerRutaPrincipalPorRol('SYSADMIN')).toBe('/sysadmin/nueva-empresa');
    expect(obtenerRutaPrincipalPorRol('ADMIN')).toBe('/admin/dashboard');
    expect(obtenerRutaPrincipalPorRol('ADM_RECEPCION')).toBe('/adm-recepcion/accesos');
    expect(obtenerRutaPrincipalPorRol('PROFESOR')).toBe('/profesor/eventos');
    expect(obtenerRutaPrincipalPorRol('SOCIO_TITULAR')).toBe('/socio-titular/credencial');
    expect(obtenerRutaPrincipalPorRol('FAMILIAR')).toBe('/socio-familiar/credencial');
  });

  it('autoriza usando el rol activo seleccionado', () => {
    const usuario = { roles: ['ADMIN', 'PROFESOR'] };
    expect(usuarioTieneAlgunRol(usuario, ['PROFESOR'], 'PROFESOR')).toBe(true);
    expect(usuarioTieneAlgunRol(usuario, ['ADMIN'], 'PROFESOR')).toBe(false);
  });
});
