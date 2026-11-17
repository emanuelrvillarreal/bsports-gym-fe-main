import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { NoPreloading, provideRouter, withEnabledBlockingInitialNavigation, withPreloading } from '@angular/router';

import { authInterceptor } from './core/interceptors/auth.interceptor';
import { actualizarPresenciasClubInterceptor } from './core/interceptors/actualizar-presencias-club.interceptor';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor, actualizarPresenciasClubInterceptor])),
    provideRouter(routes, withEnabledBlockingInitialNavigation(), withPreloading(NoPreloading)),
  ],
};
