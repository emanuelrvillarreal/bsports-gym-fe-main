import type { Driver } from 'driver.js';

export function clickSelector(selector: string): void {
  const element = document.querySelector<HTMLElement>(selector);
  element?.click();
}

export function avanzarLuegoDe(
  driver: Driver,
  action: () => void,
  delayMs = 220,
): void {
  action();
  window.setTimeout(() => driver.moveNext(), delayMs);
}

export function avanzarLuegoDeAcciones(
  driver: Driver,
  actions: readonly (() => void)[],
  delayMs = 320,
  gapMs = 90,
): void {
  actions.forEach((action, index) => {
    window.setTimeout(() => action(), index * gapMs);
  });
  window.setTimeout(() => driver.moveNext(), delayMs + Math.max(0, actions.length - 1) * gapMs);
}
