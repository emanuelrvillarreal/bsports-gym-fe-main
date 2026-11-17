import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';

const CLAVE_ALTO_RENDIMIENTO_DESACTIVADO = 'b-spots.ui-performance.disabled';

@Injectable({ providedIn: 'root' })
export class PerformanceModeService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly esNavegador = isPlatformBrowser(this.platformId);
  private inicializado = false;

  readonly desactivado = signal(true);

  constructor() {
    this.inicializar();
  }

  inicializar(): void {
    if (this.inicializado) {
      return;
    }

    this.desactivado.set(this.obtenerEstadoInicial());
    this.inicializado = true;
  }

  establecerDesactivado(desactivado: boolean): void {
    this.desactivado.set(desactivado);

    if (!this.esNavegador) {
      return;
    }

    try {
      localStorage.setItem(CLAVE_ALTO_RENDIMIENTO_DESACTIVADO, JSON.stringify({ desactivado }));
      this.sincronizarAtributoDocumento(desactivado);
    } catch {
      return;
    }
  }

  private obtenerEstadoInicial(): boolean {
    if (!this.esNavegador) {
      return true;
    }

    try {
      const persistido = localStorage.getItem(CLAVE_ALTO_RENDIMIENTO_DESACTIVADO);
      if (!persistido) {
        // Sin preferencia guardada, los efectos visuales quedan activos por defecto.
        return true;
      }

      const parseado = JSON.parse(persistido) as Partial<{ desactivado: boolean }>;
      return parseado.desactivado !== false;
    } catch {
      return true;
    }
  }

  private sincronizarAtributoDocumento(desactivado: boolean): void {
    const root = document.documentElement;

    if (desactivado) {
      root.removeAttribute('data-ui-high-performance');
      return;
    }

    root.setAttribute('data-ui-high-performance', 'true');
  }
}
