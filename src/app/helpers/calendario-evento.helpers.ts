import { parseFechaCalendario } from './calendario-fecha.helpers';

export interface CalendarioEventoAgrupable {
  readonly diaHoraInicio?: string;
  readonly diaHoraFin?: string;
}

/** Agrupa eventos por ISO yyyy-mm-dd y ordena por hora inicio. */
export function agruparEventosCalendarioPorDia<T extends CalendarioEventoAgrupable>(
  eventos: readonly T[],
  isoDesde: (valor?: string) => string | null,
): ReadonlyMap<string, readonly T[]> {
  const grupos = new Map<string, T[]>();

  for (const evento of eventos) {
    const iso = isoDesde(evento.diaHoraInicio);
    if (!iso) {
      continue;
    }

    const lista = grupos.get(iso) ?? [];
    lista.push(evento);
    grupos.set(iso, lista);
  }

  for (const [iso, lista] of grupos.entries()) {
    grupos.set(
      iso,
      [...lista].sort((a, b) => (a.diaHoraInicio ?? '').localeCompare(b.diaHoraInicio ?? '')),
    );
  }

  return grupos;
}

/** Devuelve el evento cronológicamente más cercano dentro de un conjunto. */
export function obtenerProximoEventoCalendario<T extends CalendarioEventoAgrupable>(
  eventos: readonly T[],
  ahora: Date = new Date(),
): T | null {
  return (
    eventos
      .map((evento, indice) => ({ evento, indice, fecha: parseFechaCalendario(evento.diaHoraInicio) }))
      .filter((item): item is { evento: T; indice: number; fecha: Date } => !!item.fecha)
      .filter((item) => item.fecha >= ahora)
      .sort((a, b) => a.fecha.getTime() - b.fecha.getTime() || a.indice - b.indice)[0]?.evento ?? null
  );
}

export function rangoHorarioCalendario(
  evento: CalendarioEventoAgrupable,
  formatearHora: (v?: string) => string,
): string {
  const inicio = formatearHora(evento.diaHoraInicio);
  const fin = formatearHora(evento.diaHoraFin);
  return `de ${inicio} a ${fin}`;
}

export function duracionEventoCalendario(evento: CalendarioEventoAgrupable): string {
  if (!evento.diaHoraInicio || !evento.diaHoraFin) {
    return 'Horario a confirmar';
  }

  const inicio = parseFechaCalendario(evento.diaHoraInicio);
  const fin = parseFechaCalendario(evento.diaHoraFin);
  if (!inicio || !fin) {
    return 'Horario a confirmar';
  }

  const minutos = Math.max(0, Math.round((fin.getTime() - inicio.getTime()) / 60000));
  if (!Number.isFinite(minutos) || minutos <= 0) {
    return 'Horario a confirmar';
  }

  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (horas > 0 && resto > 0) {
    return `${horas} h ${resto} min`;
  }

  if (horas > 0) {
    return `${horas} h`;
  }

  return `${resto} min`;
}
