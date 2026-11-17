/** Variante visual de chips formato "inscriptos/cupo" (columna cuposDisponibles). */
export function obtenerClaseChipCupo(item: string): string | null {
  const valor = item.trim();

  if (valor.toLocaleLowerCase() === 'lleno') {
    return 'tabla-responsive__chip--cupo tabla-responsive__chip--danger';
  }

  const partes = valor.split('/');

  if (partes.length !== 2) {
    return null;
  }

  const inscriptos = Number(partes[0]?.trim() ?? '');
  const cupo = Number(partes[1]?.trim() ?? '');

  if (!Number.isFinite(inscriptos) || !Number.isFinite(cupo) || cupo <= 0) {
    return null;
  }

  const ocupacion = (inscriptos / cupo) * 100;

  if (ocupacion >= 100) {
    return 'tabla-responsive__chip--cupo tabla-responsive__chip--danger';
  }

  if (ocupacion >= 66 && ocupacion <= 90) {
    return 'tabla-responsive__chip--cupo tabla-responsive__chip--warning';
  }

  return ocupacion <= 65
    ? 'tabla-responsive__chip--cupo tabla-responsive__chip--success'
    : 'tabla-responsive__chip--cupo tabla-responsive__chip--danger';
}
