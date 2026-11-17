import { formatearMoneda } from './moneda-formato';

export const DURACION_ANIMACION_CARDS_HERO_MS = 1200;

/** Extrae número desde strings con $, % o separadores locales. */
export function obtenerValorNumericoCardsHero(valor: string): number | null {
  const numeros = valor.replace(/[^\d,.]/g, '');

  if (!numeros) {
    return null;
  }

  const normalizado = numeros.includes(',')
    ? numeros.replace(/\./g, '').replace(',', '.')
    : numeros.replace(/[,.]/g, '');
  const numero = Number(normalizado);

  if (!Number.isFinite(numero)) {
    return null;
  }

  return valor.includes('-') ? -numero : numero;
}

export function formatearValorAnimadoCardsHero(valor: number, valorOriginal: string): string {
  if (valorOriginal.includes('$')) {
    return formatearMoneda(valor).replace(/\u00A0/g, ' ');
  }

  const numero = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(valor);
  return valorOriginal.includes('%') ? `${numero}%` : numero;
}

export function escaparHtmlCardsHero(valor: string): string {
  return valor
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('\n', '<br>')
    .replaceAll('@', '@<wbr>')
    .replaceAll('.', '.<wbr>')
    .replaceAll('_', '_<wbr>')
    .replaceAll('-', '-<wbr>');
}
