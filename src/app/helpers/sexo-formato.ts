const TEXTOS_SEXO: Readonly<Record<string, string>> = {
  MASCULINO: 'Masculino',
  FEMENINO: 'Femenino',
  OTRO: 'Otro',
};

/** Texto para mostrar el sexo de un socio ("-" si no está cargado). */
export function formatearSexo(sexo: string | null | undefined): string {
  return sexo ? TEXTOS_SEXO[sexo] ?? sexo : '-';
}
