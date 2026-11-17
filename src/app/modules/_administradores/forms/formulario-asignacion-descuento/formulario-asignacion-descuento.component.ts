import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  input,
  output,
  signal,
} from '@angular/core';

import {
  AsignarDescuentoPayload,
  DescuentoDto,
} from '../../../../core/api/interfaces/descuentos.interfaces';
import { InputFechaComponent } from '../../../ui/input-fecha/input-fecha.component';
import { SelectComponent, SelectOption } from '../../../ui/select/select.component';
import { ValidacionFormularioDirective } from '../../../ui/validacion-formulario/validacion-formulario.directive';
import { opcionDescuento } from '../../../../helpers/descuento-opcion';

function fechaLocalActual(fecha = new Date()): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(
    fecha.getDate(),
  ).padStart(2, '0')}`;
}

@Component({
  selector: 'app-formulario-asignacion-descuento',
  standalone: true,
  imports: [InputFechaComponent, SelectComponent, ValidacionFormularioDirective],
  templateUrl: './formulario-asignacion-descuento.component.html',
  styleUrl: './formulario-asignacion-descuento.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormularioAsignacionDescuentoComponent implements OnDestroy {
  readonly duracionErrorMs = input(5000);
  readonly descuentos = input<readonly DescuentoDto[]>([]);
  readonly fechaMinima = input('');
  readonly enviado = output<AsignarDescuentoPayload>();

  protected readonly descuentoUuid = signal('');
  protected readonly fechaDesde = signal(fechaLocalActual());
  protected readonly fechaHasta = signal('');
  protected readonly mensajeError = signal('');
  protected readonly errorVisible = signal(false);
  protected readonly opcionesDescuentos = computed<readonly SelectOption[]>(() =>
    this.descuentos().map((descuento) => opcionDescuento(descuento)),
  );
  private errorTimeoutId: ReturnType<typeof setTimeout> | null = null;

  ngOnDestroy(): void {
    this.limpiarTimeoutError();
  }

  protected cambiarDescuento(valor: string): void {
    this.descuentoUuid.set(valor);
  }

  protected enviar(): void {
    const descuentoUuid = this.descuentoUuid().trim();
    const fechaDesde = this.fechaDesde();
    const fechaHasta = this.fechaHasta();
    if (!descuentoUuid || !fechaDesde) {
      this.mostrarError('Seleccioná un descuento y una fecha de inicio.');
      return;
    }
    if (fechaHasta && fechaHasta < fechaDesde) {
      this.mostrarError('La fecha de fin no puede ser anterior a la fecha de inicio.');
      return;
    }

    this.ocultarError();
    this.enviado.emit({ descuentoUuid, fechaDesde, fechaHasta: fechaHasta || null });
  }


  private mostrarError(mensaje: string): void {
    this.limpiarTimeoutError();
    this.mensajeError.set(mensaje);
    this.errorVisible.set(true);
    this.errorTimeoutId = setTimeout(() => this.errorVisible.set(false), this.duracionErrorMs());
  }

  private ocultarError(): void {
    this.limpiarTimeoutError();
    this.errorVisible.set(false);
  }

  private limpiarTimeoutError(): void {
    if (this.errorTimeoutId !== null) clearTimeout(this.errorTimeoutId);
    this.errorTimeoutId = null;
  }
}
