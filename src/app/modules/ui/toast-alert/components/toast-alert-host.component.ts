import { Component, computed, inject } from '@angular/core';

import { ToastAlertComponent } from './toast-alert.component';
import { ToastAlertService } from '../services/toast-alert.service';

@Component({
  selector: 'app-toast-alert-host',
  standalone: true,
  imports: [ToastAlertComponent],
  template: `
    @if (toastActual(); as toast) {
      <app-toast-alert
        [confirmacion]="toast.confirmacion ?? false"
        [duracionMs]="toast.duracionMs"
        [fondoPeligro]="toast.fondoPeligro ?? toast.nivel === 'error'"
        [fondoAdvertencia]="toast.fondoAdvertencia ?? toast.nivel === 'info'"
        [icono]="iconoToast()"
        [posicion]="toast.posicion ?? 'inferior'"
        [titulo]="toast.titulo"
        [subtitulo]="toast.subtitulo"
        [texto]="toast.texto"
        [textoConfirmar]="toast.textoConfirmar ?? 'Confirmar'"
        [textoCancelar]="toast.textoCancelar ?? 'Cancelar'"
        (confirmada)="confirmarActual()"
        (cancelada)="cancelarActual()"
        (cerrada)="cerrarActual()"
      />
    }
  `,
})
export class ToastAlertHostComponent {
  private readonly toastAlertService = inject(ToastAlertService);

  protected readonly toastActual = this.toastAlertService.toastActual;
  protected readonly iconoToast = computed(() => {
    const nivel = this.toastActual()?.nivel;

    if (nivel === 'success') {
      return 'heroCheckCircle';
    }

    if (nivel === 'error') {
      return 'heroExclamationTriangle';
    }

    return 'heroInformationCircle';
  });

  protected cerrarActual(): void {
    this.toastAlertService.cerrarActual();
  }

  protected confirmarActual(): void {
    this.toastAlertService.confirmarActual();
  }

  protected cancelarActual(): void {
    this.toastAlertService.cancelarActual();
  }
}
