import { isoFecha } from '../../../../_compartido-perfiles/components/seguimiento-asistencia/seguimiento-asistencia.helpers';

/** Períodos rápidos del reporte económico. */
export type PeriodoReporte = 'mes' | 'mesAnterior' | 'anio' | 'anioAnterior' | 'historial' | 'personalizado';

export const OPCIONES_PERIODO_REPORTE: readonly { readonly id: PeriodoReporte; readonly etiqueta: string }[] = [
  { id: 'mes', etiqueta: 'Este mes' },
  { id: 'mesAnterior', etiqueta: 'Mes anterior' },
  { id: 'anio', etiqueta: 'Este año' },
  { id: 'anioAnterior', etiqueta: 'Año anterior' },
  { id: 'historial', etiqueta: 'Todo el historial' },
  { id: 'personalizado', etiqueta: 'Personalizado' },
];

export interface Rango {
  readonly desde: string;
  readonly hasta: string;
}

/** Rango del período rápido. `historial` y `personalizado` devuelven null (sin fechas / las elige el usuario). */
export function rangoReporte(periodo: PeriodoReporte, hoy: Date = new Date()): Rango | null {
  const anio = hoy.getFullYear();
  const mes = hoy.getMonth();
  switch (periodo) {
    case 'mes':
      return mes0(anio, mes);
    case 'mesAnterior':
      return mes0(anio, mes - 1);
    case 'anio':
      return { desde: `${anio}-01-01`, hasta: `${anio}-12-31` };
    case 'anioAnterior':
      return { desde: `${anio - 1}-01-01`, hasta: `${anio - 1}-12-31` };
    default:
      return null;
  }
}

/** Primer y último día de un mes (acepta meses fuera de 0-11 para cruzar el año). */
export function mes0(anio: number, mes: number): Rango {
  return { desde: isoFecha(new Date(anio, mes, 1)), hasta: isoFecha(new Date(anio, mes + 1, 0)) };
}

export type ComparacionRapida = 'mesVsAnterior' | 'mismoMesAnioAnterior' | 'anioVsAnterior' | 'semestres' | 'personalizada';

export const OPCIONES_COMPARACION: readonly { readonly id: ComparacionRapida; readonly etiqueta: string }[] = [
  { id: 'mesVsAnterior', etiqueta: 'Mes actual vs. mes anterior' },
  { id: 'mismoMesAnioAnterior', etiqueta: 'Este mes vs. el mismo mes del año pasado' },
  { id: 'anioVsAnterior', etiqueta: 'Este año vs. año anterior' },
  { id: 'semestres', etiqueta: '1.º semestre vs. 2.º semestre' },
  { id: 'personalizada', etiqueta: 'Personalizada' },
];

/** Período A (base) y B (el que se compara) de cada comparación rápida. */
export function periodosComparacion(tipo: ComparacionRapida, hoy: Date = new Date()): { a: Rango; b: Rango } | null {
  const anio = hoy.getFullYear();
  const mes = hoy.getMonth();
  switch (tipo) {
    case 'mesVsAnterior':
      return { a: mes0(anio, mes - 1), b: mes0(anio, mes) };
    case 'mismoMesAnioAnterior':
      return { a: mes0(anio - 1, mes), b: mes0(anio, mes) };
    case 'anioVsAnterior':
      return {
        a: { desde: `${anio - 1}-01-01`, hasta: `${anio - 1}-12-31` },
        b: { desde: `${anio}-01-01`, hasta: `${anio}-12-31` },
      };
    case 'semestres':
      return {
        a: { desde: `${anio}-01-01`, hasta: `${anio}-06-30` },
        b: { desde: `${anio}-07-01`, hasta: `${anio}-12-31` },
      };
    default:
      return null;
  }
}

export function formatearVariacion(valor: number | null): string {
  if (valor === null) return 'Sin base';
  const signo = valor > 0 ? '+' : '';
  return `${signo}${valor.toLocaleString('es-AR', { maximumFractionDigits: 1 })}%`;
}
