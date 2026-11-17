import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { BotonApariencia, BotonComponent } from '../boton/boton.component';

export type AnchoPopup = 'pequeno' | 'mediano' | 'grande' | 'extraGrande';

let siguientePopupId = 0;

@Component({
  selector: 'app-popup',
  standalone: true,
  imports: [BotonComponent],
  templateUrl: './popup.component.html',
  styleUrl: './popup.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PopupComponent implements OnDestroy {
  private readonly document = inject(DOCUMENT);
  private readonly dialogo = viewChild<ElementRef<HTMLDialogElement>>('dialogo');
  private elementoFocoAnterior: HTMLElement | null = null;
  private overflowBodyAnterior = '';
  protected readonly tituloId = `popup-titulo-${++siguientePopupId}`;
  protected readonly descripcionId = `popup-descripcion-${siguientePopupId}`;

  readonly abierto = input(false);
  readonly titulo = input.required<string>();
  readonly descripcion = input('');
  readonly mostrarEncabezado = input(true);
  /** Mantiene las acciones visibles en popups con contenido extenso. */
  readonly altoCompleto = input(false);
  readonly ancho = input<AnchoPopup>('mediano');
  readonly textoCancelar = input('Cancelar');
  readonly aparienciaCancelar = input<BotonApariencia>('texto');
  readonly mostrarCancelar = input(true);
  readonly cancelarDeshabilitado = input(false);

  readonly cancelar = output<void>();

  constructor() {
    effect(() => {
      const abierto = this.abierto();
      const dialogo = this.dialogo()?.nativeElement;
      if (!dialogo) return;

      if (abierto && !dialogo.open) {
        this.abrirDialogo(dialogo);
      } else if (!abierto && dialogo.open) {
        this.cerrarDialogo(dialogo);
      }
    });
  }

  ngOnDestroy(): void {
    this.restaurarEstadoDocumento();
  }

  protected impedirCierreImplicito(evento: Event): void {
    evento.preventDefault();
    evento.stopPropagation();
  }

  protected solicitarCancelacion(): void {
    if (!this.cancelarDeshabilitado()) {
      this.cancelar.emit();
    }
  }

  private abrirDialogo(dialogo: HTMLDialogElement): void {
    this.elementoFocoAnterior =
      this.document.activeElement instanceof HTMLElement ? this.document.activeElement : null;
    this.overflowBodyAnterior = this.document.body.style.overflow;
    this.document.body.style.overflow = 'hidden';

    if (typeof dialogo.showModal === 'function') {
      dialogo.showModal();
    } else {
      dialogo.setAttribute('open', '');
    }

    // Los diálogos modales se renderizan en la top layer. Notificamos al toast
    // activo para que se vuelva a promover sobre este popup.
    this.document.dispatchEvent(new Event('app-popup-abierto'));

    queueMicrotask(() => this.enfocarContenidoInicial(dialogo));
  }

  private cerrarDialogo(dialogo: HTMLDialogElement): void {
    if (typeof dialogo.close === 'function') {
      dialogo.close();
    } else {
      dialogo.removeAttribute('open');
    }
    this.document.dispatchEvent(new Event('app-popup-cerrado'));
    this.restaurarEstadoDocumento();
  }

  private enfocarContenidoInicial(dialogo: HTMLDialogElement): void {
    if (!dialogo.open) return;

    const enfocable = dialogo.querySelector<HTMLElement>(
      '[autofocus], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    (enfocable ?? dialogo).focus();
  }

  private restaurarEstadoDocumento(): void {
    this.document.body.style.overflow = this.overflowBodyAnterior;
    this.elementoFocoAnterior?.focus();
    this.elementoFocoAnterior = null;
  }
}
