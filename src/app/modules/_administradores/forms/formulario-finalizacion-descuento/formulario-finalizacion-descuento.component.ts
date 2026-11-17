import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  input,
  output,
  signal,
} from '@angular/core';

import { FinalizarDescuentoPayload } from '../../../../core/api/interfaces/descuentos.interfaces';
import { InputFechaComponent } from '../../../ui/input-fecha/input-fecha.component';
import { ValidacionFormularioDirective } from '../../../ui/validacion-formulario/validacion-formulario.directive';

@Component({
  selector: 'app-formulario-finalizacion-descuento',
  standalone: true,
  imports: [InputFechaComponent, ValidacionFormularioDirective],
  templateUrl: './formulario-finalizacion-descuento.component.html',
  styleUrl: './formulario-finalizacion-descuento.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormularioFinalizacionDescuentoComponent implements OnDestroy {
  readonly duracionErrorMs = input(5000);
  readonly fechaDesde = input('');
  readonly enviado = output<FinalizarDescuentoPayload>();

  protected readonly fecha = signal('');
  protected readonly mensajeError = signal('');
  protected readonly errorVisible = signal(false);
  private errorTimeoutId: ReturnType<typeof setTimeout> | null = null;

  ngOnDestroy(): void {
    this.limpiarTimeoutError();
  }

  protected enviar(): void {
    const fecha = this.fecha();
    if (!fecha) {
      this.mostrarError('Seleccioná la fecha de finalización.');
      return;
    }
    if (this.fechaDesde() && fecha < this.fechaDesde()) {
      this.mostrarError(
        'La fecha de finalización no puede ser anterior al inicio de la asignación.',
      );
      return;
    }

    this.limpiarTimeoutError();
    this.errorVisible.set(false);
    this.enviado.emit({ fecha });
  }

  private mostrarError(mensaje: string): void {
    this.limpiarTimeoutError();
    this.mensajeError.set(mensaje);
    this.errorVisible.set(true);
    this.errorTimeoutId = setTimeout(() => this.errorVisible.set(false), this.duracionErrorMs());
  }

  private limpiarTimeoutError(): void {
    if (this.errorTimeoutId !== null) clearTimeout(this.errorTimeoutId);
    this.errorTimeoutId = null;
  }
}
