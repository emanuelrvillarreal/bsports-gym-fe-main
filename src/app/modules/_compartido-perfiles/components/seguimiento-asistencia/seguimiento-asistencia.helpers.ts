import { AsistenciaMesDto, NivelAsistencia } from '../../../../core/api/interfaces/seguimiento-asistencia.interfaces';
import { BarraGrafico } from '../../../ui/grafico-barras/grafico-barras.component';

/** Períodos rápidos del seguimiento. `inscripcion` = desde que se inscribió cada alumno. */
export type PeriodoSeguimiento = 'mes' | 'trimestre' | 'semestre' | 'anio' | 'inscripcion' | 'personalizado';

export const OPCIONES_PERIODO: readonly { readonly id: PeriodoSeguimiento; readonly etiqueta: string }[] = [
  { id: 'mes', etiqueta: 'Este mes' },
  { id: 'trimestre', etiqueta: 'Trimestre' },
  { id: 'semestre', etiqueta: 'Semestre' },
  { id: 'anio', etiqueta: 'Año' },
  { id: 'inscripcion', etiqueta: 'Desde la inscripción' },
  { id: 'personalizado', etiqueta: 'Personalizado' },
];

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/** Rango `yyyy-MM-dd` del período (hasta hoy). `null` = sin límite. */
export function rangoPeriodo(
  periodo: PeriodoSeguimiento,
  hoy: Date = new Date(),
): { readonly desde: string | null; readonly hasta: string | null } {
  const hasta = isoFecha(hoy);
  const mesesAtras: Partial<Record<PeriodoSeguimiento, number>> = { mes: 0, trimestre: 2, semestre: 5 };
  if (periodo in mesesAtras) {
    const desde = new Date(hoy.getFullYear(), hoy.getMonth() - (mesesAtras[periodo] ?? 0), 1);
    return { desde: isoFecha(desde), hasta };
  }
  if (periodo === 'anio') {
    return { desde: `${hoy.getFullYear()}-01-01`, hasta };
  }
  return { desde: null, hasta: null };
}

export function isoFecha(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

/** `2026-03-10` → `10/03/2026`. */
export function formatearFechaAsistencia(valor: string | null | undefined): string {
  if (!valor) return '-';
  const [anio, mes, dia] = valor.slice(0, 10).split('-');
  return dia && mes && anio ? `${dia}/${mes}/${anio}` : valor;
}

export function formatearPorcentaje(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return 'Sin clases';
  return `${valor.toLocaleString('es-AR', { maximumFractionDigits: 1 })}%`;
}

/** `2026-03` → `Mar 2026`. */
export function etiquetaMes(periodo: string): string {
  const [anio, mes] = periodo.split('-').map(Number);
  return `${MESES[(mes ?? 1) - 1]} ${anio}`;
}

export function colorNivel(nivel: NivelAsistencia): string {
  switch (nivel) {
    case 'VERDE':
      return 'var(--semantic-success)';
    case 'AMARILLO':
      return 'var(--app-warning)';
    case 'ROJO':
      return 'var(--semantic-danger)';
    default:
      return 'var(--app-text-soft)';
  }
}

export function nivelDe(porcentaje: number | null, verde: number, amarillo: number): NivelAsistencia {
  if (porcentaje === null) return 'SIN_DATOS';
  if (porcentaje >= verde) return 'VERDE';
  return porcentaje >= amarillo ? 'AMARILLO' : 'ROJO';
}

/** Barras de la evolución mensual: porcentaje de asistencia de cada mes (tope 100). */
export function barrasEvolucion(
  meses: readonly AsistenciaMesDto[],
  verde: number,
  amarillo: number,
): readonly BarraGrafico[] {
  return meses
    .filter((mes) => mes.clases > 0)
    .map((mes) => ({
      id: mes.periodo,
      nombre: etiquetaMes(mes.periodo),
      valor: mes.porcentaje ?? 0,
      tope: 100,
      etiquetaValor: formatearPorcentaje(mes.porcentaje),
      color: colorNivel(nivelDe(mes.porcentaje, verde, amarillo)),
    }));
}
