import { NgClass, NgTemplateOutlet } from '@angular/common';
import { DOCUMENT } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { obtenerColorTextoContraste } from '../../../../helpers/color-texto-contraste';

export type ToastAlertVariante = 'compacto' | 'normal';
export type ToastAlertPosicion = 'centrada' | 'inferior' | 'lateral';

@Component({
  selector: 'app-toast-alert',
  standalone: true,
  imports: [NgClass, NgIcon, NgTemplateOutlet],
  templateUrl: './toast-alert.component.html',
  styleUrl: './toast-alert.component.scss',
  host: {
    '[style.--toast-alert-advertencia-texto]': 'colorTextoAdvertencia()',
  },
})
export class ToastAlertComponent implements AfterViewInit, OnDestroy {
  private readonly document = inject(DOCUMENT);
  private readonly contenedorToast = viewChild<ElementRef<HTMLElement>>('contenedorToast');
  readonly variante = input<ToastAlertVariante>('normal');
  readonly confirmacion = input(false);
  readonly duracionMs = input(5000);
  readonly fondoPeligro = input(false);
  readonly fondoAdvertencia = input(false);
  readonly posicion = input<ToastAlertPosicion>('inferior');
  readonly altoRendimiento = input(false);
  readonly performance = input(false);
  readonly icono = input('heroInformationCircle');
  readonly titulo = input('');
  readonly subtitulo = input('');
  readonly texto = input('');
  readonly textoConfirmar = input('Confirmar');
  readonly textoCancelar = input('Cancelar');

  readonly cerrada = output<void>();
  readonly confirmada = output<void>();
  readonly cancelada = output<void>();

  protected readonly visible = signal(true);
  protected readonly cerrando = signal(false);
  protected readonly progreso = signal(100);
  protected readonly modoAltoRendimiento = computed(
    () => this.altoRendimiento() || this.performance(),
  );
  protected readonly colorTextoAdvertencia = computed(() =>
    obtenerColorTextoContraste('#fbbf24'),
  );
  protected readonly clasesToast = computed(() => ({
    'toast-alert--compacto': this.variante() === 'compacto',
    'toast-alert--centrada': this.posicion() === 'centrada',
    'toast-alert--inferior': this.posicion() === 'inferior',
    'toast-alert--lateral': this.posicion() === 'lateral',
    'toast-alert--peligro': this.fondoPeligro(),
    'toast-alert--confirmacion': this.confirmacion(),
    'toast-alert--advertencia': this.fondoAdvertencia(),
    'toast-alert--sin-animacion': this.modoAltoRendimiento(),
    'toast-alert--alto-rendimiento': this.modoAltoRendimiento(),
    'toast-alert--cerrando': this.cerrando(),
  }));

  private cierreTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private cierreFinalTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private progresoIntervalId: ReturnType<typeof setInterval> | null = null;
  private inicioDuracion = 0;
  private readonly alAbrirPopup = () => this.mostrarPorEncimaDelPopup();

  constructor() {
    effect(() => {
      const duracion = this.duracionMs();
      const modoPerformance = this.modoAltoRendimiento();

      this.limpiarTemporizadores();
      this.visible.set(true);
      this.cerrando.set(false);
      this.progreso.set(100);

      if (duracion <= 0) {
        return;
      }

      this.inicioDuracion = Date.now();
      this.cierreTimeoutId = setTimeout(() => this.cerrar(), duracion);

      if (modoPerformance) {
        this.progresoIntervalId = setInterval(() => this.actualizarProgreso(duracion), 250);
      }
    });

    // El host puede reutilizar esta instancia al reemplazar un toast informativo
    // por una confirmación. En ese caso el contenedor cambia de section a dialog
    // sin volver a ejecutar ngAfterViewInit, por lo que debemos promover cada
    // contenedor nuevo a la capa superior.
    effect(() => {
      const contenedor = this.contenedorToast()?.nativeElement;
      const visible = this.visible();
      this.confirmacion();
      this.fondoPeligro();

      if (contenedor && visible) {
        this.mostrarPorEncimaDelPopup();
      }
    });
  }

  ngAfterViewInit(): void {
    this.document.addEventListener('app-popup-abierto', this.alAbrirPopup);
  }

  ngOnDestroy(): void {
    this.limpiarTemporizadores();
    this.document.removeEventListener('app-popup-abierto', this.alAbrirPopup);
    this.ocultarDeCapaSuperior();
  }

  protected cerrar(): void {
    if (this.cerrando()) {
      return;
    }

    this.limpiarTemporizadores();
    this.cerrando.set(true);

    const tiempoCierre = this.modoAltoRendimiento() ? 0 : 180;
    this.cierreFinalTimeoutId = setTimeout(() => {
      this.visible.set(false);
      this.ocultarDeCapaSuperior();
      this.cerrada.emit();
    }, tiempoCierre);
  }

  protected confirmar(): void {
    this.cerrar();
    this.confirmada.emit();
  }

  protected cancelar(): void {
    this.cerrar();
    this.cancelada.emit();
  }

  private actualizarProgreso(duracion: number): void {
    const transcurrido = Date.now() - this.inicioDuracion;
    const restante = Math.max(0, 100 - (transcurrido / duracion) * 100);
    this.progreso.set(restante);
  }

  private limpiarTemporizadores(): void {
    if (this.cierreTimeoutId) {
      clearTimeout(this.cierreTimeoutId);
      this.cierreTimeoutId = null;
    }

    if (this.cierreFinalTimeoutId) {
      clearTimeout(this.cierreFinalTimeoutId);
      this.cierreFinalTimeoutId = null;
    }

    if (this.progresoIntervalId) {
      clearInterval(this.progresoIntervalId);
      this.progresoIntervalId = null;
    }
  }

  /**
   * Los diálogos modales nativos usan la "top layer" del navegador y ningún
   * z-index puede superarlos. El popover manual coloca al toast en esa misma
   * capa; al abrir un popup se lo vuelve a promover para conservar el orden.
   */
  private mostrarPorEncimaDelPopup(): void {
    queueMicrotask(() => {
      const toast = this.contenedorToast()?.nativeElement;
      if (!toast) return;

      if (toast.tagName === 'DIALOG') {
        const dialogo = toast as HTMLDialogElement;
        if (dialogo.open) {
          dialogo.close();
        }
        if (typeof dialogo.showModal === 'function') {
          dialogo.showModal();
        } else {
          dialogo.setAttribute('open', '');
        }
        return;
      }

      if (typeof toast.showPopover !== 'function') return;

      if (toast.matches(':popover-open')) {
        toast.hidePopover();
      }
      toast.showPopover();
    });
  }

  private ocultarDeCapaSuperior(): void {
    const toast = this.contenedorToast()?.nativeElement;
    if (toast?.tagName === 'DIALOG' && (toast as HTMLDialogElement).open) {
      const dialogo = toast as HTMLDialogElement;
      if (typeof dialogo.close === 'function') {
        dialogo.close();
      } else {
        dialogo.removeAttribute('open');
      }
      return;
    }

    if (toast?.matches(':popover-open')) {
      toast.hidePopover();
    }
  }
}
