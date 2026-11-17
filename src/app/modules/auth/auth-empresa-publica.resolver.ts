import { inject } from '@angular/core';
import { RedirectCommand, ResolveFn, Router } from '@angular/router';
import { catchError, of, tap } from 'rxjs';

import { EmpresaPublicaDto } from '../../core/api/interfaces/empresa.interfaces';
import { EmpresaPublicaContextService } from '../../core/global-services/services/empresa-publica-context.service';
import { ColorThemeService } from '../ui/color-mod/color-theme.service';

/** Resuelve el club de las URLs públicas y nunca deja branding residual ante un error. */
export const resolverEmpresaPublica: ResolveFn<EmpresaPublicaDto | null> = (route) => {
  const contextoEmpresa = inject(EmpresaPublicaContextService);
  const colorThemeService = inject(ColorThemeService);
  const router = inject(Router);
  const companyName = route.paramMap.get('companyName')?.trim() ?? '';

  contextoEmpresa.limpiar();
  colorThemeService.restaurarPaletaBase();

  return contextoEmpresa.cargarPorPath(companyName).pipe(
    tap((empresa) =>
      colorThemeService.establecerPaletaEmpresa(empresa.colorPrimario, empresa.colorSecundario),
    ),
    catchError(() => {
      return of(new RedirectCommand(router.parseUrl('/login')));
    }),
  );
};
