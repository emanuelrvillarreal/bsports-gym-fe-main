import { IconoApp } from '../../core/icons/iconos-app.service';

/** Pantalla del portal dentro de un grupo; `segmento` es la ruta bajo /socio-titular o /socio-familiar. */
export interface SolapaPortal {
  readonly segmento: string;
  readonly etiqueta: string;
  readonly icono: IconoApp;
  /** Solo el titular la tiene (por ejemplo, las cuotas del grupo). */
  readonly soloTitular?: boolean;
}

/** Opción del menú del socio que agrupa varias pantallas en solapas. */
export interface GrupoPortal {
  readonly etiqueta: string;
  readonly icono: IconoApp;
  readonly solapas: readonly SolapaPortal[];
}

/**
 * Menú simplificado del socio (6 opciones): lo usan el menú lateral y las solapas de arriba de cada pantalla.
 * Un grupo con una sola solapa no muestra la barra de solapas.
 */
export const GRUPOS_PORTAL: readonly GrupoPortal[] = [
  {
    etiqueta: 'Mi credencial',
    icono: 'credencial',
    solapas: [{ segmento: 'credencial', etiqueta: 'Credencial', icono: 'credencial' }],
  },
  {
    etiqueta: 'Mis pagos',
    icono: 'tesoreria',
    solapas: [
      { segmento: 'cuotas', etiqueta: 'Cuotas', icono: 'tesoreria', soloTitular: true },
      { segmento: 'mis-membresias', etiqueta: 'Pases', icono: 'membresias' },
      { segmento: 'mis-descuentos', etiqueta: 'Descuentos', icono: 'tesoreria' },
    ],
  },
  {
    etiqueta: 'Mis actividades',
    icono: 'actividades',
    solapas: [
      { segmento: 'actividades', etiqueta: 'Actividades', icono: 'actividades' },
      { segmento: 'calendario', etiqueta: 'Calendario', icono: 'calendario' },
    ],
  },
  {
    etiqueta: 'Reservas',
    icono: 'amenities',
    solapas: [{ segmento: 'amenities', etiqueta: 'Reservas', icono: 'amenities', soloTitular: true }],
  },
  {
    etiqueta: 'Mi familia',
    icono: 'grupoFamiliar',
    solapas: [{ segmento: 'grupo-familiar', etiqueta: 'Mi familia', icono: 'grupoFamiliar', soloTitular: true }],
  },
  {
    etiqueta: 'Mi progreso',
    icono: 'certificados',
    solapas: [
      { segmento: 'mis-entrenamientos', etiqueta: 'Entrenamientos', icono: 'actividades' },
      { segmento: 'mis-evaluaciones', etiqueta: 'Evaluaciones', icono: 'certificados' },
      { segmento: 'mi-trayectoria', etiqueta: 'Trayectoria', icono: 'eventos' },
      { segmento: 'certificados', etiqueta: 'Certificados', icono: 'perfil' },
    ],
  },
];

/** Solapas del grupo que ese tipo de socio puede ver. */
export function solapasVisibles(grupo: GrupoPortal, titular: boolean): readonly SolapaPortal[] {
  return grupo.solapas.filter((s) => titular || !s.soloTitular);
}

/** Grupo al que pertenece la pantalla de la URL (por ejemplo "/socio-titular/cuotas?x=1"). */
export function grupoDeUrl(url: string): GrupoPortal | null {
  const segmento = url.split(/[?#]/)[0].split('/')[2] ?? '';
  return GRUPOS_PORTAL.find((g) => g.solapas.some((s) => s.segmento === segmento)) ?? null;
}
