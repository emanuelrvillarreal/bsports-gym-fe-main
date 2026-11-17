const ETIQUETAS_DIAS_SEMANA: Readonly<Record<string, string>> = {
  LUNES: 'Lunes',
  MARTES: 'Martes',
  MIERCOLES: 'Miércoles',
  JUEVES: 'Jueves',
  VIERNES: 'Viernes',
  SABADO: 'Sábado',
  DOMINGO: 'Domingo',
};

const CANTIDAD_DIAS_SEMANA = Object.keys(ETIQUETAS_DIAS_SEMANA).length;

/**
 * Convierte los días informados por la API en etiquetas listas para presentar.
 * Tolera mayúsculas, espacios, acentos y ambos separadores observados en los contratos.
 */
export function normalizarDiasSemana(diasSemana: string | null | undefined): readonly string[] {
  if (!diasSemana?.trim()) return [];

  const diasNormalizados = diasSemana
    .split(/[;,:]/)
    .map((dia) =>
      dia
        .trim()
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, ''),
    )
    .filter((dia) => dia in ETIQUETAS_DIAS_SEMANA);
  const diasUnicos = [...new Set(diasNormalizados)];

  if (diasUnicos.length === CANTIDAD_DIAS_SEMANA) return ['Todos los días'];

  return diasUnicos.map((dia) => ETIQUETAS_DIAS_SEMANA[dia]);
}
