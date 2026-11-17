import { EvaluacionDto } from '../../../../core/api/interfaces/evaluaciones.interfaces';
import { BarraGrafico } from '../../../ui/grafico-barras/grafico-barras.component';
import { formatearFechaAsistencia } from '../seguimiento-asistencia/seguimiento-asistencia.helpers';

export type ClaveMetrica =
  | 'pesoKg'
  | 'imc'
  | 'grasaCorporalPct'
  | 'masaMuscularKg'
  | 'cinturaCm'
  | 'caderaCm'
  | 'pechoCm'
  | 'brazoCm'
  | 'musloCm'
  | 'pantorrillaCm'
  | 'alturaCm';

export interface Metrica {
  readonly clave: ClaveMetrica;
  readonly etiqueta: string;
  readonly unidad: string;
}

/** Indicadores con evolución. El IMC se muestra solo como número: no es un diagnóstico. */
export const METRICAS: readonly Metrica[] = [
  { clave: 'pesoKg', etiqueta: 'Peso', unidad: 'kg' },
  { clave: 'imc', etiqueta: 'IMC', unidad: '' },
  { clave: 'grasaCorporalPct', etiqueta: 'Grasa corporal', unidad: '%' },
  { clave: 'masaMuscularKg', etiqueta: 'Masa muscular', unidad: 'kg' },
  { clave: 'cinturaCm', etiqueta: 'Cintura', unidad: 'cm' },
  { clave: 'caderaCm', etiqueta: 'Cadera', unidad: 'cm' },
  { clave: 'pechoCm', etiqueta: 'Pecho', unidad: 'cm' },
  { clave: 'brazoCm', etiqueta: 'Brazo', unidad: 'cm' },
  { clave: 'musloCm', etiqueta: 'Muslo', unidad: 'cm' },
  { clave: 'pantorrillaCm', etiqueta: 'Pantorrilla', unidad: 'cm' },
  { clave: 'alturaCm', etiqueta: 'Altura', unidad: 'cm' },
];

export const AVISO_NO_CLINICO =
  'Son mediciones de seguimiento deportivo. No constituyen una evaluación clínica ni un diagnóstico médico.';

/** Mismo cálculo que el backend: peso / (altura en m)², con dos decimales. */
export function calcularImc(pesoKg: number | null | undefined, alturaCm: number | null | undefined): number | null {
  if (!pesoKg || !alturaCm || alturaCm <= 0) return null;
  const metros = alturaCm / 100;
  return Math.round((pesoKg / (metros * metros)) * 100) / 100;
}

export function formatearMedida(valor: number | null | undefined, unidad = ''): string {
  if (valor === null || valor === undefined) return '—';
  const numero = Number(valor).toLocaleString('es-AR', { maximumFractionDigits: 2 });
  return unidad ? `${numero} ${unidad}` : numero;
}

/** Métricas con al menos una medición: las únicas que vale la pena ofrecer en el gráfico. */
export function metricasConEvolucion(evaluaciones: readonly EvaluacionDto[]): readonly Metrica[] {
  return METRICAS.filter((m) => evaluaciones.filter((e) => e[m.clave] !== null && e[m.clave] !== undefined).length >= 1);
}

/**
 * Barras de evolución de una métrica, de la evaluación más vieja a la más nueva (últimas 12).
 * La escala no arranca en cero sino un poco debajo del mínimo: así se ve la diferencia entre
 * 64 kg y 62,5 kg. La etiqueta de cada barra muestra siempre el valor real.
 */
export function barrasMetrica(evaluaciones: readonly EvaluacionDto[], metrica: Metrica): readonly BarraGrafico[] {
  const conValor = [...evaluaciones]
    .filter((e) => e[metrica.clave] !== null && e[metrica.clave] !== undefined)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .slice(-12);
  const valores = conValor.map((e) => Number(e[metrica.clave]));
  const { base, tope } = escala(valores);
  return conValor.map((e, i) => ({
    id: e.uuid,
    nombre: formatearFechaAsistencia(e.fecha),
    valor: valores[i] - base,
    tope,
    etiquetaValor: formatearMedida(valores[i], metrica.unidad),
    color: 'var(--app-accent)',
  }));
}

/** Base y tope (relativos a la base) para que la variación se note; con un solo valor, media barra. */
export function escala(valores: readonly number[]): { readonly base: number; readonly tope: number } {
  if (!valores.length) return { base: 0, tope: 1 };
  const minimo = Math.min(...valores);
  const maximo = Math.max(...valores);
  const rango = maximo - minimo;
  const margen = rango > 0 ? rango : Math.max(Math.abs(maximo) * 0.1, 1);
  const base = Math.max(0, minimo - margen);
  return { base, tope: maximo - base + margen * 0.25 };
}

/** Diferencia entre la primera y la última medición: "+2,5 kg" o "−1,2 %". */
export function variacion(evaluaciones: readonly EvaluacionDto[], metrica: Metrica): string | null {
  const conValor = [...evaluaciones]
    .filter((e) => e[metrica.clave] !== null && e[metrica.clave] !== undefined)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
  if (conValor.length < 2) return null;
  const diferencia = Number(conValor[conValor.length - 1][metrica.clave]) - Number(conValor[0][metrica.clave]);
  const redondeada = Math.round(diferencia * 100) / 100;
  if (redondeada === 0) return 'Sin cambios';
  const texto = Math.abs(redondeada).toLocaleString('es-AR', { maximumFractionDigits: 2 });
  return `${redondeada > 0 ? '+' : '−'}${texto}${metrica.unidad ? ' ' + metrica.unidad : ''} desde la primera`;
}
