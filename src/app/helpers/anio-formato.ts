export function limitarAnio(valor: string): string {
  return valor.replace(/\D/g, '').slice(0, 4);
}
