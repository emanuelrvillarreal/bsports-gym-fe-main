import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  input,
  output,
  signal,
} from '@angular/core';

import { InscripcionActividadPayload } from '../../../../core/api/interfaces/actividades.interfaces';
import { SelectComponent, SelectOption } from '../../../ui/select/select.component';
import { ValidacionFormularioDirective } from '../../../ui/validacion-formulario/validacion-formulario.directive';

@Component({
  selector: 'app-formulario-inscripcion-actividad',
  standalone: true,
  imports: [SelectComponent, ValidacionFormularioDirective],
  templateUrl: './formulario-inscripcion-actividad.component.html',
  styleUrl: './formulario-inscripcion-actividad.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormularioInscripcionActividadComponent implements OnDestroy {
  readonly duracionErrorMs = input(5000);
  readonly opcionesSocios = input<readonly SelectOption[]>([]);
  readonly enviado = output<InscripcionActividadPayload>();

  protected readonly memberUuid = signal('');
  protected readonly mensajeError = signal('');
  protected readonly errorVisible = signal(false);
  private errorTimeoutId: ReturnType<typeof setTimeout> | null = null;

  ngOnDestroy(): void {
    this.limpiarTimeoutError();
  }
  protected cambiarSocio(valor: string): void {
    this.memberUuid.set(valor);
  }
  protected enviar(): void {
    const memberUuid = this.memberUuid().trim();
    if (!memberUuid) {
      this.mostrarError('Seleccioná un socio.');
      return;
    }
    this.limpiarTimeoutError();
    this.errorVisible.set(false);
    this.enviado.emit({ memberUuid });
  }
  private mostrarError(mensaje: string): void {
    this.limpiarTimeoutError();
    this.mensajeError.set(mensaje);
    this.errorVisible.set(true);
    this.errorTimeoutId = setTimeout(() => this.errorVisible.set(false), this.duracionErrorMs());
  }
  private limpiarTimeoutError(): void {
    if (this.errorTimeoutId !== null) {
      clearTimeout(this.errorTimeoutId);
      this.errorTimeoutId = null;
    }
  }
}
