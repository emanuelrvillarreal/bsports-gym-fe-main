import { Route, Routes } from '@angular/router';

import { AppRole } from '../../core/auth/auth-role';
import { authRoleChildGuard, authRoleGuard } from '../../core/guards/auth-role.guard';
import { perfilEmpresaAdminGuard } from '../../core/guards/perfil-empresa.guard';
import { SeoRouteData } from '../../core/routing/seo-route-data';
import { cargarConfiguracionCompartida } from '../_compartido-perfiles/compartido-perfiles.routes';
import { RolAdministrativo, obtenerSeccionAdministracion } from './secciones-administracion';
import {
  DatosRutaSeccion,
  redirigirPrimeraSolapaGuard,
  solapaVisibleGuard,
} from './secciones-administracion.guards';

const ROLES_SYSADMIN: readonly AppRole[] = ['SYSADMIN'];
const ROLES_ADMIN: readonly AppRole[] = ['ADMIN'];
const ROLES_ADM_RECEPCION: readonly AppRole[] = ['ADM_RECEPCION'];

interface ActividadesAdministradoresRouteData extends SeoRouteData {
  readonly puedeAdministrar: boolean;
  readonly subtituloPagina: string;
}

interface SociosAdministradoresRouteData extends SeoRouteData {
  readonly filasVisiblesTabla: number;
}

interface DashboardAdministradoresRouteData extends SeoRouteData {
  readonly tituloPagina: string;
  readonly subtituloPagina: string;
}

interface ConfiguracionAdministradoresRouteData extends SeoRouteData {
  readonly puedeGestionarBranding: true;
  readonly puedeGestionarPerfilEmpresa: true;
  readonly puedeAccederCrmManager?: true;
}

const cargarDashboardAdministradores = () =>
  import('./pages/dashboard/dashboard-page.component').then(
    (m) => m.DashboardAdministradoresPageComponent,
  );

const cargarSolicitudesRegistroAdministradores = () =>
  import('./pages/solicitudes-registro/solicitudes-registro-page.component').then(
    (m) => m.SolicitudesRegistroAdministradoresPageComponent,
  );

const cargarSociosAdministradores = () =>
  import('./pages/socios/socios-page.component').then((m) => m.SociosAdministradoresPageComponent);

const cargarActividadesAdministradores = () =>
  import('./pages/actividades/actividades-page.component').then(
    (m) => m.ActividadesAdministradoresPageComponent,
  );

const cargarEventosAdministradores = () =>
  import('./pages/eventos/eventos-page.component').then(
    (m) => m.EventosAdministradoresPageComponent,
  );

const cargarEventosAccesoAdministradores = () =>
  import('./pages/eventos-acceso/eventos-acceso-page.component').then(
    (m) => m.EventosAccesoPageComponent,
  );

const cargarCategoriasAdministradores = () =>
  import('./pages/categorias/categorias-page.component').then((m) => m.CategoriasPageComponent);

const cargarCuotaSocialAdministradores = () =>
  import('./pages/cuota-social/cuota-social-page.component').then(
    (m) => m.CuotaSocialPageComponent,
  );

const cargarTesoreriaAdministradores = () =>
  import('./pages/tesoreria/tesoreria-page.component').then((m) => m.TesoreriaPageComponent);

const cargarIngresosAdministradores = () =>
  import('./pages/ingresos/ingresos-page.component').then((m) => m.IngresosPageComponent);

const cargarDescuentosAdministradores = () =>
  import('./pages/descuentos/descuentos-page.component').then((m) => m.DescuentosPageComponent);

const cargarAccesosAdministradores = () =>
  import('./pages/accesos/accesos-page.component').then((m) => m.AccesosPageComponent);

const cargarAmenitiesAdministradores = () =>
  import('./pages/amenities/amenities-page.component').then((m) => m.AmenitiesPageComponent);

const cargarSeccionConSolapas = () =>
  import('./pages/seccion-con-solapas/seccion-con-solapas-page.component').then(
    (m) => m.SeccionConSolapasPageComponent,
  );

/** Pantalla que se monta como solapa; `roles`, `seccionId` y `solapaId` los completa el helper. */
interface RutaSolapa {
  readonly solapaId: string;
  readonly data: SeoRouteData & Record<string, unknown>;
  readonly loadComponent: NonNullable<Route['loadComponent']>;
}

/**
 * Arma la ruta de una sección del catálogo (`secciones-administracion.ts`): el contenedor con
 * solapas, una ruta hija por pantalla y, si hay varias, la raíz que redirige a la primera
 * visible. Así `/admin/socios` sigue funcionando aunque ahora sea una sección.
 */
function crearRutaSeccion(
  rol: RolAdministrativo,
  seccionId: string,
  solapas: readonly RutaSolapa[],
): Route {
  const seccion = obtenerSeccionAdministracion(seccionId);
  const roles: readonly AppRole[] = [rol];
  const datosSeccion: DatosRutaSeccion = { seccionId, rolMenu: rol };

  const hijas: Route[] = solapas.map(({ solapaId, data, loadComponent }) => {
    const solapa = seccion.solapas.find((candidata) => candidata.id === solapaId);
    if (!solapa) {
      throw new Error(`La solapa ${solapaId} no existe en la sección ${seccionId}.`);
    }
    return {
      path: solapa.segmento,
      canActivate: [solapaVisibleGuard],
      data: { ...data, roles, ...datosSeccion, solapaId } satisfies SeoRouteData & DatosRutaSeccion,
      loadComponent,
    };
  });

  const tieneRaizPropia = hijas.some((hija) => hija.path === '');
  return {
    path: seccion.segmento,
    data: {
      title: seccion.etiqueta,
      description: `Sección ${seccion.etiqueta} del club.`,
      roles,
      ...datosSeccion,
    } satisfies SeoRouteData & DatosRutaSeccion,
    loadComponent: cargarSeccionConSolapas,
    children: tieneRaizPropia
      ? hijas
      : [
          {
            path: '',
            pathMatch: 'full',
            canActivate: [redirigirPrimeraSolapaGuard],
            data: { roles, ...datosSeccion },
            children: [],
          },
          ...hijas,
        ],
  };
}

/** Direcciones anteriores a la organización por secciones; se conservan para links y favoritos. */
const REDIRECCIONES_RUTAS_ANTERIORES: Routes = [
  { path: 'solicitudes-registro', pathMatch: 'full', redirectTo: 'socios/solicitudes' },
  { path: 'eventos', pathMatch: 'full', redirectTo: 'actividades/eventos' },
  { path: 'categorias', pathMatch: 'full', redirectTo: 'actividades/categorias' },
  { path: 'ingresos', pathMatch: 'full', redirectTo: 'tesoreria/ingresos' },
  { path: 'cuota-social', pathMatch: 'full', redirectTo: 'tesoreria/cuota-social' },
  { path: 'descuentos', pathMatch: 'full', redirectTo: 'tesoreria/descuentos' },
  { path: 'eventos-acceso', pathMatch: 'full', redirectTo: 'accesos/entradas-eventos' },
  { path: 'profesores', pathMatch: 'full', redirectTo: 'equipo/profesores' },
  { path: 'usuarios-recepcion', pathMatch: 'full', redirectTo: 'equipo/recepcion' },
];

export const ADMINISTRADORES_ROUTES: Routes = [
  {
    path: 'sysadmin',
    canActivate: [authRoleGuard],
    canActivateChild: [authRoleChildGuard],
    data: {
      title: 'Sistema',
      description: 'Administración global de B Sports Gym.',
      roles: ROLES_SYSADMIN,
    } satisfies SeoRouteData,
    loadComponent: () =>
      import('../layout/components/layout-sysadmin/layout-sysadmin.component').then(
        (m) => m.LayoutSysadminComponent,
      ),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'nueva-empresa' },
      {
        path: 'nueva-empresa',
        data: {
          title: 'Nueva empresa',
          description: 'Alta de un club y su administrador inicial.',
          roles: ROLES_SYSADMIN,
        } satisfies SeoRouteData,
        loadComponent: () =>
          import('./pages/nueva-empresa/nueva-empresa-page.component').then(
            (m) => m.NuevaEmpresaPageComponent,
          ),
      },
      {
        path: 'clubes',
        data: {
          title: 'Clubes',
          description: 'Gestión global de clubes y administradores.',
          roles: ROLES_SYSADMIN,
        } satisfies SeoRouteData,
        loadComponent: () =>
          import('./pages/clubes/clubes-page.component').then((m) => m.ClubesPageComponent),
      },
      {
        path: 'mercado-pago',
        data: {
          title: 'Mercado Pago por empresa',
          description: 'Configuración segura de credenciales de cobro por comercio.',
          roles: ROLES_SYSADMIN,
        } satisfies SeoRouteData,
        loadComponent: () =>
          import('./pages/mercado-pago-empresas/mercado-pago-empresas-page.component').then(
            (m) => m.MercadoPagoEmpresasPageComponent,
          ),
      },
      {
        path: 'crm-manager',
        data: {
          title: 'CRM Manager',
          description: 'Administración global de suscripciones CRM por empresa.',
          roles: ROLES_SYSADMIN,
        } satisfies SeoRouteData,
        loadComponent: () =>
          import('./pages/crm-manager-sysadmin/crm-manager-sysadmin-page.component').then(
            (m) => m.CrmManagerSysadminPageComponent,
          ),
      },
      {
        path: 'cuota-social',
        data: {
          title: 'Cuota social',
          description: 'Gestion de categorias, periodicidad y plazos de cuota social del club.',
          roles: ROLES_SYSADMIN,
        } satisfies SeoRouteData,
        loadComponent: cargarCuotaSocialAdministradores,
      },
      {
        path: 'configuracion',
        data: {
          title: 'Configuración',
          description: 'Configuración compartida del perfil.',
          roles: ROLES_SYSADMIN,
          puedeGestionarBranding: true,
          puedeGestionarPerfilEmpresa: true,
        } satisfies ConfiguracionAdministradoresRouteData,
        loadComponent: cargarConfiguracionCompartida,
      },
    ],
  },
  {
    path: 'admin',
    canActivate: [authRoleGuard],
    canActivateChild: [authRoleChildGuard, perfilEmpresaAdminGuard],
    data: {
      title: 'Administración',
      description: 'Gestión administrativa integral del club.',
      roles: ROLES_ADMIN,
    } satisfies SeoRouteData,
    loadComponent: () =>
      import('../layout/components/layout-administradores/layout-administradores.component').then(
        (m) => m.LayoutAdministradoresComponent,
      ),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'completar-perfil',
        data: {
          title: 'Completar perfil del club',
          description: 'Configuración inicial del perfil institucional del club.',
          roles: ROLES_ADMIN,
        } satisfies SeoRouteData,
        loadComponent: () =>
          import('./pages/completar-perfil/completar-perfil-page.component').then(
            (m) => m.CompletarPerfilPageComponent,
          ),
      },
      {
        path: 'dashboard',
        data: {
          title: 'Dashboard de administración',
          description: 'Dashboard del administrador del club.',
          roles: ROLES_ADMIN,
          tituloPagina: 'Administración',
          subtituloPagina: 'Gestioná la operación integral del club.',
        } satisfies DashboardAdministradoresRouteData,
        loadComponent: cargarDashboardAdministradores,
      },
      crearRutaSeccion('ADMIN', 'socios', [
        {
          solapaId: 'socios',
          data: {
            title: 'Socios',
            description: 'Gestión de socios y familiares.',
            filasVisiblesTabla: 4,
          } satisfies SociosAdministradoresRouteData,
          loadComponent: cargarSociosAdministradores,
        },
        {
          solapaId: 'solicitudes',
          data: {
            title: 'Solicitudes de socios',
            description: 'Registros pendientes de aprobación.',
          },
          loadComponent: cargarSolicitudesRegistroAdministradores,
        },
        {
          solapaId: 'certificados',
          data: {
            title: 'Certificados médicos',
            description: 'Estado de los certificados médicos de los socios y su vigencia.',
          },
          loadComponent: () =>
            import('./pages/certificados-medicos/certificados-medicos-page.component').then(
              (m) => m.CertificadosMedicosPageComponent,
            ),
        },
        {
          solapaId: 'evaluaciones',
          data: {
            title: 'Evaluaciones físicas',
            description: 'Peso, IMC, composición corporal y medidas de los socios, con su evolución.',
          },
          loadComponent: () =>
            import('./pages/evaluaciones/evaluaciones-page.component').then((m) => m.EvaluacionesAdminPageComponent),
        },
      ]),
      crearRutaSeccion('ADMIN', 'actividades', [
        {
          solapaId: 'actividades',
          data: {
            title: 'Actividades',
            description: 'Gestión de actividades e inscripciones.',
            puedeAdministrar: true,
            subtituloPagina: 'Administrá las actividades básicas y sus inscripciones.',
          } satisfies ActividadesAdministradoresRouteData,
          loadComponent: cargarActividadesAdministradores,
        },
        {
          solapaId: 'eventos',
          data: {
            title: 'Eventos',
            description: 'Gestión de eventos asociados a las actividades del club.',
          },
          loadComponent: cargarEventosAdministradores,
        },
        {
          solapaId: 'categorias',
          data: {
            title: 'Categorías',
            description: 'Gestión de categorías para las actividades del club.',
          },
          loadComponent: cargarCategoriasAdministradores,
        },
        {
          solapaId: 'asistencia',
          data: {
            title: 'Estadísticas de asistencia',
            description: 'Asistencia, alertas y trayectoria de los socios en las actividades del club.',
          },
          loadComponent: () =>
            import('./pages/estadisticas-asistencia/estadisticas-asistencia-page.component').then(
              (m) => m.EstadisticasAsistenciaPageComponent,
            ),
        },
        {
          solapaId: 'entrenamiento',
          data: {
            title: 'Entrenamiento',
            description: 'Rutinas, biblioteca de ejercicios, asignaciones y seguimiento de entrenamientos.',
          },
          loadComponent: () =>
            import('./pages/entrenamiento/entrenamiento-page.component').then((m) => m.EntrenamientoAdminPageComponent),
        },
      ]),
      crearRutaSeccion('ADMIN', 'tesoreria', [
        {
          solapaId: 'cuotas',
          data: { title: 'Cobros', description: 'Balance y herramientas de cuotas.' },
          loadComponent: cargarTesoreriaAdministradores,
        },
        {
          solapaId: 'ingresos',
          data: { title: 'Movimientos', description: 'Ingresos y movimientos de caja del club.' },
          loadComponent: cargarIngresosAdministradores,
        },
        {
          solapaId: 'cuota-social',
          data: {
            title: 'Cuota social',
            description: 'Gestion de categorias y habilitacion de cuota social del club.',
          },
          loadComponent: cargarCuotaSocialAdministradores,
        },
        {
          solapaId: 'descuentos',
          data: {
            title: 'Descuentos',
            description: 'Gestión de descuentos y sus asignaciones en el club.',
          },
          loadComponent: cargarDescuentosAdministradores,
        },
        {
          solapaId: 'reportes',
          data: {
            title: 'Reportes y exportaciones',
            description: 'Movimientos económicos con filtros, comparación de períodos, cuotas y descarga en Excel.',
          },
          loadComponent: () =>
            import('./pages/reportes-economicos/reportes-economicos-page.component').then(
              (m) => m.ReportesEconomicosPageComponent,
            ),
        },
      ]),
      crearRutaSeccion('ADMIN', 'accesos', [
        {
          solapaId: 'accesos',
          data: { title: 'Accesos', description: 'Registro e historial de accesos al club.' },
          loadComponent: cargarAccesosAdministradores,
        },
        {
          solapaId: 'entradas-eventos',
          data: {
            title: 'Entradas a eventos',
            description: 'Gestión de eventos de acceso e ingreso de socios e invitados.',
          },
          loadComponent: cargarEventosAccesoAdministradores,
        },
      ]),
      crearRutaSeccion('ADMIN', 'amenities', [
        {
          solapaId: 'amenities',
          data: {
            title: 'Comodidades',
            description: 'Configuración de comodidades y gestión de reservas.',
            puedeConfigurarAmenities: true,
          },
          loadComponent: cargarAmenitiesAdministradores,
        },
      ]),
      crearRutaSeccion('ADMIN', 'membresias', [
        {
          solapaId: 'membresias',
          data: {
            title: 'Membresías',
            description: 'Pases activos, vencimientos, renovaciones, bajas e ingresos por pase.',
          },
          loadComponent: () =>
            import('./pages/membresias/membresias-page.component').then((m) => m.MembresiasPageComponent),
        },
        {
          solapaId: 'pases',
          data: {
            title: 'Pases',
            description: 'Tipos de pases que vende el club y control de ingreso por QR.',
          },
          loadComponent: () =>
            import('./pages/membresias/pases-page.component').then((m) => m.PasesPageComponent),
        },
      ]),
      crearRutaSeccion('ADMIN', 'competencias', [
        {
          solapaId: 'competencias',
          data: {
            title: 'Competencias',
            description: 'Equipos y planteles, torneos, partidos, tabla de posiciones y estadísticas.',
          },
          loadComponent: () =>
            import('./pages/competencias/competencias-page.component').then((m) => m.CompetenciasPageComponent),
        },
      ]),
      crearRutaSeccion('ADMIN', 'equipamiento', [
        {
          solapaId: 'equipamiento',
          data: {
            title: 'Equipamiento',
            description: 'Inventario de equipamiento deportivo, mantenimientos y reparaciones.',
          },
          loadComponent: () =>
            import('./pages/equipamiento/equipamiento-page.component').then((m) => m.EquipamientoPageComponent),
        },
      ]),
      crearRutaSeccion('ADMIN', 'equipo', [
        {
          solapaId: 'personal',
          data: { title: 'Personal', description: 'Personas del club y sus roles.' },
          loadComponent: () =>
            import('./pages/personal/personal-page.component').then((m) => m.PersonalPageComponent),
        },
        {
          solapaId: 'profesores',
          data: { title: 'Profesores', description: 'Gestión de profesores.' },
          loadComponent: () =>
            import('./pages/profesores/profesores-page.component').then(
              (m) => m.ProfesoresPageComponent,
            ),
        },
        {
          solapaId: 'recepcion',
          data: {
            title: 'Usuarios de recepción',
            description: 'Gestión del personal de recepción.',
          },
          loadComponent: () =>
            import('./pages/usuarios-recepcion/usuarios-recepcion-page.component').then(
              (m) => m.UsuariosRecepcionPageComponent,
            ),
        },
      ]),
      crearRutaSeccion('ADMIN', 'configuracion', [
        {
          solapaId: 'datos-club',
          data: {
            title: 'Configuración',
            description: 'Configuración compartida del perfil.',
            puedeGestionarBranding: true,
            puedeGestionarPerfilEmpresa: true,
            puedeAccederCrmManager: true,
          } satisfies ConfiguracionAdministradoresRouteData,
          loadComponent: cargarConfiguracionCompartida,
        },
        {
          solapaId: 'menu-solapas',
          data: {
            title: 'Menú y solapas',
            description: 'Pantallas del panel visibles para administración y recepción.',
          },
          loadComponent: () =>
            import('./pages/menu-solapas/menu-solapas-page.component').then(
              (m) => m.MenuSolapasPageComponent,
            ),
        },
      ]),
      {
        path: 'crm-manager',
        data: {
          title: 'CRM Manager',
          description: 'Facturas y pagos de la suscripción CRM del club.',
          roles: ROLES_ADMIN,
        } satisfies SeoRouteData,
        loadComponent: () =>
          import('./pages/crm-manager-admin/crm-manager-admin-page.component').then(
            (m) => m.CrmManagerAdminPageComponent,
          ),
      },
      ...REDIRECCIONES_RUTAS_ANTERIORES,
    ],
  },
  {
    path: 'adm-recepcion',
    canActivate: [authRoleGuard],
    canActivateChild: [authRoleChildGuard],
    data: {
      title: 'Recepción',
      description: 'Gestión operativa y atención del club.',
      roles: ROLES_ADM_RECEPCION,
    } satisfies SeoRouteData,
    loadComponent: () =>
      import('../layout/components/layout-administradores/layout-administradores.component').then(
        (m) => m.LayoutAdministradoresComponent,
      ),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'accesos' },
      { path: 'dashboard', pathMatch: 'full', redirectTo: 'accesos' },
      crearRutaSeccion('ADM_RECEPCION', 'socios', [
        {
          solapaId: 'socios',
          data: {
            title: 'Socios',
            description: 'Gestión de socios y familiares.',
            filasVisiblesTabla: 50,
          } satisfies SociosAdministradoresRouteData,
          loadComponent: cargarSociosAdministradores,
        },
        {
          solapaId: 'solicitudes',
          data: {
            title: 'Solicitudes de socios',
            description: 'Registros pendientes de aprobación.',
          },
          loadComponent: cargarSolicitudesRegistroAdministradores,
        },
        {
          solapaId: 'certificados',
          data: {
            title: 'Certificados médicos',
            description: 'Estado de los certificados médicos de los socios y su vigencia.',
          },
          loadComponent: () =>
            import('./pages/certificados-medicos/certificados-medicos-page.component').then(
              (m) => m.CertificadosMedicosPageComponent,
            ),
        },
      ]),
      crearRutaSeccion('ADM_RECEPCION', 'actividades', [
        {
          solapaId: 'actividades',
          data: {
            title: 'Actividades',
            description: 'Consulta de actividades e inscripciones.',
            puedeAdministrar: true,
            subtituloPagina: 'Consultá actividades y gestioná inscripciones.',
          } satisfies ActividadesAdministradoresRouteData,
          loadComponent: cargarActividadesAdministradores,
        },
        {
          solapaId: 'eventos',
          data: {
            title: 'Eventos',
            description: 'Consulta y gestión de eventos asociados a las actividades.',
          },
          loadComponent: cargarEventosAdministradores,
        },
      ]),
      crearRutaSeccion('ADM_RECEPCION', 'tesoreria', [
        {
          solapaId: 'cuotas',
          data: { title: 'Cobros', description: 'Gestión operativa de cuotas del club.' },
          loadComponent: cargarTesoreriaAdministradores,
        },
        {
          solapaId: 'ingresos',
          data: { title: 'Movimientos', description: 'Ingresos y movimientos de caja del club.' },
          loadComponent: cargarIngresosAdministradores,
        },
        {
          solapaId: 'descuentos',
          data: {
            title: 'Descuentos',
            description: 'Gestión de descuentos y sus asignaciones en el club.',
          },
          loadComponent: cargarDescuentosAdministradores,
        },
      ]),
      crearRutaSeccion('ADM_RECEPCION', 'accesos', [
        {
          solapaId: 'accesos',
          data: { title: 'Accesos', description: 'Registro e historial de accesos al club.' },
          loadComponent: cargarAccesosAdministradores,
        },
        {
          solapaId: 'entradas-eventos',
          data: {
            title: 'Entradas a eventos',
            description: 'Gestión de eventos de acceso e ingreso de socios e invitados.',
          },
          loadComponent: cargarEventosAccesoAdministradores,
        },
      ]),
      crearRutaSeccion('ADM_RECEPCION', 'amenities', [
        {
          solapaId: 'amenities',
          data: {
            title: 'Comodidades',
            description: 'Operación de reservas de comodidades.',
            puedeConfigurarAmenities: false,
          },
          loadComponent: cargarAmenitiesAdministradores,
        },
      ]),
      ...REDIRECCIONES_RUTAS_ANTERIORES,
    ],
  },
];
