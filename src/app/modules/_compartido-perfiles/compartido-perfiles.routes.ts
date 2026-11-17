import { Routes } from '@angular/router';

import {
  authSessionGuard,
  seleccionEmpresaGuard,
} from '../../core/guards/auth-role.guard';
import { SeoRouteData } from '../../core/routing/seo-route-data';

export const cargarConfiguracionCompartida = () =>
  import('./pages/configuracion/configuracion-page.component').then(
    (m) => m.ConfiguracionPageComponent,
  );

export const cargarMiPerfilCompartido = () =>
  import('./pages/mi-perfil/mi-perfil-page.component').then((m) => m.MiPerfilPageComponent);

export const COMPARTIDO_PERFILES_ROUTES: Routes = [
  {
    path: 'seleccionar-empresa',
    canActivate: [authSessionGuard, seleccionEmpresaGuard],
    data: {
      title: 'Seleccionar empresa',
      description: 'Selección del contexto empresarial activo.',
    } satisfies SeoRouteData,
    loadComponent: () =>
      import('./pages/seleccionar-empresa/seleccionar-empresa-page.component').then(
        (m) => m.SeleccionarEmpresaPageComponent,
      ),
  },
];
