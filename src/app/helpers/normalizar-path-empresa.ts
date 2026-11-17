/**
 * Convierte el nombre comercial en un segmento de URL compatible con el path público del club.
 * Ejemplo: "Club Atlético Norte" -> "club-atletico-norte".
 */
export function normalizarPathEmpresa(nombreEmpresa: string | null | undefined): string {
  return (nombreEmpresa ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
