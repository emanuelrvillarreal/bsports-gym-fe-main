import { inject } from '@angular/core';
import { RedirectFunction, Routes } from '@angular/router';

import { AuthService } from './core/global-services/services/auth.service';
import { authSessionGuard, clubBloqueadoGuard } from './core/guards/auth-role.guard';
import { ADMINISTRADORES_ROUTES } from './modules/_administradores/administradores.routes';
import { COMPARTIDO_PERFILES_ROUTES } from './modules/_compartido-perfiles/compartido-perfiles.routes';
import { PROFESORES_ROUTES } from './modules/_profesores/profesores.routes';
import { SOCIOS_ROUTES } from './modules/_socios/socios.routes';
import { AUTH_ROUTES } from './modules/auth/auth.routes';
import { PAGO_ROUTES } from './modules/pagos/pago.routes';

const redirigirSegunSesion: RedirectFunction = () =>
  inject(AuthService).resolverRutaPostAutenticacion();

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: redirigirSegunSesion,
  },
  ...AUTH_ROUTES,
  ...COMPARTIDO_PERFILES_ROUTES,
  {
    path: 'inicio',
    pathMatch: 'full',
    redirectTo: redirigirSegunSesion,
  },
  ...ADMINISTRADORES_ROUTES,
  ...PROFESORES_ROUTES,
  ...SOCIOS_ROUTES,
  ...PAGO_ROUTES,
  {
    path: 'club-bloqueado',
    canActivate: [authSessionGuard, clubBloqueadoGuard],
    data: {
      title: 'Club bloqueado',
      description: 'Regularización de la suscripción y facturación del club.',
    },
    loadComponent: () =>
      import('./modules/_compartido-perfiles/pages/club-bloqueado/club-bloqueado-page.component').then(
        (m) => m.ClubBloqueadoPageComponent,
      ),
  },
  { path: '**', redirectTo: redirigirSegunSesion },
];
