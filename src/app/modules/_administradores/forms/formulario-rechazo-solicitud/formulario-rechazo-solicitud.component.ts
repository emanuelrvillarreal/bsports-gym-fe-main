import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  input,
  output,
  signal,
} from '@angular/core';

import { ValidacionFormularioDirective } from '../../../ui/validacion-formulario/validacion-formulario.directive';

export interface RechazoSolicitudPayload {
  readonly motivo: string;
}

@Component({
  selector: 'app-formulario-rechazo-solicitud',
  standalone: true,
  imports: [ValidacionFormularioDirective],
  templateUrl: './formulario-rechazo-solicitud.component.html',
  styleUrl: './formulario-rechazo-solicitud.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormularioRechazoSolicitudComponent implements OnDestroy {
  readonly duracionErrorMs = input(5000);
  readonly enviado = output<RechazoSolicitudPayload>();

  protected readonly motivo = signal('');
  protected readonly mensajeError = signal('');
  protected readonly errorVisible = signal(false);
  private errorTimeoutId: ReturnType<typeof setTimeout> | null = null;

  ngOnDestroy(): void {
    this.limpiarTimeoutError();
  }

  protected actualizarMotivo(evento: Event): void {
    this.motivo.set((evento.target as HTMLTextAreaElement).value.slice(0, 512));
  }

  protected enviar(): void {
    this.limpiarTimeoutError();
    this.enviado.emit({ motivo: this.motivo().trim() });
  }

  private limpiarTimeoutError(): void {
    if (this.errorTimeoutId !== null) {
      clearTimeout(this.errorTimeoutId);
      this.errorTimeoutId = null;
    }
  }
}
