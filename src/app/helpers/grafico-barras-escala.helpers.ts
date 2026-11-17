export interface BarraGraficoEscala {
  readonly valor: number;
  readonly tope: number;
}

export interface BarraGraficoEtiqueta {
  readonly valor: number;
  readonly tope: number;
  readonly etiquetaValor?: string;
}

/** Escala lineal en `pasos + 1` marcas según el mayor valor/tope de las barras. */
export function generarEscalaGraficoBarras(
  barras: readonly BarraGraficoEscala[],
  pasos = 4,
): readonly number[] {
  const mayor = barras.reduce((acumulado, barra) => {
    return Math.max(acumulado, barra.tope, barra.valor);
  }, 0);
  const maximo = Math.max(1000, mayor);

  return Array.from({ length: pasos + 1 }, (_, indice) => {
    return Math.round((maximo * indice) / pasos);
  });
}

/** Formato compacto para eje VS (0k, 1.5k, 2M). */
export function formatearEscalaGraficoK(valor: number): string {
  if (valor === 0) {
    return '0k';
  }

  if (Math.abs(valor) >= 1_000_000) {
    const millones = valor / 1_000_000;
    const precision = millones >= 10 ? 0 : 1;
    const texto = millones.toFixed(precision).replace(/\.0$/, '');
    return `${texto}M`;
  }

  const miles = valor / 1000;
  const precision = miles >= 10 ? 0 : 1;
  const texto = miles.toFixed(precision).replace(/\.0$/, '');
  return `${texto}k`;
}

function formatearNumeroGrafico(valor: number): string {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(valor);
}

function formatearCompactoGrafico(valor: number): string {
  if (Math.abs(valor) >= 1000) {
    return `${Math.round(valor / 1000)}k`;
  }

  return formatearNumeroGrafico(valor);
}

/** Etiqueta valor/tope; respeta `etiquetaValor` si viene definida. */
export function formatearEtiquetaValorBarraGrafico(
  barra: BarraGraficoEtiqueta,
  modoVs = false,
): string {
  if (barra.etiquetaValor) {
    return barra.etiquetaValor;
  }

  if (modoVs) {
    return `${formatearCompactoGrafico(barra.valor)}/${formatearCompactoGrafico(barra.tope)}`;
  }

  return `${formatearNumeroGrafico(barra.valor)}/${formatearNumeroGrafico(barra.tope)}`;
}
