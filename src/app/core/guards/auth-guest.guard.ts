import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';

import { AuthService } from '../global-services/services/auth.service';

export const authGuestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  const usuario = authService.obtenerUsuarioGuardado();

  if (authService.estaAutenticado() && usuario) {
    return router.createUrlTree([authService.resolverRutaPostAutenticacion()]);
  }

  if (!authService.obtenerRefreshToken()) {
    return true;
  }

  return authService.rehidratarSesion().pipe(
    map((sesionRecuperada) =>
      sesionRecuperada && !!authService.obtenerUsuarioGuardado()
        ? router.createUrlTree([authService.resolverRutaPostAutenticacion()])
        : true,
    ),
  );
};
