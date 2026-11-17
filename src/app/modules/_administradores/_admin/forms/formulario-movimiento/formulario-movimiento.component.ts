import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';

import {
  MedioPagoManual,
  MovimientoManualPayload,
  TipoMovimiento,
} from '../../../../../core/api/interfaces/tesoreria.interfaces';
import { BotonComponent } from '../../../../ui/boton/boton.component';
import { ValidacionFormularioDirective } from '../../../../ui/validacion-formulario/validacion-formulario.directive';

@Component({
  selector: 'app-formulario-movimiento',
  imports: [BotonComponent, ValidacionFormularioDirective],
  templateUrl: './formulario-movimiento.component.html',
  styleUrl: './formulario-movimiento.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormularioMovimientoComponent {
  readonly tipoFijo = input<TipoMovimiento | null>(null);
  readonly enviando = input(false);
  readonly enviado = output<MovimientoManualPayload>();

  protected readonly tipo = signal<TipoMovimiento>('INGRESO');
  protected readonly monto = signal('');
  protected readonly fecha = signal('');
  protected readonly concepto = signal('');
  protected readonly medioPago = signal<MedioPagoManual>('EFECTIVO');
  protected readonly observaciones = signal('');
  protected readonly error = signal('');

  protected actualizar(campo: 'monto' | 'fecha' | 'concepto' | 'observaciones', evento: Event): void {
    this[campo].set((evento.target as HTMLInputElement | HTMLTextAreaElement).value);
  }

  protected actualizarTipo(evento: Event): void {
    this.tipo.set((evento.target as HTMLSelectElement).value as TipoMovimiento);
  }

  protected actualizarMedioPago(evento: Event): void {
    this.medioPago.set((evento.target as HTMLSelectElement).value as MedioPagoManual);
  }

  protected enviar(): void {
    const tipo = this.tipoFijo() ?? this.tipo();
    const monto = Number(this.monto());
    const concepto = this.concepto().trim();
    if (!Number.isFinite(monto) || monto <= 0 || !concepto) {
      this.error.set('Ingresá un monto mayor a cero y un concepto.');
      return;
    }

    this.error.set('');
    this.enviado.emit({
      tipo,
      monto,
      concepto,
      ...(this.fecha() ? { fecha: this.fecha() } : {}),
      ...(tipo === 'INGRESO' ? { medioPago: this.medioPago() } : {}),
      ...(this.observaciones().trim() ? { observaciones: this.observaciones().trim() } : {}),
    });
  }
}
