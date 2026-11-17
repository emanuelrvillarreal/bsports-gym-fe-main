import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, inject } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { EmpresaApiService } from '../api/services/empresa-api.service';
import { AuthService } from '../global-services/services/auth.service';
import { perfilEmpresaCompleto } from './perfil-empresa-completo';

const RUTA_COMPLETAR_PERFIL = '/admin/completar-perfil';

/** Exige completar el perfil institucional antes de recorrer el portal ADMIN. */
export const perfilEmpresaAdminGuard: CanActivateChildFn = (_route, state) => {
  const router = inject(Router);
  const esRutaCompletarPerfil = state.url.split(/[?#]/, 1)[0] === RUTA_COMPLETAR_PERFIL;

  // La sesión se rehidrata en el cliente, igual que en authRoleGuard.
  if (!isPlatformBrowser(inject(PLATFORM_ID))) return true;

  const companyUuid = inject(AuthService).obtenerCompanyUuidActivo();
  const destino = router.createUrlTree([RUTA_COMPLETAR_PERFIL]);
  if (!companyUuid) return esRutaCompletarPerfil ? true : destino;
  const inicioAdmin = router.createUrlTree(['/admin/dashboard']);

  return inject(EmpresaApiService)
    .obtenerPerfil(companyUuid)
    .pipe(
      map((perfil) => {
        const completo = perfilEmpresaCompleto(perfil);
        if (esRutaCompletarPerfil) return completo ? inicioAdmin : true;
        return completo ? true : destino;
      }),
      // Si falla la consulta se permite reintentar desde el wizard.
      catchError(() => of(esRutaCompletarPerfil ? true : destino)),
    );
};
