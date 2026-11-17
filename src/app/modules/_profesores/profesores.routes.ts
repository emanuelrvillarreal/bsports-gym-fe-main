import { Routes } from '@angular/router';

import { AppRole } from '../../core/auth/auth-role';
import { authRoleChildGuard, authRoleGuard } from '../../core/guards/auth-role.guard';
import { SeoRouteData } from '../../core/routing/seo-route-data';
import { cargarMiPerfilCompartido } from '../_compartido-perfiles/compartido-perfiles.routes';

const ROLES_PROFESOR: readonly AppRole[] = ['PROFESOR'];

export const PROFESORES_ROUTES: Routes = [
  {
    path: 'profesor',
    canActivate: [authRoleGuard],
    canActivateChild: [authRoleChildGuard],
    data: {
      title: 'Profesor',
      description: 'Herramientas privadas para profesores.',
      roles: ROLES_PROFESOR,
    } satisfies SeoRouteData,
    loadComponent: () =>
      import('../layout/components/layout-profesor/layout-profesor.component').then(
        (m) => m.LayoutProfesorComponent,
      ),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'eventos' },
      {
        path: 'eventos',
        data: {
          title: 'Eventos del profesor',
          description: 'Gestión de eventos asignados del profesor.',
          roles: ROLES_PROFESOR,
        } satisfies SeoRouteData,
        loadComponent: () =>
          import('./pages/eventos/eventos-page.component').then(
            (m) => m.EventosProfesorPageComponent,
          ),
      },
      {
        path: 'mis-actividades',
        data: {
          title: 'Mis actividades',
          description: 'Actividades asignadas al profesor.',
          roles: ROLES_PROFESOR,
        } satisfies SeoRouteData,
        loadComponent: () =>
          import('./pages/mis-actividades/mis-actividades-page.component').then(
            (m) => m.MisActividadesProfesorPageComponent,
          ),
      },
      {
        path: 'perfil',
        data: {
          title: 'Mi perfil',
          description: 'Perfil del profesor.',
          roles: ROLES_PROFESOR,
        } satisfies SeoRouteData,
        loadComponent: cargarMiPerfilCompartido,
      },
      {
        path: 'credencial',
        data: {
          title: 'Mi credencial',
          description: 'Credencial del profesor.',
          roles: ROLES_PROFESOR,
        } satisfies SeoRouteData,
        loadComponent: () =>
          import('./pages/credencial/credencial-page.component').then(
            (m) => m.CredencialProfesorPageComponent,
          ),
      },
      {
        path: 'calendario',
        data: {
          title: 'Mi calendario',
          description: 'Calendario de actividades asignadas.',
          roles: ROLES_PROFESOR,
        } satisfies SeoRouteData,
        loadComponent: () =>
          import('./pages/calendario/calendario-page.component').then(
            (m) => m.CalendarioProfesorPageComponent,
          ),
      },
      {
        path: 'seguimiento',
        data: {
          title: 'Seguimiento de mis alumnos',
          description: 'Asistencia, antigüedad e historial de los alumnos del profesor.',
          roles: ROLES_PROFESOR,
        } satisfies SeoRouteData,
        loadComponent: () =>
          import('./pages/seguimiento/seguimiento-page.component').then(
            (m) => m.SeguimientoProfesorPageComponent,
          ),
      },
      {
        path: 'entrenamiento',
        data: {
          title: 'Entrenamiento',
          description: 'Rutinas y biblioteca de ejercicios del profesor.',
          roles: ROLES_PROFESOR,
        } satisfies SeoRouteData,
        loadComponent: () =>
          import('./pages/entrenamiento/entrenamiento-page.component').then(
            (m) => m.EntrenamientoProfesorPageComponent,
          ),
      },
      {
        path: 'evaluaciones',
        data: {
          title: 'Evaluaciones físicas',
          description: 'Evaluaciones físicas de los alumnos del profesor.',
          roles: ROLES_PROFESOR,
        } satisfies SeoRouteData,
        loadComponent: () =>
          import('./pages/evaluaciones/evaluaciones-page.component').then(
            (m) => m.EvaluacionesProfesorPageComponent,
          ),
      },
      {
        path: 'mis-equipos',
        data: {
          title: 'Mis equipos',
          description: 'Equipos y planteles asignados al profesor.',
          roles: ROLES_PROFESOR,
        } satisfies SeoRouteData,
        loadComponent: () =>
          import('./pages/mis-equipos/mis-equipos-page.component').then(
            (m) => m.MisEquiposProfesorPageComponent,
          ),
      },
      {
        path: 'asistencias',
        data: {
          title: 'Asistencias',
          description: 'Registro de asistencia de actividades asignadas.',
          roles: ROLES_PROFESOR,
        } satisfies SeoRouteData,
        loadComponent: () =>
          import('./pages/asistencias/asistencias-page.component').then(
            (m) => m.AsistenciasProfesorPageComponent,
          ),
      },
    ],
  },
];
