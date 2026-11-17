export function limpiarCuil(valor: string): string {
  return valor.replace(/\D/g, '').slice(0, 11);
}

export function formatearCuil(valor: string): string {
  const limpio = limpiarCuil(valor);

  if (limpio.length <= 2) {
    return limpio;
  }

  if (limpio.length <= 4) {
    return `${limpio.slice(0, 2)}-${limpio.slice(2)}`;
  }

  if (limpio.length <= 7) {
    return `${limpio.slice(0, 2)}-${limpio.slice(2, 4)}.${limpio.slice(4)}`;
  }

  if (limpio.length <= 10) {
    return `${limpio.slice(0, 2)}-${limpio.slice(2, 4)}.${limpio.slice(4, 7)}.${limpio.slice(7)}`;
  }

  return `${limpio.slice(0, 2)}-${limpio.slice(2, 4)}.${limpio.slice(4, 7)}.${limpio.slice(7, 10)}-${limpio.slice(10)}`;
}
