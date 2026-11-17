import { AppRole } from '../../core/auth/auth-role';
import { IconoApp } from '../../core/icons/iconos-app.service';

/** Roles que navegan el panel administrativo por secciones con solapas. */
export type RolAdministrativo = Extract<AppRole, 'ADMIN' | 'ADM_RECEPCION'>;

/** Pestaña dentro de una sección; su `id` es el que se guarda al ocultarla. */
export interface SolapaAdministracion {
  readonly id: string;
  readonly etiqueta: string;
  readonly icono: IconoApp;
  /** Segmento de URL bajo la sección. Vacío cuando la sección tiene una sola pantalla. */
  readonly segmento: string;
  readonly roles: readonly RolAdministrativo[];
  /** `false` para pantallas que el club no puede apagar (ej. la propia configuración del menú). */
  readonly ocultable: boolean;
}

/** Entrada del menú lateral que agrupa pantallas relacionadas. */
export interface SeccionAdministracion {
  readonly id: string;
  readonly etiqueta: string;
  readonly icono: IconoApp;
  readonly segmento: string;
  readonly solapas: readonly SolapaAdministracion[];
}

const AMBOS: readonly RolAdministrativo[] = ['ADMIN', 'ADM_RECEPCION'];
const SOLO_ADMIN: readonly RolAdministrativo[] = ['ADMIN'];

/**
 * Catálogo único de secciones del panel administrativo. Lo consumen las rutas, el menú
 * lateral y la configuración "Menú y solapas"; el orden de este arreglo es el del menú.
 */
export const SECCIONES_ADMINISTRACION: readonly SeccionAdministracion[] = [
  {
    id: 'socios',
    etiqueta: 'Socios',
    icono: 'socios',
    segmento: 'socios',
    solapas: [
      { id: 'socios', etiqueta: 'Socios', icono: 'socios', segmento: 'listado', roles: AMBOS, ocultable: true },
      {
        id: 'solicitudes',
        etiqueta: 'Pedidos de alta',
        icono: 'solicitudesSocios',
        segmento: 'solicitudes',
        roles: AMBOS,
        ocultable: true,
      },
      {
        id: 'certificados',
        etiqueta: 'Certificados médicos',
        icono: 'certificados',
        segmento: 'certificados',
        roles: AMBOS,
        ocultable: true,
      },
      {
        id: 'evaluaciones',
        etiqueta: 'Evaluaciones físicas',
        icono: 'certificados',
        segmento: 'evaluaciones',
        roles: SOLO_ADMIN,
        ocultable: true,
      },
    ],
  },
  {
    id: 'actividades',
    etiqueta: 'Actividades',
    icono: 'actividades',
    segmento: 'actividades',
    solapas: [
      {
        id: 'actividades',
        etiqueta: 'Actividades',
        icono: 'actividades',
        segmento: 'listado',
        roles: AMBOS,
        ocultable: true,
      },
      { id: 'eventos', etiqueta: 'Eventos', icono: 'eventos', segmento: 'eventos', roles: AMBOS, ocultable: true },
      {
        id: 'categorias',
        etiqueta: 'Categorías',
        icono: 'categorias',
        segmento: 'categorias',
        roles: SOLO_ADMIN,
        ocultable: true,
      },
      {
        id: 'asistencia',
        etiqueta: 'Asistencia',
        icono: 'dashboard',
        segmento: 'asistencia',
        roles: SOLO_ADMIN,
        ocultable: true,
      },
      {
        id: 'entrenamiento',
        etiqueta: 'Entrenamiento',
        icono: 'eventos',
        segmento: 'entrenamiento',
        roles: SOLO_ADMIN,
        ocultable: true,
      },
    ],
  },
  {
    id: 'tesoreria',
    etiqueta: 'Cobros',
    icono: 'tesoreria',
    segmento: 'tesoreria',
    solapas: [
      { id: 'cuotas', etiqueta: 'Cuotas', icono: 'tesoreria', segmento: 'cuotas', roles: AMBOS, ocultable: true },
      { id: 'ingresos', etiqueta: 'Movimientos', icono: 'ingresos', segmento: 'ingresos', roles: AMBOS, ocultable: true },
      {
        id: 'cuota-social',
        etiqueta: 'Cuota social',
        icono: 'tesoreria',
        segmento: 'cuota-social',
        roles: SOLO_ADMIN,
        ocultable: true,
      },
      {
        id: 'descuentos',
        etiqueta: 'Descuentos',
        icono: 'descuentos',
        segmento: 'descuentos',
        roles: AMBOS,
        ocultable: true,
      },
      {
        id: 'reportes',
        etiqueta: 'Reportes',
        icono: 'dashboard',
        segmento: 'reportes',
        roles: SOLO_ADMIN,
        ocultable: true,
      },
    ],
  },
  {
    id: 'accesos',
    etiqueta: 'Entradas al gimnasio',
    icono: 'credencial',
    segmento: 'accesos',
    solapas: [
      {
        id: 'accesos',
        etiqueta: 'Registrar ingreso',
        icono: 'credencial',
        segmento: 'registro',
        roles: AMBOS,
        ocultable: true,
      },
      {
        id: 'entradas-eventos',
        etiqueta: 'Entradas a eventos',
        icono: 'entradasEventos',
        segmento: 'entradas-eventos',
        roles: AMBOS,
        ocultable: true,
      },
    ],
  },
  {
    id: 'amenities',
    etiqueta: 'Instalaciones',
    icono: 'amenities',
    segmento: 'amenities',
    solapas: [
      { id: 'amenities', etiqueta: 'Instalaciones', icono: 'amenities', segmento: '', roles: AMBOS, ocultable: true },
    ],
  },
  {
    id: 'membresias',
    etiqueta: 'Pases',
    icono: 'membresias',
    segmento: 'membresias',
    solapas: [
      {
        id: 'membresias',
        etiqueta: 'Pases vendidos',
        icono: 'membresias',
        segmento: '',
        roles: SOLO_ADMIN,
        ocultable: true,
      },
      {
        id: 'pases',
        etiqueta: 'Tipos de pase',
        icono: 'membresias',
        segmento: 'pases',
        roles: SOLO_ADMIN,
        ocultable: true,
      },
    ],
  },
  {
    id: 'competencias',
    etiqueta: 'Competencias',
    icono: 'eventos',
    segmento: 'competencias',
    solapas: [
      {
        id: 'competencias',
        etiqueta: 'Equipos y torneos',
        icono: 'eventos',
        segmento: '',
        roles: SOLO_ADMIN,
        ocultable: true,
      },
    ],
  },
  {
    id: 'equipamiento',
    etiqueta: 'Equipamiento',
    icono: 'equipamiento',
    segmento: 'equipamiento',
    solapas: [
      {
        id: 'equipamiento',
        etiqueta: 'Inventario y mantenimiento',
        icono: 'equipamiento',
        segmento: '',
        roles: SOLO_ADMIN,
        ocultable: true,
      },
    ],
  },
  {
    id: 'equipo',
    etiqueta: 'Personal',
    icono: 'usuariosRecepcion',
    segmento: 'equipo',
    solapas: [
      {
        id: 'personal',
        etiqueta: 'Personas y roles',
        icono: 'usuariosRecepcion',
        segmento: 'personas',
        roles: SOLO_ADMIN,
        ocultable: false,
      },
      {
        id: 'profesores',
        etiqueta: 'Profesores',
        icono: 'profesores',
        segmento: 'profesores',
        roles: SOLO_ADMIN,
        ocultable: true,
      },
      {
        id: 'recepcion',
        etiqueta: 'Recepción',
        icono: 'usuariosRecepcion',
        segmento: 'recepcion',
        roles: SOLO_ADMIN,
        ocultable: true,
      },
    ],
  },
  {
    id: 'configuracion',
    etiqueta: 'Configuración',
    icono: 'configuracion',
    segmento: 'configuracion',
    solapas: [
      {
        id: 'datos-club',
        etiqueta: 'Datos del gimnasio',
        icono: 'configuracion',
        segmento: 'club',
        roles: SOLO_ADMIN,
        ocultable: false,
      },
      {
        id: 'menu-solapas',
        etiqueta: 'Menú y solapas',
        icono: 'dashboard',
        segmento: 'menu',
        roles: SOLO_ADMIN,
        ocultable: false,
      },
    ],
  },
];

export function obtenerSeccionAdministracion(id: string): SeccionAdministracion {
  const seccion = SECCIONES_ADMINISTRACION.find((candidata) => candidata.id === id);
  if (!seccion) {
    throw new Error(`Sección administrativa inexistente: ${id}`);
  }
  return seccion;
}

export function obtenerRutaBaseAdministrativa(rol: RolAdministrativo): string {
  return rol === 'ADMIN' ? '/admin' : '/adm-recepcion';
}

/**
 * Lo oculto que realmente se aplica al rol. Si el club apagó todo lo que ese rol puede ver,
 * se ignora para no dejarlo sin ninguna pantalla (ni en un bucle de redirecciones).
 */
export function obtenerOcultasEfectivas(
  rol: RolAdministrativo,
  ocultas: ReadonlySet<string>,
): ReadonlySet<string> {
  const quedaAlgoVisible = SECCIONES_ADMINISTRACION.some(
    (seccion) => filtrarSolapas(seccion, rol, ocultas).length > 0,
  );
  return quedaAlgoVisible ? ocultas : new Set();
}

/** Solapas que el rol tiene permitidas y el club no ocultó, en orden. */
export function obtenerSolapasVisibles(
  seccion: SeccionAdministracion,
  rol: RolAdministrativo,
  ocultas: ReadonlySet<string>,
): readonly SolapaAdministracion[] {
  return filtrarSolapas(seccion, rol, obtenerOcultasEfectivas(rol, ocultas));
}

function filtrarSolapas(
  seccion: SeccionAdministracion,
  rol: RolAdministrativo,
  ocultas: ReadonlySet<string>,
): readonly SolapaAdministracion[] {
  return seccion.solapas.filter(
    (solapa) => solapa.roles.includes(rol) && (!solapa.ocultable || !ocultas.has(solapa.id)),
  );
}

/** Secciones con al menos una solapa visible para el rol, en el orden del menú. */
export function obtenerSeccionesVisibles(
  rol: RolAdministrativo,
  ocultas: ReadonlySet<string>,
): readonly SeccionAdministracion[] {
  return SECCIONES_ADMINISTRACION.filter(
    (seccion) => obtenerSolapasVisibles(seccion, rol, ocultas).length > 0,
  );
}

export function obtenerRutaSolapa(
  rol: RolAdministrativo,
  seccion: SeccionAdministracion,
  solapa: SolapaAdministracion,
): string {
  const rutaSeccion = `${obtenerRutaBaseAdministrativa(rol)}/${seccion.segmento}`;
  return solapa.segmento ? `${rutaSeccion}/${solapa.segmento}` : rutaSeccion;
}

/**
 * Primera pantalla a la que puede entrar el rol: la primera solapa visible de la sección
 * pedida o, si quedó vacía, la de la primera sección visible. `null` si no queda ninguna.
 */
export function obtenerRutaPrimeraSolapaVisible(
  rol: RolAdministrativo,
  ocultas: ReadonlySet<string>,
  seccionPreferida?: SeccionAdministracion,
): string | null {
  const candidatas = seccionPreferida
    ? [seccionPreferida, ...SECCIONES_ADMINISTRACION]
    : SECCIONES_ADMINISTRACION;

  for (const seccion of candidatas) {
    const [primera] = obtenerSolapasVisibles(seccion, rol, ocultas);
    if (primera) {
      return obtenerRutaSolapa(rol, seccion, primera);
    }
  }
  return null;
}
