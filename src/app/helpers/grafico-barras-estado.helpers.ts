export const UMBRAL_GRAFICO_OK = 80;
export const UMBRAL_GRAFICO_ALERTA = 95;

export interface UmbralesBarraGrafico {
  readonly ok: number;
  readonly alerta: number;
}

export const UMBRALES_BARRA_GRAFICO_DEFAULT: UmbralesBarraGrafico = {
  ok: UMBRAL_GRAFICO_OK,
  alerta: UMBRAL_GRAFICO_ALERTA,
};

/** Porcentaje 0–100 de valor respecto al tope. */
export function obtenerPorcentajeBarraGrafico(valor: number, tope: number): number {
  if (tope <= 0) {
    return 0;
  }

  const porcentaje = (valor / tope) * 100;
  return Math.max(0, Math.min(100, porcentaje));
}

/** Clase BEM del relleno según umbrales por defecto (80 / 95 / 100). */
export function obtenerClaseEstadoBarraGrafico(
  valor: number,
  tope: number,
  umbrales: UmbralesBarraGrafico = UMBRALES_BARRA_GRAFICO_DEFAULT,
): string {
  const porcentaje = obtenerPorcentajeBarraGrafico(valor, tope);

  if (porcentaje <= umbrales.ok) {
    return 'grafico-barras__relleno--ok';
  }

  if (porcentaje <= umbrales.alerta) {
    return 'grafico-barras__relleno--alerta';
  }

  return 'grafico-barras__relleno--critico';
}

export function estaBarraGraficoEnTope(valor: number, tope: number): boolean {
  return tope > 0 && valor >= tope;
}
