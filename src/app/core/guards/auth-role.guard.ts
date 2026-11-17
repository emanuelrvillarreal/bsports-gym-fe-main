import {
  CanActivateChildFn,
  CanActivateFn,
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { map } from 'rxjs';

import { AppRole, obtenerRutaPrincipalPorRol, usuarioTieneAlgunRol } from '../auth/auth-role';
import { AuthService } from '../global-services/services/auth.service';
import { ToastAlertService } from '../../modules/ui/toast-alert/services/toast-alert.service';

export const authRoleGuard: CanActivateFn = (route, state) => validarAccesoPorRol(route, state);
export const authRoleChildGuard: CanActivateChildFn = (childRoute, state) =>
  validarAccesoPorRol(childRoute, state);
export const authSessionGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.estaAutenticado() && authService.obtenerUsuarioGuardado()) return true;
  return authService
    .rehidratarSesion()
    .pipe(map((recuperada) => (recuperada ? true : router.createUrlTree(['/login']))));
};
export const clubBloqueadoGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  return authService.empresaActivaBloqueada()
    ? true
    : router.createUrlTree([authService.resolverRutaPostAutenticacion()]);
};
export const seleccionEmpresaGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const empresas = authService.obtenerEmpresasDisponibles();
  const rolesDisponibles =
    !authService.obtenerCompanyUuidActivo() && empresas.length === 1
      ? empresas[0].roles
      : authService.obtenerRolesEmpresaActiva();
  const tieneEmpresasParaElegir = empresas.length > 1;
  const tieneRolesParaElegir = rolesDisponibles.length > 1;

  return tieneEmpresasParaElegir || tieneRolesParaElegir
    ? true
    : router.createUrlTree([authService.resolverRutaPostAutenticacion()]);
};
function validarAccesoPorRol(
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
): ReturnType<CanActivateFn> {
  const authService = inject(AuthService);
  const router = inject(Router);
  const toastAlertService = inject(ToastAlertService);
  const platformId = inject(PLATFORM_ID);

  // Solucion puente para SSR: el servidor no puede leer sessionStorage ni
  // rehidratar sesion desde el navegador. Dejamos pasar el render y la
  // validacion real la completa la app en el cliente al bootstrapear.
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  const usuario = authService.obtenerUsuarioGuardado();
  const rolActual = authService.obtenerRolUsuario();

  if (!authService.estaAutenticado() || !usuario) {
    return authService.rehidratarSesion().pipe(
      map((sesionRecuperada) => {
        if (!sesionRecuperada) {
          return router.createUrlTree(['/login']);
        }

        return validarAccesoActual(route, state, authService, router, toastAlertService);
      }),
    );
  }

  return validarAccesoActual(route, state, authService, router, toastAlertService);
}

function validarAccesoActual(
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
  authService: AuthService,
  router: Router,
  toastAlertService: ToastAlertService,
): boolean | ReturnType<Router['createUrlTree']> {
  const usuario = authService.obtenerUsuarioGuardado();
  const rolActual = authService.obtenerRolUsuario();

  if (!usuario) {
    return router.createUrlTree(['/login']);
  }

  if (!rolActual) return router.createUrlTree([authService.resolverRutaPostAutenticacion()]);

  if (authService.empresaActivaBloqueada() && state.url !== '/club-bloqueado') {
    return router.createUrlTree(['/club-bloqueado']);
  }

  const rolesPermitidos = route.data['roles'] as readonly AppRole[] | undefined;
  if (!rolesPermitidos?.length) {
    return true;
  }

  const accesoAdminDelegado =
    rolesPermitidos.includes('ADMIN') && authService.esAdminDelegadoDesdeSysadmin();
  const regresoSysadminDelegado =
    rolesPermitidos.includes('SYSADMIN') && authService.esAdminDelegadoDesdeSysadmin();

  if (
    usuarioTieneAlgunRol(usuario, rolesPermitidos, rolActual) ||
    accesoAdminDelegado ||
    regresoSysadminDelegado
  ) {
    return true;
  }

  const rutaFallback = obtenerRutaPrincipalPorRol(rolActual);
  if (normalizarRutaComparacion(rutaFallback) === normalizarRutaComparacion(state.url)) {
    toastAlertService.error('Permiso inexistente o revocado.', {
      titulo: 'Acceso denegado',
      subtitulo: 'Sesion redirigida',
    });
    return router.createUrlTree(['/login']);
  }

  return router.createUrlTree([rutaFallback]);
}

function normalizarRutaComparacion(ruta: string): string {
  const [path] = ruta.split('?');
  return (path || '/').replace(/\/+$/, '') || '/';
}
