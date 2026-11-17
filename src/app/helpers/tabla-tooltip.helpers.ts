export type TooltipPlacementTabla = 'top' | 'bottom';

export interface TooltipTablaState {
  readonly id: string;
  readonly titulo: string;
  readonly texto: string;
  readonly top: number;
  readonly left: number;
  readonly placement: TooltipPlacementTabla;
}

export interface RectTooltipAncla {
  readonly top: number;
  readonly left: number;
  readonly width: number;
  readonly height: number;
}

/** Calcula posición del tooltip flotante respecto al ancla y viewport. */
export function calcularPosicionTooltipTabla(
  ancla: RectTooltipAncla,
  tooltipWidth: number,
  tooltipHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  margen = 8,
): Pick<TooltipTablaState, 'top' | 'left' | 'placement'> {
  const centroAnclaX = ancla.left + ancla.width / 2;
  let left = centroAnclaX - tooltipWidth / 2;
  left = Math.max(margen, Math.min(left, viewportWidth - tooltipWidth - margen));

  const espacioAbajo = viewportHeight - (ancla.top + ancla.height) - margen;
  const espacioArriba = ancla.top - margen;
  const placement: TooltipPlacementTabla =
    espacioAbajo >= tooltipHeight || espacioAbajo >= espacioArriba ? 'bottom' : 'top';

  const top =
    placement === 'bottom'
      ? Math.min(ancla.top + ancla.height + 6, viewportHeight - tooltipHeight - margen)
      : Math.max(margen, ancla.top - tooltipHeight - 6);

  return { top, left, placement };
}

export function crearTooltipTablaState(
  id: string,
  titulo: string,
  texto: string,
  ancla: RectTooltipAncla,
  tooltipWidth: number,
  tooltipHeight: number,
  viewportWidth: number,
  viewportHeight: number,
): TooltipTablaState {
  const posicion = calcularPosicionTooltipTabla(
    ancla,
    tooltipWidth,
    tooltipHeight,
    viewportWidth,
    viewportHeight,
  );

  return {
    id,
    titulo,
    texto,
    ...posicion,
  };
}
