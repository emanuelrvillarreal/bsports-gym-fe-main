/**
 * Devuelve la edad cumplida en años y meses, sin redondear días como un mes.
 * Acepta fechas locales (`yyyy-MM-dd`) y datetimes ISO. Se toman los primeros
 * diez caracteres para evitar desfasajes por zona horaria al construir `Date`.
 */
export function formatearEdadDesdeFechaNacimiento(
  fechaNacimiento: string | null | undefined,
  fechaReferencia = new Date(),
): string {
  const fechaEntrada = fechaNacimiento?.trim() ?? '';
  const coincidenciaLatina = fechaEntrada.match(/^(\d{2})[/-](\d{2})[/-](\d{4})(?:\D.*)?$/);
  const fechaNormalizada = coincidenciaLatina
    ? `${coincidenciaLatina[3]}-${coincidenciaLatina[2]}-${coincidenciaLatina[1]}`
    : fechaEntrada.replace(/\//g, '-');
  const coincidencia = fechaNormalizada.match(/^(\d{4})-(\d{2})-(\d{2})(?:\D.*)?$/);
  if (!coincidencia) return '—';

  const anioNacimiento = Number(coincidencia[1]);
  const mesNacimiento = Number(coincidencia[2]);
  const diaNacimiento = Number(coincidencia[3]);
  const fechaValidada = new Date(anioNacimiento, mesNacimiento - 1, diaNacimiento);

  if (
    fechaValidada.getFullYear() !== anioNacimiento ||
    fechaValidada.getMonth() !== mesNacimiento - 1 ||
    fechaValidada.getDate() !== diaNacimiento
  ) {
    return '—';
  }

  let meses =
    (fechaReferencia.getFullYear() - anioNacimiento) * 12 +
    fechaReferencia.getMonth() -
    (mesNacimiento - 1);

  if (fechaReferencia.getDate() < diaNacimiento) meses -= 1;
  if (meses < 0) return '—';

  const anios = Math.floor(meses / 12);
  const mesesRestantes = meses % 12;
  const etiquetaAnios = anios === 1 ? 'año' : 'años';
  const etiquetaMeses = mesesRestantes === 1 ? 'mes' : 'meses';

  return `${anios} ${etiquetaAnios}, ${mesesRestantes} ${etiquetaMeses}`;
}

/**
 * Devuelve la edad en años completos y días transcurridos desde el último
 * cumpleaños. Acepta fechas locales, datetimes ISO y formato latino.
 */
export function formatearEdadEnAniosYDias(
  fechaNacimiento: string | null | undefined,
  fechaReferencia = new Date(),
): string {
  const fecha = parsearFechaLocal(fechaNacimiento);
  if (!fecha) return '—';

  const referencia = new Date(
    fechaReferencia.getFullYear(),
    fechaReferencia.getMonth(),
    fechaReferencia.getDate(),
  );
  if (fecha > referencia) return '—';

  let anios = referencia.getFullYear() - fecha.getFullYear();
  let ultimoCumpleanios = crearFechaCalendario(
    fecha.getFullYear() + anios,
    fecha.getMonth(),
    fecha.getDate(),
  );

  if (ultimoCumpleanios > referencia) {
    anios -= 1;
    ultimoCumpleanios = crearFechaCalendario(
      fecha.getFullYear() + anios,
      fecha.getMonth(),
      fecha.getDate(),
    );
  }

  const milisegundosDia = 24 * 60 * 60 * 1000;
  const dias = Math.floor(
    (Date.UTC(
      referencia.getFullYear(),
      referencia.getMonth(),
      referencia.getDate(),
    ) -
      Date.UTC(
        ultimoCumpleanios.getFullYear(),
        ultimoCumpleanios.getMonth(),
        ultimoCumpleanios.getDate(),
      )) /
      milisegundosDia,
  );

  return `${anios} ${anios === 1 ? 'año' : 'años'}, ${dias} ${dias === 1 ? 'día' : 'días'}`;
}

function parsearFechaLocal(valor: string | null | undefined): Date | null {
  const entrada = valor?.trim() ?? '';
  const coincidenciaLatina = entrada.match(
    /^(\d{2})[/-](\d{2})[/-](\d{4})(?:\D.*)?$/,
  );
  const fechaNormalizada = coincidenciaLatina
    ? `${coincidenciaLatina[3]}-${coincidenciaLatina[2]}-${coincidenciaLatina[1]}`
    : entrada.replace(/\//g, '-');
  const coincidencia = fechaNormalizada.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:\D.*)?$/,
  );
  if (!coincidencia) return null;

  const anio = Number(coincidencia[1]);
  const mes = Number(coincidencia[2]);
  const dia = Number(coincidencia[3]);
  const fecha = new Date(anio, mes - 1, dia);

  return fecha.getFullYear() === anio &&
    fecha.getMonth() === mes - 1 &&
    fecha.getDate() === dia
    ? fecha
    : null;
}

function crearFechaCalendario(anio: number, mes: number, dia: number): Date {
  const ultimoDiaDelMes = new Date(anio, mes + 1, 0).getDate();
  return new Date(anio, mes, Math.min(dia, ultimoDiaDelMes));
}
