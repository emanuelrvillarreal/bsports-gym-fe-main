export function limpiarDni(valor: string): string {
  return valor.replace(/\D/g, '').slice(0, 11);
}

export function formatearDni(valor: string): string {
  const limpio = limpiarDni(valor);

  return [limpio.slice(0, 2), limpio.slice(2, 5), limpio.slice(5, 8), limpio.slice(8, 11)]
    .filter(Boolean)
    .join('.');
}
