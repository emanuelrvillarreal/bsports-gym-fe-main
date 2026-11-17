import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { AuthSessionService } from '../global-services/services/auth-session.service';
import { AuthService } from '../global-services/services/auth.service';
import { seleccionEmpresaGuard } from './auth-role.guard';

describe('seleccionEmpresaGuard', () => {
  let sessionService: AuthSessionService;
  let router: Router;

  beforeEach(() => {
    TestBed.resetTestingModule();
    sessionStorage.clear();
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideRouter([])],
    });
    sessionService = TestBed.inject(AuthSessionService);
    router = TestBed.inject(Router);
  });

  it('permite resolver varios roles dentro de seleccionar-empresa', () => {
    sessionService.guardarUsuario({
      userCompanyRoles: [
        {
          companyUuid: 'club-a',
          companyName: 'Club A',
          roles: [{ name: 'ADMIN' }, { name: 'ADM_RECEPCION' }],
        },
      ],
    });

    const resultado = ejecutarGuard();

    expect(resultado).toBe(true);
  });

  it('continua al perfil cuando no existe una eleccion pendiente', () => {
    sessionService.guardarUsuario({
      userCompanyRoles: [
        { companyUuid: 'club-a', companyName: 'Club A', roles: [{ name: 'ADMIN' }] },
      ],
    });

    const resultado = ejecutarGuard();

    expect(resultado).not.toBe(true);
    expect(router.serializeUrl(resultado as ReturnType<Router['createUrlTree']>)).toBe(
      '/admin/dashboard',
    );
  });

  it('resuelve companyBlocked contra la empresa activa y no contra la primera asignacion', () => {
    const authService = TestBed.inject(AuthService);
    sessionService.guardarUsuario({
      userCompanyRoles: [
        {
          companyUuid: 'club-a',
          companyName: 'Club A',
          companyBlocked: true,
          roles: [{ name: 'ADMIN' }],
        },
        {
          companyUuid: 'club-b',
          companyName: 'Club B',
          companyBlocked: false,
          roles: [{ name: 'ADMIN' }],
        },
      ],
    });

    sessionService.guardarCompanyUuidActivo('club-b');
    expect(authService.empresaActivaBloqueada()).toBe(false);

    sessionService.guardarCompanyUuidActivo('club-a');
    expect(authService.empresaActivaBloqueada()).toBe(true);
  });

  function ejecutarGuard() {
    return TestBed.runInInjectionContext(() =>
      seleccionEmpresaGuard(
        {} as ActivatedRouteSnapshot,
        { url: '/seleccionar-empresa' } as RouterStateSnapshot,
      ),
    );
  }
});
