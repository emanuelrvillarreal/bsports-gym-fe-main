import { Routes } from '@angular/router';

import { AppRole } from '../../core/auth/auth-role';
import { authRoleChildGuard, authRoleGuard } from '../../core/guards/auth-role.guard';
import { SeoRouteData } from '../../core/routing/seo-route-data';
import { cargarMiPerfilCompartido } from '../_compartido-perfiles/compartido-perfiles.routes';

const ROLES_SOCIO_TITULAR: readonly AppRole[] = ['SOCIO_TITULAR'];
const ROLES_SOCIO_FAMILIAR: readonly AppRole[] = ['FAMILIAR'];

const cargarCalendarioSocios = () =>
  import('./pages/calendario/calendario-page.component').then(
    (m) => m.CalendarioSociosPageComponent,
  );

const cargarCredencialSocios = () =>
  import('./pages/credencial/credencial-page.component').then(
    (m) => m.CredencialSociosPageComponent,
  );

const cargarCertificadosSocios = () =>
  import('./pages/certificados/certificados-page.component').then(
    (m) => m.CertificadosPageComponent,
  );

const cargarCuotasSocioTitular = () =>
  import('./pages/socio-titular/cuotas/cuotas-page.component').then(
    (m) => m.CuotasSocioTitularPageComponent,
  );

const cargarAmenitiesSocioTitular = () =>
  import('./pages/socio-titular/amenities/amenities-page.component').then(
    (m) => m.AmenitiesSocioTitularPageComponent,
  );

const cargarActividadesSocios = () =>
  import('./pages/actividades/actividades-page.component').then(
    (m) => m.ActividadesSociosPageComponent,
  );

const cargarMiTrayectoriaSocios = () =>
  import('./pages/mi-trayectoria/mi-trayectoria-page.component').then(
    (m) => m.MiTrayectoriaPageComponent,
  );

const cargarMisEntrenamientosSocios = () =>
  import('./pages/mis-entrenamientos/mis-entrenamientos-page.component').then(
    (m) => m.MisEntrenamientosPageComponent,
  );

const cargarMisMembresiasSocios = () =>
  import('./pages/mis-membresias/mis-membresias-page.component').then(
    (m) => m.MisMembresiasPageComponent,
  );

const cargarMisDescuentosSocios = () =>
  import('./pages/mis-descuentos/mis-descuentos-page.component').then((m) => m.MisDescuentosPageComponent);

const cargarMisEvaluacionesSocios = () =>
  import('./pages/mis-evaluaciones/mis-evaluaciones-page.component').then(
    (m) => m.MisEvaluacionesPageComponent,
  );

export const SOCIOS_ROUTES: Routes = [
  {
    path: 'socio-titular',
    canActivate: [authRoleGuard],
    canActivateChild: [authRoleChildGuard],
    data: {
      title: 'Socio titular',
      description: 'Portal privado del socio titular.',
      roles: ROLES_SOCIO_TITULAR,
    } satisfies SeoRouteData,
    loadComponent: () =>
      import('../layout/components/layout-socios/layout-socios.component').then(
        (m) => m.LayoutSociosComponent,
      ),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'credencial' },
      {
        path: 'perfil',
        data: {
          title: 'Mi perfil',
          description: 'Perfil del socio titular.',
          roles: ROLES_SOCIO_TITULAR,
        } satisfies SeoRouteData,
        loadComponent: cargarMiPerfilCompartido,
      },
      {
        path: 'certificados',
        data: {
          title: 'Certificados',
          description: 'Certificados médicos del socio titular.',
          roles: ROLES_SOCIO_TITULAR,
        } satisfies SeoRouteData,
        loadComponent: cargarCertificadosSocios,
      },
      {
        path: 'credencial',
        data: {
          title: 'Mi credencial',
          description: 'Credencial del socio titular.',
          roles: ROLES_SOCIO_TITULAR,
        } satisfies SeoRouteData,
        loadComponent: cargarCredencialSocios,
      },
      {
        path: 'grupo-familiar',
        data: {
          title: 'Grupo familiar',
          description: 'Gestión del grupo familiar.',
          roles: ROLES_SOCIO_TITULAR,
        } satisfies SeoRouteData,
        loadComponent: () =>
          import('./pages/socio-titular/grupo-familiar/grupo-familiar-page.component').then(
            (m) => m.GrupoFamiliarPageComponent,
          ),
      },
      {
        path: 'cuotas',
        data: {
          title: 'Mis cuotas',
          description: 'Cuotas del socio titular y su grupo familiar.',
          roles: ROLES_SOCIO_TITULAR,
        } satisfies SeoRouteData,
        loadComponent: cargarCuotasSocioTitular,
      },
      {
        path: 'amenities',
        data: {
          title: 'Instalaciones',
          description: 'Instalaciones disponibles para reservar en el club.',
          roles: ROLES_SOCIO_TITULAR,
        } satisfies SeoRouteData,
        loadComponent: cargarAmenitiesSocioTitular,
      },
      {
        path: 'actividades',
        data: {
          title: 'Actividades',
          description: 'Actividades disponibles para el socio titular y su grupo familiar.',
          roles: ROLES_SOCIO_TITULAR,
        } satisfies SeoRouteData,
        loadComponent: cargarActividadesSocios,
      },
      {
        path: 'mi-trayectoria',
        data: {
          title: 'Mi trayectoria',
          description: 'Asistencias y trayectoria deportiva del socio titular y su grupo familiar.',
          roles: ROLES_SOCIO_TITULAR,
        } satisfies SeoRouteData,
        loadComponent: cargarMiTrayectoriaSocios,
      },
      {
        path: 'mis-entrenamientos',
        data: {
          title: 'Mis entrenamientos',
          description: 'Rutinas de entrenamiento asignadas.',
          roles: ROLES_SOCIO_TITULAR,
        } satisfies SeoRouteData,
        loadComponent: cargarMisEntrenamientosSocios,
      },
      {
        path: 'mis-membresias',
        data: {
          title: 'Mis pases',
          description: 'Pases contratados, vencimientos e ingresos.',
          roles: ROLES_SOCIO_TITULAR,
        } satisfies SeoRouteData,
        loadComponent: cargarMisMembresiasSocios,
      },
      {
        path: 'mis-descuentos',
        data: {
          title: 'Mis descuentos',
          description: 'Descuentos del socio en cuotas y actividades.',
          roles: ROLES_SOCIO_TITULAR,
        } satisfies SeoRouteData,
        loadComponent: cargarMisDescuentosSocios,
      },
      {
        path: 'mis-evaluaciones',
        data: {
          title: 'Mis evaluaciones',
          description: 'Evaluaciones físicas y su evolución.',
          roles: ROLES_SOCIO_TITULAR,
        } satisfies SeoRouteData,
        loadComponent: cargarMisEvaluacionesSocios,
      },
      {
        path: 'calendario',
        data: {
          title: 'Mi calendario',
          description: 'Calendario de actividades del socio.',
          roles: ROLES_SOCIO_TITULAR,
        } satisfies SeoRouteData,
        loadComponent: cargarCalendarioSocios,
      },
    ],
  },
  {
    path: 'socio-familiar',
    canActivate: [authRoleGuard],
    canActivateChild: [authRoleChildGuard],
    data: {
      title: 'Socio familiar',
      description: 'Portal privado del socio familiar.',
      roles: ROLES_SOCIO_FAMILIAR,
    } satisfies SeoRouteData,
    loadComponent: () =>
      import('../layout/components/layout-socios/layout-socios.component').then(
        (m) => m.LayoutSociosComponent,
      ),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'credencial' },
      {
        path: 'perfil',
        data: {
          title: 'Mi perfil',
          description: 'Perfil del socio familiar.',
          roles: ROLES_SOCIO_FAMILIAR,
        } satisfies SeoRouteData,
        loadComponent: cargarMiPerfilCompartido,
      },
      {
        path: 'certificados',
        data: {
          title: 'Certificados',
          description: 'Certificados médicos del socio familiar.',
          roles: ROLES_SOCIO_FAMILIAR,
        } satisfies SeoRouteData,
        loadComponent: cargarCertificadosSocios,
      },
      {
        path: 'credencial',
        data: {
          title: 'Mi credencial',
          description: 'Credencial del socio familiar.',
          roles: ROLES_SOCIO_FAMILIAR,
        } satisfies SeoRouteData,
        loadComponent: cargarCredencialSocios,
      },
      {
        path: 'actividades',
        data: {
          title: 'Actividades',
          description: 'Actividades en las que está inscripto el socio familiar.',
          roles: ROLES_SOCIO_FAMILIAR,
        } satisfies SeoRouteData,
        loadComponent: cargarActividadesSocios,
      },
      {
        path: 'mi-trayectoria',
        data: {
          title: 'Mi trayectoria',
          description: 'Asistencias y trayectoria deportiva del socio familiar.',
          roles: ROLES_SOCIO_FAMILIAR,
        } satisfies SeoRouteData,
        loadComponent: cargarMiTrayectoriaSocios,
      },
      {
        path: 'mis-entrenamientos',
        data: {
          title: 'Mis entrenamientos',
          description: 'Rutinas de entrenamiento asignadas.',
          roles: ROLES_SOCIO_FAMILIAR,
        } satisfies SeoRouteData,
        loadComponent: cargarMisEntrenamientosSocios,
      },
      {
        path: 'mis-membresias',
        data: {
          title: 'Mis pases',
          description: 'Pases contratados, vencimientos e ingresos.',
          roles: ROLES_SOCIO_FAMILIAR,
        } satisfies SeoRouteData,
        loadComponent: cargarMisMembresiasSocios,
      },
      {
        path: 'mis-descuentos',
        data: {
          title: 'Mis descuentos',
          description: 'Descuentos del socio en cuotas y actividades.',
          roles: ROLES_SOCIO_FAMILIAR,
        } satisfies SeoRouteData,
        loadComponent: cargarMisDescuentosSocios,
      },
      {
        path: 'mis-evaluaciones',
        data: {
          title: 'Mis evaluaciones',
          description: 'Evaluaciones físicas y su evolución.',
          roles: ROLES_SOCIO_FAMILIAR,
        } satisfies SeoRouteData,
        loadComponent: cargarMisEvaluacionesSocios,
      },
      {
        path: 'calendario',
        data: {
          title: 'Mi calendario',
          description: 'Calendario de actividades del socio familiar.',
          roles: ROLES_SOCIO_FAMILIAR,
        } satisfies SeoRouteData,
        loadComponent: cargarCalendarioSocios,
      },
    ],
  },
];
