import { Renderer2 } from '@angular/core';
import type { TooltipTablaState } from '../../../helpers/tabla-tooltip.helpers';

/** Renderiza el tooltip en el contenedor indicado; por defecto usa document.body. */
export function renderizarTooltipTablaEnBody(
  renderer: Renderer2,
  document: Document,
  tooltip: TooltipTablaState,
  tooltipElementRef: { current: HTMLElement | null },
  contenedor: HTMLElement = document.body,
): void {
  destruirTooltipTablaEnBody(renderer, document, tooltipElementRef);

  const container = renderer.createElement('div') as HTMLDivElement;
  tooltipElementRef.current = container;

  renderer.setAttribute(container, 'role', 'tooltip');
  renderer.setStyle(container, 'position', 'fixed');
  renderer.setStyle(container, 'z-index', '4000');
  renderer.setStyle(container, 'left', `${tooltip.left}px`);
  renderer.setStyle(container, 'top', `${tooltip.top}px`);
  renderer.setStyle(container, 'width', 'min(18rem, calc(100vw - 3rem))');
  renderer.setStyle(container, 'padding', '0.7rem 0.8rem');
  renderer.setStyle(container, 'display', 'grid');
  renderer.setStyle(container, 'gap', '0.18rem');
  renderer.setStyle(container, 'border-radius', '0.9rem');
  renderer.setStyle(
    container,
    'border',
    '1px solid color-mix(in srgb, var(--app-accent) 24%, var(--app-surface-border))',
  );
  renderer.setStyle(
    container,
    'background',
    'linear-gradient(180deg, color-mix(in srgb, var(--app-surface) 97%, white 3%), color-mix(in srgb, var(--app-surface-strong) 94%, transparent))',
  );
  renderer.setStyle(
    container,
    'box-shadow',
    '0 14px 36px rgb(0 0 0 / 18%), inset 0 1px 0 rgb(255 255 255 / 12%)',
  );
  renderer.setStyle(container, 'text-align', 'left');
  renderer.setStyle(container, 'pointer-events', 'auto');
  renderer.setStyle(
    container,
    'transform',
    tooltip.placement === 'top' ? 'translateY(-100%)' : 'translateY(0)',
  );

  const arrow = renderer.createElement('span') as HTMLSpanElement;
  renderer.setStyle(arrow, 'position', 'absolute');
  renderer.setStyle(arrow, 'left', '50%');
  renderer.setStyle(arrow, 'width', '0.8rem');
  renderer.setStyle(arrow, 'height', '0.8rem');
  renderer.setStyle(
    arrow,
    'background',
    'color-mix(in srgb, var(--app-surface-strong) 94%, transparent)',
  );
  renderer.setStyle(
    arrow,
    'transform',
    tooltip.placement === 'top'
      ? 'translate(-50%, -50%) rotate(45deg)'
      : 'translate(-50%, 50%) rotate(45deg)',
  );

  if (tooltip.placement === 'top') {
    renderer.setStyle(arrow, 'top', '100%');
    renderer.setStyle(
      arrow,
      'border-right',
      '1px solid color-mix(in srgb, var(--app-accent) 24%, var(--app-surface-border))',
    );
    renderer.setStyle(
      arrow,
      'border-bottom',
      '1px solid color-mix(in srgb, var(--app-accent) 24%, var(--app-surface-border))',
    );
  } else {
    renderer.setStyle(arrow, 'bottom', '100%');
    renderer.setStyle(
      arrow,
      'border-left',
      '1px solid color-mix(in srgb, var(--app-accent) 24%, var(--app-surface-border))',
    );
    renderer.setStyle(
      arrow,
      'border-top',
      '1px solid color-mix(in srgb, var(--app-accent) 24%, var(--app-surface-border))',
    );
  }

  const title = renderer.createElement('strong') as HTMLElement;
  renderer.setStyle(title, 'color', 'var(--app-text)');
  renderer.setStyle(title, 'font-size', '0.72rem');
  renderer.setStyle(title, 'font-weight', '900');
  renderer.setStyle(title, 'letter-spacing', '0.04em');
  renderer.setStyle(title, 'text-transform', 'uppercase');
  renderer.appendChild(title, renderer.createText(tooltip.titulo));

  const text = renderer.createElement('span') as HTMLElement;
  renderer.setStyle(text, 'color', 'var(--app-text-soft)');
  renderer.setStyle(text, 'font-size', '0.82rem');
  renderer.setStyle(text, 'line-height', '1.45');
  renderer.setStyle(text, 'white-space', 'normal');
  renderer.setStyle(text, 'overflow-wrap', 'anywhere');
  renderer.appendChild(text, renderer.createText(tooltip.texto));

  renderer.listen(container, 'click', (event: Event) => event.stopPropagation());

  renderer.appendChild(container, arrow);
  renderer.appendChild(container, title);
  renderer.appendChild(container, text);
  renderer.appendChild(contenedor, container);
}

export function destruirTooltipTablaEnBody(
  renderer: Renderer2,
  document: Document,
  tooltipElementRef: { current: HTMLElement | null },
): void {
  if (!tooltipElementRef.current) {
    return;
  }

  const contenedor = tooltipElementRef.current.parentNode;
  if (contenedor) {
    renderer.removeChild(contenedor, tooltipElementRef.current);
  }
  tooltipElementRef.current = null;
}
