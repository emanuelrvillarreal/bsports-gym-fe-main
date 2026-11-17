import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot } from '@angular/router';
import { firstValueFrom, Observable, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PerfilEmpresaDto } from '../api/interfaces/empresa.interfaces';
import { EmpresaApiService } from '../api/services/empresa-api.service';
import { AuthService } from '../global-services/services/auth.service';
import { perfilEmpresaAdminGuard } from './perfil-empresa.guard';

const perfilCompleto: PerfilEmpresaDto = {
  nombreComercial: 'Club Norte',
  razonSocial: 'Club Norte',
  cuit: '20000000001',
  domicilio: { direccion: 'Calle 1', codigoPostal: '1000', localidad: 'CABA' },
  domicilioFacturacion: { direccion: 'Calle 2', codigoPostal: '1000', localidad: 'CABA' },
  telefono: '1112345678',
  emailFacturaElectronica: 'facturas@club.com',
  emailInstitucional: 'club@club.com',
  colorPrimario: '#112233',
  colorSecundario: '#ffffff',
  logoUrl: 'https://club.com/logo.png',
  cuotaSocialHabilitada: false,
  diasVencimientoCuota: 10,
  diasVencimientoMoroso: 20,
  diasInhabilitacion: 30,
};

describe('perfilEmpresaAdminGuard', () => {
  const obtenerPerfil = vi.fn<(uuid: string) => Observable<PerfilEmpresaDto>>();
  const obtenerCompanyUuidActivo = vi.fn<() => string>();
  let router: Router;

  beforeEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();
    obtenerCompanyUuidActivo.mockReturnValue('club-a');
    obtenerPerfil.mockReturnValue(of(perfilCompleto));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: AuthService, useValue: { obtenerCompanyUuidActivo } },
        { provide: EmpresaApiService, useValue: { obtenerPerfil } },
      ],
    });
    router = TestBed.inject(Router);
  });

  it('permite el portal cuando el perfil está completo y acepta false y cero', async () => {
    expect(await ejecutarGuard('/admin/dashboard')).toBe(true);
    expect(obtenerPerfil).toHaveBeenCalledWith('club-a');
  });

  it.each([
    { domicilio: null },
    { domicilioFacturacion: null },
    { telefono: null },
    { emailInstitucional: null },
    { cuotaSocialHabilitada: null },
    { diasVencimientoCuota: null },
    { diasVencimientoMoroso: null },
    { diasInhabilitacion: null },
  ])('redirige al wizard si falta un campo obligatorio: %o', async (campos) => {
    obtenerPerfil.mockReturnValue(of({ ...perfilCompleto, ...campos } as PerfilEmpresaDto));
    const resultado = await ejecutarGuard('/admin/dashboard');
    expect(router.serializeUrl(resultado as ReturnType<Router['createUrlTree']>)).toBe(
      '/admin/completar-perfil',
    );
  });

  it('permite continuar sin logo ni colores manuales', async () => {
    obtenerPerfil.mockReturnValue(
      of({ ...perfilCompleto, logoUrl: null, colorPrimario: null, colorSecundario: null } as PerfilEmpresaDto),
    );
    expect(await ejecutarGuard('/admin/dashboard')).toBe(true);
  });

  it('redirige al dashboard desde el wizard cuando el perfil ya estÃ¡ completo', async () => {
    const resultado = await ejecutarGuard('/admin/completar-perfil?origen=dashboard');
    expect(router.serializeUrl(resultado as ReturnType<Router['createUrlTree']>)).toBe(
      '/admin/dashboard',
    );
    expect(obtenerPerfil).toHaveBeenCalledWith('club-a');
  });

  it('redirige al wizard cuando falla la consulta', async () => {
    obtenerPerfil.mockReturnValue(throwError(() => new Error('Sin conexión')));
    const resultado = await ejecutarGuard('/admin/socios');
    expect(router.serializeUrl(resultado as ReturnType<Router['createUrlTree']>)).toBe(
      '/admin/completar-perfil',
    );
  });

  it('redirige al wizard cuando falta empresa activa', async () => {
    obtenerCompanyUuidActivo.mockReturnValue('');
    const resultado = await ejecutarGuard('/admin/dashboard');
    expect(router.serializeUrl(resultado as ReturnType<Router['createUrlTree']>)).toBe(
      '/admin/completar-perfil',
    );
    expect(obtenerPerfil).not.toHaveBeenCalled();
  });

  async function ejecutarGuard(url: string): Promise<unknown> {
    const resultado = TestBed.runInInjectionContext(() =>
      perfilEmpresaAdminGuard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    );
    return resultado instanceof Observable ? firstValueFrom(resultado) : resultado;
  }
});
