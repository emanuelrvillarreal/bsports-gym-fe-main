export type ValorInputTablaHelper =
  | string
  | number
  | boolean
  | readonly string[]
  | readonly number[];

/** Normaliza valores de hora del backend o de la tabla al formato HH:mm. */
export function formatearHoraTabla(valor: unknown): string {
  if (Array.isArray(valor) && valor.length >= 2) {
    return formatearHoraTabla(`${valor[0]}:${valor[1]}`);
  }

  if (typeof valor !== 'string') {
    return '—';
  }

  const match = /^(\d{1,2})[:,](\d{1,2})(?::\d{1,2})?$/.exec(valor.trim());
  if (!match) {
    return '—';
  }

  const horas = Number(match[1]);
  const minutos = Number(match[2]);
  if (horas < 0 || horas > 23 || minutos < 0 || minutos > 59) {
    return '—';
  }

  return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
}

/** Suma una hora a HH:mm (autocomplete tr_input horaInicio → horaFin). */
export function sumarUnaHoraTabla(valor: string): string | null {
  const match = /^(\d{2}):(\d{2})$/.exec(valor.trim());

  if (!match) {
    return null;
  }

  const horas = Number(match[1]);
  const minutos = Number(match[2]);

  if (
    !Number.isInteger(horas) ||
    !Number.isInteger(minutos) ||
    horas < 0 ||
    horas > 23 ||
    minutos < 0 ||
    minutos > 59
  ) {
    return null;
  }

  const horasNormalizadas = String((horas + 1) % 24).padStart(2, '0');
  const minutosNormalizados = String(minutos).padStart(2, '0');
  return `${horasNormalizadas}:${minutosNormalizados}`;
}

export function autocompletarHoraFinTrInput(
  valores: Partial<Record<string, ValorInputTablaHelper>>,
  clave: string,
  valor: ValorInputTablaHelper,
): void {
  if (clave !== 'horaInicio' || typeof valor !== 'string') {
    return;
  }

  const horaFin = sumarUnaHoraTabla(valor);

  if (!horaFin) {
    return;
  }

  valores['horaFin'] = horaFin;
}
