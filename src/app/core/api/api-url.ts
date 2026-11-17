import { environment } from '../../../environments/environment';

/**
 * Compone una URL de API sin depender de que la base o la ruta incluyan barras.
 * Mantener esta normalizacion en un unico lugar evita rutas con `//` accidentales.
 */
export function crearApiUrl(ruta: string): string {
  const base = environment.apiBaseUrl.trim().replace(/\/+$/, '');
  const rutaNormalizada = ruta.trim().replace(/^\/+/, '');

  return rutaNormalizada ? `${base}/${rutaNormalizada}` : base;
}
