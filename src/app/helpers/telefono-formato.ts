export function limpiarTelefono(valor: string): string {
  return valor.replace(/\D/g, '').slice(0, 20);
}

export function formatearTelefono(valor: string): string {
  const limpio = limpiarTelefono(valor);

  if (limpio.length <= 2) {
    return limpio;
  }

  if (limpio.length <= 6) {
    return `${limpio.slice(0, 2)} ${limpio.slice(2)}`;
  }

  if (limpio.length <= 10) {
    return `${limpio.slice(0, 2)} ${limpio.slice(2, 6)}-${limpio.slice(6)}`;
  }

  return `${limpio.slice(0, 2)} ${limpio.slice(2, 6)}-${limpio.slice(6, 10)} ${limpio.slice(10)}`;
}
