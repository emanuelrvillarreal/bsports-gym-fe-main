import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { AuthSessionService } from './auth-session.service';

describe('logo de empresa en AuthSessionService', () => {
  let servicio: AuthSessionService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [AuthSessionService] });
    servicio = TestBed.inject(AuthSessionService);
  });

  it('actualiza el signal y persiste la URL normalizada', () => {
    servicio.actualizarCompanyLogoUrl('  https://cdn.example/logo.png  ');

    expect(servicio.companyLogoUrl()).toBe('https://cdn.example/logo.png');
    expect(servicio.obtenerCompanyLogoUrl()).toBe('https://cdn.example/logo.png');
    expect(localStorage.getItem('auth.companyLogoUrl')).toBe('https://cdn.example/logo.png');
  });

  it.each([null, undefined, '', '   '])('limpia el logo con el valor %s', (valor) => {
    servicio.actualizarCompanyLogoUrl('https://cdn.example/logo.png');

    servicio.actualizarCompanyLogoUrl(valor);

    expect(servicio.companyLogoUrl()).toBe('');
    expect(servicio.obtenerCompanyLogoUrl()).toBe('');
    expect(localStorage.getItem('auth.companyLogoUrl')).toBeNull();
  });

  it('conserva el ultimo branding al limpiar la sesion para mostrarlo en login', () => {
    servicio.guardarCompanyUuidActivo('empresa-a');
    servicio.actualizarCompanyLogoUrl('https://cdn.example/empresa-a.png');

    servicio.limpiarSesion();

    expect(servicio.companyLogoUrl()).toBe('https://cdn.example/empresa-a.png');
    expect(localStorage.getItem('branding.lastCompanyUuid')).toBeNull();
    expect(localStorage.getItem('auth.companyLogoUrl.empresa-a')).toBeNull();
  });

  it('aisla el logo al cambiar entre empresas', () => {
    servicio.guardarCompanyUuidActivo('empresa-a');
    servicio.actualizarCompanyLogoUrl('https://cdn.example/empresa-a.png');
    servicio.guardarCompanyUuidActivo('empresa-b');
    servicio.actualizarCompanyLogoUrl('https://cdn.example/empresa-b.png');

    expect(servicio.companyLogoUrl()).toBe('https://cdn.example/empresa-b.png');
    expect(localStorage.getItem('auth.companyLogoUrl')).toBe('https://cdn.example/empresa-b.png');
    expect(localStorage.getItem('auth.companyLogoUrl.empresa-a')).toBeNull();
  });
});
