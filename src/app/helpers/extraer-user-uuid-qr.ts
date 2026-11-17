/**
 * Obtiene el identificador de usuario que puede venir plano, como JSON o en
 * una URL dentro del QR de la credencial.
 */
export function extraerUserUuidDeQr(contenido: string): string {
  const valor = contenido.trim();
  if (!valor) return '';

  try {
    const json = JSON.parse(valor) as { userUuid?: unknown; uuid?: unknown };
    const candidato = json.userUuid ?? json.uuid;
    if (typeof candidato === 'string') return candidato.trim();
  } catch {
    // El QR también puede contener el UUID plano o una URL.
  }

  try {
    const url = new URL(valor);
    const candidato = url.searchParams.get('userUuid') ?? url.searchParams.get('uuid');
    if (candidato) return candidato.trim();
  } catch {
    // No es una URL; se trata como identificador plano.
  }

  return valor;
}
