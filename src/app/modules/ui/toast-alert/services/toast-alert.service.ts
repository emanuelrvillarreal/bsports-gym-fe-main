import { Injectable, Signal, computed, signal } from '@angular/core';

export type ToastNivel = 'success' | 'error' | 'info';

export interface ToastAlertState {
  readonly id: number;
  readonly nivel: ToastNivel;
  readonly titulo: string;
  readonly subtitulo: string;
  readonly texto: string;
  readonly duracionMs: number;
  readonly confirmacion?: boolean;
  readonly fondoPeligro?: boolean;
  readonly fondoAdvertencia?: boolean;
  readonly posicion?: 'centrada' | 'inferior' | 'lateral';
  readonly textoConfirmar?: string;
  readonly textoCancelar?: string;
  readonly onConfirmar?: () => void;
  readonly onCancelar?: () => void;
}

export interface ToastAlertOptions {
  readonly titulo?: string;
  readonly subtitulo?: string;
  readonly duracionMs?: number;
  readonly confirmacion?: boolean;
  readonly fondoPeligro?: boolean;
  readonly posicion?: 'centrada' | 'inferior' | 'lateral';
  readonly textoConfirmar?: string;
  readonly textoCancelar?: string;
  readonly onConfirmar?: () => void;
  readonly onCancelar?: () => void;
}

@Injectable({
  providedIn: 'root',
})
export class ToastAlertService {
  private readonly toast = signal<ToastAlertState | null>(null);
  private readonly cola: ToastAlertState[] = [];
  private ultimoId = 0;

  readonly toastActual: Signal<ToastAlertState | null> = computed(() => this.toast());

  success(texto: string, opciones?: ToastAlertOptions): void {
    this.mostrar('success', texto, opciones);
  }

  error(texto: string, opciones?: ToastAlertOptions): void {
    this.mostrar('error', texto, opciones);
  }

  info(texto: string, opciones?: ToastAlertOptions): void {
    this.mostrar('info', texto, opciones);
  }

  /** Muestra el aviso cuando finaliza el toast visible, sin reemplazarlo. */
  encolarInfo(texto: string, opciones?: ToastAlertOptions): void {
    this.encolar('info', texto, opciones);
  }

  confirm(texto: string, opciones?: Omit<ToastAlertOptions, 'confirmacion' | 'duracionMs' | 'fondoPeligro'>): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      let resuelto = false;
      const resolver = (valor: boolean) => {
        if (resuelto) {
          return;
        }

        resuelto = true;
        resolve(valor);
      };

      this.mostrar('info', texto, {
        ...opciones,
        confirmacion: true,
        fondoPeligro: false,
        posicion: opciones?.posicion ?? 'centrada',
        duracionMs: 0,
        textoConfirmar: opciones?.textoConfirmar ?? 'Confirmar',
        textoCancelar: opciones?.textoCancelar ?? 'Cancelar',
        onConfirmar: () => {
          opciones?.onConfirmar?.();
          resolver(true);
        },
        onCancelar: () => {
          opciones?.onCancelar?.();
          resolver(false);
        },
      });
    });
  }

  confirmDanger(texto: string, opciones?: Omit<ToastAlertOptions, 'confirmacion' | 'duracionMs' | 'fondoPeligro'>): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      let resuelto = false;
      const resolver = (valor: boolean) => {
        if (resuelto) {
          return;
        }

        resuelto = true;
        resolve(valor);
      };

      this.mostrar('error', texto, {
        ...opciones,
        confirmacion: true,
        fondoPeligro: true,
        posicion: opciones?.posicion ?? 'centrada',
        duracionMs: 0,
        textoConfirmar: opciones?.textoConfirmar ?? 'Eliminar',
        textoCancelar: opciones?.textoCancelar ?? 'Cancelar',
        onConfirmar: () => {
          opciones?.onConfirmar?.();
          resolver(true);
        },
        onCancelar: () => {
          opciones?.onCancelar?.();
          resolver(false);
        },
      });
    });
  }

  limpiar(): void {
    this.toast.set(null);
    this.mostrarSiguienteEnCola();
  }

  confirmarActual(): void {
    const actual = this.toast();
    actual?.onConfirmar?.();
    this.limpiar();
  }

  cancelarActual(): void {
    const actual = this.toast();
    actual?.onCancelar?.();
    this.limpiar();
  }

  cerrarActual(): void {
    const actual = this.toast();
    if (actual?.confirmacion) {
      actual.onCancelar?.();
    }
    this.limpiar();
  }

  private mostrar(nivel: ToastNivel, texto: string, opciones?: ToastAlertOptions): void {
    const toast = this.crearToast(nivel, texto, opciones);
    if (toast) {
      this.toast.set(toast);
    }
  }


  private encolar(nivel: ToastNivel, texto: string, opciones?: ToastAlertOptions): void {
    const toast = this.crearToast(nivel, texto, opciones);
    if (!toast) {
      return;
    }

    if (this.toast()) {
      this.cola.push(toast);
      return;
    }

    this.toast.set(toast);
  }

  private crearToast(nivel: ToastNivel, texto: string, opciones?: ToastAlertOptions): ToastAlertState | null {
    const mensaje = texto.trim();
    if (!mensaje) {
      return null;
    }

    return {
      id: ++this.ultimoId,
      nivel,
      titulo: opciones?.titulo?.trim() || this.obtenerTituloPorDefecto(nivel),
      subtitulo: opciones?.subtitulo?.trim() || '',
      texto: mensaje,
      duracionMs: opciones?.duracionMs ?? 5000,
      confirmacion: opciones?.confirmacion ?? false,
      fondoPeligro: opciones?.fondoPeligro ?? false,
      posicion: opciones?.posicion ?? 'inferior',
      textoConfirmar: opciones?.textoConfirmar?.trim() || 'Confirmar',
      textoCancelar: opciones?.textoCancelar?.trim() || 'Cancelar',
      onConfirmar: opciones?.onConfirmar,
      onCancelar: opciones?.onCancelar,
    };

  }

  private mostrarSiguienteEnCola(): void {
    const siguiente = this.cola.shift();
    if (siguiente) {
      this.toast.set(siguiente);
    }
  }

  private obtenerTituloPorDefecto(nivel: ToastNivel): string {
    if (nivel === 'success') {
      return 'Operacion exitosa';
    }

    if (nivel === 'error') {
      return 'Ocurrio un error';
    }

    return 'Informacion';
  }
}
