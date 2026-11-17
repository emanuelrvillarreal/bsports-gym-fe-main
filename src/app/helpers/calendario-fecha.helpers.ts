/**
 * Convierte fechas del backend (`dd/MM/yyyy HH:mm:ss`) y fechas ISO a una fecha local.
 * Evita depender del parseo implícito del navegador, que no soporta el formato argentino.
 */
export function parseFechaCalendario(valor?: string): Date | null {
  if (!valor) {
    return null;
  }

  const texto = valor.trim();
  const partes = /^(\d{2})\/(\d{2})\/(\d{4})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(texto);

  if (partes) {
    const [, dia, mes, anio, hora = '0', minuto = '0', segundo = '0'] = partes;
    return crearFechaLocalValida(anio, mes, dia, hora, minuto, segundo);
  }

  const partesIso = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(texto);

  if (partesIso) {
    const [, anio, mes, dia, hora = '0', minuto = '0', segundo = '0'] = partesIso;
    return crearFechaLocalValida(anio, mes, dia, hora, minuto, segundo);
  }

  const fecha = new Date(texto);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

/** Fecha local en el formato `dd/MM/yyyy` requerido por las consultas de calendario. */
export function formatearFechaConsultaCalendario(valor?: string): string | null {
  const fecha = parseFechaCalendario(valor);
  if (!fecha) {
    return null;
  }

  const dia = String(fecha.getDate()).padStart(2, '0');
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}/${fecha.getFullYear()}`;
}

/** Desplaza una fecha local y la devuelve en el formato de consulta del calendario. */
export function desplazarFechaConsultaCalendario(
  valor: string | undefined,
  dias: number,
): string | null {
  const fecha = parseFechaCalendario(valor);
  if (!fecha) {
    return null;
  }

  fecha.setDate(fecha.getDate() + dias);
  return `${String(fecha.getDate()).padStart(2, '0')}/${String(fecha.getMonth() + 1).padStart(2, '0')}/${fecha.getFullYear()}`;
}

/** ISO yyyy-mm-dd desde string fecha/hora o Date serializable. */
export function isoFechaCalendario(valor?: string): string | null {
  const fecha = parseFechaCalendario(valor);
  if (!fecha) {
    return null;
  }

  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

export function parseIsoDateCalendario(iso: string): Date {
  const [anio, mes, dia] = iso.split('-').map(Number);
  return new Date(anio, (mes || 1) - 1, dia || 1);
}

/** Primer día del mes a partir de yyyy-mm-dd o yyyy-mm-01. */
export function normalizarMesCalendario(valor: string): Date {
  const fecha = valor ? new Date(`${valor}T00:00:00`) : new Date();
  return Number.isNaN(fecha.getTime())
    ? new Date()
    : new Date(fecha.getFullYear(), fecha.getMonth(), 1);
}

export function isoMesCalendario(valor: Date): string {
  return `${valor.getFullYear()}-${String(valor.getMonth() + 1).padStart(2, '0')}-01`;
}

/** Lunes de la semana que contiene el primer día del mes. */
export function inicioGrillaCalendario(mes: Date): Date {
  const inicioMes = new Date(mes.getFullYear(), mes.getMonth(), 1);
  const dia = inicioMes.getDay();
  const ajuste = dia === 0 ? -6 : 1 - dia;
  inicioMes.setDate(inicioMes.getDate() + ajuste);
  return inicioMes;
}

/** Domingo de la semana que contiene el último día del mes. */
export function finGrillaCalendario(mes: Date): Date {
  const finMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0);
  const dia = finMes.getDay();
  const ajuste = dia === 0 ? 0 : 7 - dia;
  finMes.setDate(finMes.getDate() + ajuste);
  return finMes;
}

export function obtenerMesMinimoNavegableCalendario(): Date {
  const hoy = new Date();
  return new Date(hoy.getFullYear(), hoy.getMonth(), 1);
}

export function obtenerMesMaximoNavegableCalendario(): Date {
  const hoy = new Date();
  return new Date(hoy.getFullYear(), 11, 1);
}

export function formatearHoraCalendario(valor?: string): string {
  const fecha = parseFechaCalendario(valor);
  return !fecha
    ? '--.--'
    : new Intl.DateTimeFormat('es-AR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
        .format(fecha)
        .replace(':', '.');
}

export function formatearDiaTarjetaCalendario(fecha: Date): string {
  const nombre = new Intl.DateTimeFormat('es-AR', { weekday: 'long' }).format(fecha);
  return `${nombre} ${fecha.getDate()}`;
}

export function formatearFechaBreveCalendario(iso: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
  }).format(parseIsoDateCalendario(iso));
}

function crearFechaLocalValida(
  anio: string,
  mes: string,
  dia: string,
  hora: string,
  minuto: string,
  segundo: string,
): Date | null {
  const fecha = new Date(
    Number(anio),
    Number(mes) - 1,
    Number(dia),
    Number(hora),
    Number(minuto),
    Number(segundo),
  );

  const esFechaValida =
    fecha.getFullYear() === Number(anio) &&
    fecha.getMonth() === Number(mes) - 1 &&
    fecha.getDate() === Number(dia) &&
    fecha.getHours() === Number(hora) &&
    fecha.getMinutes() === Number(minuto) &&
    fecha.getSeconds() === Number(segundo);

  return esFechaValida ? fecha : null;
}
