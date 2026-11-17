import { Injectable } from '@angular/core';

/**
 * Catálogo semántico de íconos de la aplicación.
 * Los consumidores dependen de la intención y no del nombre de Heroicons.
 */
export const ICONOS_APP = {
  actividades: 'heroCalendar',
  amenities: 'heroHomeModern',
  calendario: 'heroCalendarDays',
  categorias: 'heroCalendarDateRange',
  certificados: 'heroHeart',
  cambiarEmpresa: 'heroBuildingOffice2',
  cambiarRol: 'heroArrowPath',
  cerrarSesion: 'heroArrowLeftStartOnRectangle',
  colapsarDerecha: 'heroChevronDoubleRight',
  colapsarIzquierda: 'heroChevronDoubleLeft',
  configuracion: 'heroCog6Tooth',
  credencial: 'heroIdentification',
  dashboard: 'heroRectangleGroup',
  descuentos: 'heroReceiptPercent',
  entradasEventos: 'heroTicket',
  equipamiento: 'heroWrenchScrewdriver',
  eventos: 'heroTrophy',
  grupoFamiliar: 'heroUserGroup',
  inicio: 'heroHome',
  ingresos: 'heroCurrencyDollar',
  membresias: 'heroTicket',
  moverDerecha: 'layoutRight',
  moverIzquierda: 'layoutLeft',
  nuevaEmpresa: 'heroBuildingOffice2',
  perfil: 'heroUserCircle',
  profesores: 'heroAcademicCap',
  recepcion: 'heroHomeModern',
  solicitudesSocios: 'heroClipboardDocumentList',
  socios: 'heroUsers',
  tesoreria: 'heroBanknotes',
  usuariosRecepcion: 'heroUserGroup',
  fallback: 'heroQuestionMarkCircle',
} as const;

export type IconoApp = keyof typeof ICONOS_APP;
export type NombreIconoApp = (typeof ICONOS_APP)[IconoApp];

/** Claves válidas para encabezados de páginas navegables. */
export const ICONOS_PAGINA = [
  'actividades',
  'amenities',
  'calendario',
  'categorias',
  'certificados',
  'cambiarEmpresa',
  'cambiarRol',
  'configuracion',
  'credencial',
  'dashboard',
  'descuentos',
  'entradasEventos',
  'equipamiento',
  'eventos',
  'grupoFamiliar',
  'inicio',
  'ingresos',
  'membresias',
  'nuevaEmpresa',
  'perfil',
  'profesores',
  'solicitudesSocios',
  'socios',
  'tesoreria',
  'usuariosRecepcion',
] as const satisfies readonly IconoApp[];

export type IconoPagina = (typeof ICONOS_PAGINA)[number];

@Injectable({ providedIn: 'root' })
export class IconosAppService {
  /** Devuelve siempre un ícono registrado y visible. */
  obtenerNombre(icono: IconoApp | string | null | undefined): NombreIconoApp {
    if (icono && Object.prototype.hasOwnProperty.call(ICONOS_APP, icono)) {
      return ICONOS_APP[icono as IconoApp];
    }

    return ICONOS_APP.fallback;
  }
}
