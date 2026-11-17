export function formatearFechaCorta(valor: unknown): string {
  const fecha = normalizarFecha(valor);
  if (!fecha) {
    return '-';
  }

  const formatoIso = /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha);
  return formatoIso ? `${formatoIso[3]}/${formatoIso[2]}/${formatoIso[1]}` : fecha;
}

export interface RangoFecha {
  readonly fechaDesde: string;
  readonly fechaHasta: string;
}

/** Devuelve el primer y último día de un mes en formato ISO local. */
export function crearRangoMensual(anio: number, mes: number): RangoFecha {
  const ultimoDia = new Date(anio, mes, 0).getDate();
  const mesNormalizado = String(mes).padStart(2, '0');
  return {
    fechaDesde: `${anio}-${mesNormalizado}-01`,
    fechaHasta: `${anio}-${mesNormalizado}-${String(ultimoDia).padStart(2, '0')}`,
  };
}

export function crearRangoMensualActual(): RangoFecha {
  const fecha = new Date();
  return crearRangoMensual(fecha.getFullYear(), fecha.getMonth() + 1);
}

function normalizarFecha(valor: unknown): string {
  if (typeof valor === 'string') {
    return valor.trim();
  }

  if (!Array.isArray(valor) || valor.length < 3) {
    return '';
  }

  const [anio, mes, dia] = valor;
  if (
    ![anio, mes, dia].every(
      (parte) =>
        (typeof parte === 'number' && Number.isFinite(parte)) ||
        (typeof parte === 'string' && /^\d+$/.test(parte)),
    )
  ) {
    return '';
  }

  return `${String(anio).padStart(4, '0')}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}
