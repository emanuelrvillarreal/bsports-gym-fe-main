import { ChangeDetectionStrategy, Component, PLATFORM_ID, inject, signal } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';

const CLAVE_STORAGE = 'bsports.letra-grande';
const CLASE = 'letra-grande';

/**
 * Botón "Aa" para agrandar la letra y los botones de toda la aplicación (para quien ve poco o usa poco la
 * computadora). Cada persona lo prende si lo necesita; se recuerda en este navegador.
 */
@Component({
  selector: 'app-letra-grande',
  standalone: true,
  template: `
    <button
      type="button"
      class="letra-grande"
      [class.letra-grande--activa]="activa()"
      [attr.aria-pressed]="activa()"
      [attr.title]="activa() ? 'Volver a la letra normal' : 'Agrandar la letra'"
      [attr.aria-label]="activa() ? 'Volver a la letra normal' : 'Agrandar la letra'"
      (click)="alternar()"
    >
      <span aria-hidden="true" class="letra-grande__icono">A<span>A</span></span>
      <span class="letra-grande__texto">{{ activa() ? 'Letra normal' : 'Letra grande' }}</span>
    </button>
  `,
  styleUrl: './letra-grande.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LetraGrandeComponent {
  private readonly documento = inject(DOCUMENT);
  private readonly navegador = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly activa = signal(false);

  constructor() {
    if (!this.navegador) return;
    let guardada = false;
    try {
      guardada = localStorage.getItem(CLAVE_STORAGE) === '1';
    } catch {
      guardada = false;
    }
    this.aplicar(guardada);
  }

  protected alternar(): void {
    const nueva = !this.activa();
    this.aplicar(nueva);
    try {
      localStorage.setItem(CLAVE_STORAGE, nueva ? '1' : '0');
    } catch {
      // Sin storage: vale hasta recargar.
    }
  }

  private aplicar(activa: boolean): void {
    this.activa.set(activa);
    if (this.navegador) this.documento.documentElement.classList.toggle(CLASE, activa);
  }
}
