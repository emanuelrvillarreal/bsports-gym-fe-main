export interface RectPanelSelect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly bottom: number;
}

export interface EstilosPanelSelect {
  readonly width: string;
  readonly left: string;
  readonly top: string;
  readonly maxHeight: string;
}

/** Calcula posición del panel flotante respecto al control y viewport. */
export function calcularEstilosPanelSelect(
  rect: RectPanelSelect,
  viewportWidth: number,
  viewportHeight: number,
  altoPanelScroll: number,
  margenViewport = 8,
  separacion = 4,
): EstilosPanelSelect {
  const altoPanel = Math.min(altoPanelScroll || 0, Math.floor(viewportHeight * 0.45));
  const espacioAbajo = viewportHeight - rect.bottom - margenViewport;
  const espacioArriba = rect.top - margenViewport;
  const abrirArriba = espacioAbajo < Math.min(altoPanel, 160) && espacioArriba > espacioAbajo;
  const maxHeight = Math.max(
    96,
    Math.floor(abrirArriba ? espacioArriba - separacion : espacioAbajo - separacion),
  );
  const ancho = Math.max(rect.width, 140);
  const left = Math.min(
    Math.max(margenViewport, rect.left),
    Math.max(margenViewport, viewportWidth - ancho - margenViewport),
  );
  const top = abrirArriba
    ? Math.max(margenViewport, rect.top - Math.min(altoPanel, maxHeight) - separacion)
    : Math.min(viewportHeight - margenViewport - maxHeight, rect.bottom + separacion);

  return {
    width: `${ancho}px`,
    left: `${left}px`,
    top: `${Math.max(margenViewport, top)}px`,
    maxHeight: `${maxHeight}px`,
  };
}
