/** Convierte una fecha ISO elegida en UI al período mensual esperado por Cobros. */
export function obtenerPeriodoMovimiento(fecha: string): string {
  if (!/^\d{4}-\d{2}(-\d{2})?$/.test(fecha)) return '';

  const [anio, mes] = fecha.split('-');
  return `${mes}-${anio}`;
}
