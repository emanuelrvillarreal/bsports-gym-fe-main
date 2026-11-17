/** Cómo se reproduce un enlace de video dentro de la app. */
export type FuenteVideo =
  | { readonly tipo: 'iframe'; readonly url: string; readonly proveedor: 'YouTube' | 'Vimeo' | 'Google Drive' }
  | { readonly tipo: 'archivo'; readonly url: string }
  | { readonly tipo: 'externo'; readonly url: string };

const EXTENSIONES_VIDEO = /\.(mp4|webm|ogg|ogv|mov|m4v)(\?.*)?$/i;

/**
 * Reconoce el enlace y arma una URL de reproducción segura:
 * - YouTube (watch, youtu.be, shorts, embed, live): reproductor sin cookies de youtube-nocookie.com.
 * - Vimeo: player.vimeo.com.
 * - Google Drive (archivo compartido): vista previa /preview.
 * - Archivo directo (.mp4, .webm, .ogg, .mov): etiqueta <video>.
 * - Cualquier otro: solo se puede abrir en otra pestaña.
 * La URL del iframe se construye acá con el id extraído, nunca se usa el texto cargado tal cual.
 */
export function resolverVideo(enlace: string | null | undefined): FuenteVideo | null {
  const texto = enlace?.trim();
  if (!texto) return null;
  let url: URL;
  try {
    url = new URL(texto);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;

  const host = url.hostname.replace(/^www\.|^m\./, '').toLowerCase();

  if (host === 'youtu.be' || host === 'youtube.com' || host === 'youtube-nocookie.com' || host === 'music.youtube.com') {
    const id =
      host === 'youtu.be'
        ? url.pathname.split('/')[1]
        : url.searchParams.get('v') ?? /^\/(?:shorts|embed|live|v)\/([^/?#]+)/.exec(url.pathname)?.[1];
    if (id && /^[\w-]{11}$/.test(id)) {
      const inicio = segundosInicio(url.searchParams.get('t') ?? url.searchParams.get('start'));
      return {
        tipo: 'iframe',
        proveedor: 'YouTube',
        url: `https://www.youtube-nocookie.com/embed/${id}?rel=0${inicio ? `&start=${inicio}` : ''}`,
      };
    }
  }

  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = /\/(?:video\/)?(\d{5,})/.exec(url.pathname)?.[1];
    if (id) return { tipo: 'iframe', proveedor: 'Vimeo', url: `https://player.vimeo.com/video/${id}` };
  }

  if (host === 'drive.google.com') {
    const id = /\/file\/d\/([\w-]{10,})/.exec(url.pathname)?.[1] ?? url.searchParams.get('id');
    if (id && /^[\w-]{10,}$/.test(id)) {
      return { tipo: 'iframe', proveedor: 'Google Drive', url: `https://drive.google.com/file/d/${id}/preview` };
    }
  }

  if (EXTENSIONES_VIDEO.test(url.pathname)) {
    return { tipo: 'archivo', url: url.toString() };
  }

  return { tipo: 'externo', url: url.toString() };
}

/** "90", "1m30s" o "1h2m3s" → segundos. */
function segundosInicio(valor: string | null): number {
  if (!valor) return 0;
  if (/^\d+$/.test(valor)) return Number(valor);
  const partes = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(valor);
  if (!partes) return 0;
  return Number(partes[1] ?? 0) * 3600 + Number(partes[2] ?? 0) * 60 + Number(partes[3] ?? 0);
}
