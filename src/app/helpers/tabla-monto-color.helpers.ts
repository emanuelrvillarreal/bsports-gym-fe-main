/** Color de celda para columnas `monto` (positivo / negativo). */
export function obtenerColorTextoMonto(valor: unknown): string | null {
  const monto = typeof valor === 'number' ? valor : Number(valor);

  if (Number.isNaN(monto) || monto === 0) {
    return null;
  }

  return monto > 0 ? 'var(--semantic-success, #16a34a)' : 'var(--app-danger)';
}
