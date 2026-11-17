import { Routes } from '@angular/router';

import { authGuestGuard } from '../../core/guards/auth-guest.guard';
import { SeoRouteData } from '../../core/routing/seo-route-data';
import { resolverEmpresaPublica } from './auth-empresa-publica.resolver';

export const AUTH_ROUTES: Routes = [
  {
    path: 'auth/finish-login',
    data: {
      title: 'Verificar acceso',
      description: 'Verificación del enlace de acceso por correo.',
    } satisfies SeoRouteData,
    loadComponent: () =>
      import('./pages/login/finish-login-page.component').then((m) => m.FinishLoginPageComponent),
  },
  {
    path: ':companyName/login',
    canActivate: [authGuestGuard],
    resolve: { empresa: resolverEmpresaPublica },
    data: {
      title: 'Login',
      description: 'Acceso al portal del club.',
    } satisfies SeoRouteData,
    loadComponent: () =>
      import('./pages/login/login-page.component').then((m) => m.LoginPageComponent),
  },
  {
    path: ':companyName/registro',
    canActivate: [authGuestGuard],
    resolve: { empresa: resolverEmpresaPublica },
    data: {
      title: 'Registro',
      description: 'Registro público para el club.',
    } satisfies SeoRouteData,
    loadComponent: () =>
      import('./pages/registro/registro-page.component').then((m) => m.RegistroPageComponent),
  },
  {
    path: 'login',
    canActivate: [authGuestGuard],
    data: {
      title: 'Login',
      description: 'Pantalla starter de autenticación.',
    } satisfies SeoRouteData,
    loadComponent: () =>
      import('./pages/login/login-page.component').then((m) => m.LoginPageComponent),
  },
  {
    path: 'registro',
    canActivate: [authGuestGuard],
    data: {
      title: 'Registro',
      description: 'Alta de usuario starter.',
    } satisfies SeoRouteData,
    loadComponent: () =>
      import('./pages/registro/registro-page.component').then((m) => m.RegistroPageComponent),
  },
  {
    path: 'registrate',
    redirectTo: 'registro',
    pathMatch: 'full',
  },
  {
    path: 'forgot-password',
    canActivate: [authGuestGuard],
    data: {
      title: 'Restablecer contraseña',
      description: 'Restablecimiento de contraseña desde enlace enviado por correo.',
    } satisfies SeoRouteData,
    loadComponent: () =>
      import('./pages/recuperar-contrasena/recuperar-contrasena-page.component').then(
        (m) => m.RecuperarContrasenaPageComponent,
      ),
  },
];
