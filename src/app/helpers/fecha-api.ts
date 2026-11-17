export function fechaInputAFechaApi(valor: string): string {
  const fecha = valor.trim();
  if (!fecha) {
    return '';
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(fecha)) {
    return fecha;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    const [anio, mes, dia] = fecha.split('-');
    return `${dia}/${mes}/${anio}`;
  }

  return fecha;
}

export function fechaApiAFechaInput(valor?: string): string {
  const fecha = valor?.trim() ?? '';
  if (!fecha) {
    return '';
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return fecha;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(fecha)) {
    const [dia, mes, anio] = fecha.split('/');
    return `${anio}-${mes}-${dia}`;
  }

  const fechaParseada = parsearFechaApi(fecha);
  return fechaParseada ? fechaParseada.toISOString().slice(0, 10) : fecha;
}

export function parsearFechaApi(valor?: string): Date | null {
  const fecha = valor?.trim() ?? '';
  if (!fecha) {
    return null;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(fecha)) {
    const [dia, mes, anio] = fecha.split('/').map(Number);
    return new Date(anio, mes - 1, dia);
  }

  if (/^\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}(:\d{2})?$/.test(fecha)) {
    const [fechaParte, horaParte] = fecha.split(/\s+/);
    const [dia, mes, anio] = fechaParte.split('/').map(Number);
    const [hora, minuto, segundo = '0'] = horaParte.split(':');
    return new Date(anio, mes - 1, dia, Number(hora), Number(minuto), Number(segundo));
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    const [anio, mes, dia] = fecha.split('-').map(Number);
    return new Date(anio, mes - 1, dia);
  }

  const fechaNativa = new Date(fecha);
  return Number.isNaN(fechaNativa.getTime()) ? null : fechaNativa;
}
