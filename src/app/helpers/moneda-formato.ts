export function formatearMoneda(valor: string | number): string {
  const numero = normalizarValorMoneda(valor);

  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: tieneDecimales(numero) ? 2 : 0,
    maximumFractionDigits: 2,
  })
    .format(numero)
    .replace(/^/, '$');
}

export function normalizarValorMoneda(valor: string | number): number {
  if (typeof valor === 'number') {
    return Number.isFinite(valor) ? valor : 0;
  }

  const limpio = valor.trim().replace(/\$/g, '').replace(/\s/g, '');

  if (!limpio) {
    return 0;
  }

  const ultimoPunto = limpio.lastIndexOf('.');
  const ultimaComa = limpio.lastIndexOf(',');
  const separadorDecimal = ultimoPunto > ultimaComa ? '.' : ultimaComa > ultimoPunto ? ',' : '';

  if (!separadorDecimal) {
    const entero = Number(limpio.replace(/[^\d-]/g, ''));
    return Number.isFinite(entero) ? entero : 0;
  }

  const indiceSeparador = limpio.lastIndexOf(separadorDecimal);
  const parteEntera = limpio.slice(0, indiceSeparador).replace(/[^\d-]/g, '');
  const parteDecimalRaw = limpio.slice(indiceSeparador + 1).replace(/[^\d]/g, '');

  // Si despues del separador hay mas de dos digitos, asumimos que el separador
  // pertenece al formateo de miles y no a la parte decimal.
  if (parteDecimalRaw.length > 2) {
    const entero = Number(limpio.replace(/[^\d-]/g, ''));
    return Number.isFinite(entero) ? entero : 0;
  }

  const parteDecimal = parteDecimalRaw.slice(0, 2);
  const normalizado = `${parteEntera || '0'}.${parteDecimal || '0'}`;
  const numero = Number(normalizado);

  return Number.isFinite(numero) ? numero : 0;
}

function tieneDecimales(valor: number): boolean {
  return Math.round(valor * 100) % 100 !== 0;
}
