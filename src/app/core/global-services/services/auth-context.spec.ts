import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { AuthService } from './auth.service';
import { AuthSessionService } from './auth-session.service';

describe('contexto de autenticacion', () => {
  let authService: AuthService;
  let sessionService: AuthSessionService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    sessionStorage.clear();
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideRouter([])],
    });
    authService = TestBed.inject(AuthService);
    sessionService = TestBed.inject(AuthSessionService);
  });

  it('solicita empresa antes que rol cuando existen varias empresas', () => {
    sessionService.guardarUsuario({
      userCompanyRoles: [
        { companyUuid: 'club-a', companyName: 'Club A', roles: [{ name: 'ADMIN' }] },
        { companyUuid: 'club-b', companyName: 'Club B', roles: [{ name: 'PROFESOR' }] },
      ],
    });

    expect(authService.resolverRutaPostAutenticacion()).toBe('/seleccionar-empresa');
    expect(authService.seleccionarEmpresa('club-b')).toBe(true);
    expect(authService.resolverRutaPostAutenticacion()).toBe('/profesor/eventos');
    expect(sessionService.obtenerCompanyUuid()).toBe('club-b');
    expect(sessionService.obtenerRolActivo()).toBe('PROFESOR');
  });

  it('mantiene la selección unificada cuando una empresa tiene varios roles', () => {
    sessionService.guardarUsuario({
      userCompanyRoles: [
        {
          companyUuid: 'club-a',
          companyName: 'Club A',
          roles: [{ name: 'ADMIN' }, { name: 'ADM_RECEPCION' }],
        },
      ],
    });

    expect(authService.resolverRutaPostAutenticacion()).toBe('/seleccionar-empresa');
    expect(authService.seleccionarRol('ADM_RECEPCION')).toBe(true);
    expect(authService.resolverRutaPostAutenticacion()).toBe('/adm-recepcion/accesos');
  });

  it('rechaza un rol que no pertenece a la empresa activa', () => {
    sessionService.guardarUsuario({
      userCompanyRoles: [
        { companyUuid: 'club-a', companyName: 'Club A', roles: [{ name: 'FAMILIAR' }] },
      ],
    });

    authService.resolverRutaPostAutenticacion();
    expect(authService.seleccionarRol('ADMIN')).toBe(false);
    expect(authService.seleccionarRol('FAMILIAR')).toBe(true);
  });

  it('persiste empresa y rol activos durante la sesion del navegador', () => {
    sessionService.guardarCompanyUuidActivo('club-a');
    sessionService.guardarRolActivo('SOCIO_TITULAR');

    expect(sessionStorage.getItem('auth.companyUuid.active')).toBe('club-a');
    expect(sessionStorage.getItem('auth.role.active')).toBe('SOCIO_TITULAR');
  });

  it('permite a SYSADMIN entrar como ADMIN usando el UUID del club', () => {
    sessionService.guardarUsuario({ roles: ['SYSADMIN'] });

    expect(authService.entrarComoAdminDesdeSysadmin(' club-a ')).toBe(true);
    expect(sessionService.obtenerCompanyUuidActivo()).toBe('club-a');
    expect(sessionService.obtenerRolActivo()).toBe('ADMIN');
    expect(authService.esAdminDelegadoDesdeSysadmin()).toBe(true);
    expect(authService.obtenerRutaPrincipalUsuario()).toBe('/admin/dashboard');
  });

  it('reconoce SYSADMIN cuando login lo informa dentro de userCompanyRoles', () => {
    sessionService.guardarUsuario({
      userCompanyRoles: [{ companyUuid: 'club-global', roles: [{ name: 'SYSADMIN' }] }],
    });

    expect(authService.entrarComoAdminDesdeSysadmin('club-a')).toBe(true);
    expect(sessionService.obtenerCompanyUuidActivo()).toBe('club-a');
    expect(sessionService.obtenerRolActivo()).toBe('ADMIN');
  });

  it('rechaza la entrada delegada cuando el usuario no es SYSADMIN', () => {
    sessionService.guardarUsuario({ roles: ['ADMIN'] });

    expect(authService.entrarComoAdminDesdeSysadmin('club-a')).toBe(false);
    expect(sessionService.obtenerCompanyUuidActivo()).toBe('');
    expect(sessionService.obtenerRolActivo()).toBeNull();
  });

  it('persiste el logo recibido como logoUrl dentro de la empresa del login', () => {
    sessionService.guardarUsuario({
      userCompanyRoles: [
        {
          companyUuid: 'club-a',
          companyName: 'Club A',
          logoUrl: 'https://cdn.example/club-a.png',
          roles: [{ name: 'ADMIN' }],
        },
      ],
    });

    expect(sessionService.obtenerCompanyLogoUrl()).toBe('https://cdn.example/club-a.png');
    expect(localStorage.getItem('auth.companyLogoUrl')).toBe('https://cdn.example/club-a.png');
    expect(authService.obtenerEmpresasDisponibles()[0]?.logoUrl).toBe('https://cdn.example/club-a.png');
  });
});
