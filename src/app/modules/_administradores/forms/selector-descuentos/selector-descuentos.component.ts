import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroTrash } from '@ng-icons/heroicons/outline';

import { AsignarDescuentoPayload, DescuentoDto } from '../../../../core/api/interfaces/descuentos.interfaces';
import { BotonComponent } from '../../../ui/boton/boton.component';
import { InputFechaComponent } from '../../../ui/input-fecha/input-fecha.component';
import { SelectComponent, SelectOption } from '../../../ui/select/select.component';
import { opcionDescuento } from '../../../../helpers/descuento-opcion';

function fechaLocalActual(fecha = new Date()): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
}

@Component({
  selector: 'app-selector-descuentos',
  standalone: true,
  imports: [BotonComponent, InputFechaComponent, NgIcon, SelectComponent],
  providers: [provideIcons({ heroTrash })],
  templateUrl: './selector-descuentos.component.html',
  styleUrl: './selector-descuentos.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectorDescuentosComponent {
  readonly descuentos = input<readonly DescuentoDto[]>([]);
  readonly seleccionados = input<readonly AsignarDescuentoPayload[]>([]);
  readonly cargando = input(false);
  readonly titulo = input('Descuentos iniciales (opcional)');
  readonly descripcion = input('Podés agregar más de uno.');
  readonly descuentoAgregado = output<AsignarDescuentoPayload>();
  readonly descuentoQuitado = output<string>();

  protected readonly descuentoUuid = signal('');
  protected readonly fechaDesde = signal(fechaLocalActual());
  protected readonly fechaHasta = signal('');
  protected readonly error = signal('');
  protected readonly opciones = computed<readonly SelectOption[]>(() => {
    const seleccionados = new Set(this.seleccionados().map((descuento) => descuento.descuentoUuid));
    return this.descuentos()
      .filter((descuento) => !seleccionados.has(descuento.descuentoUuid))
      .map((descuento) => opcionDescuento(descuento));
  });

  protected agregar(): void {
    const descuentoUuid = this.descuentoUuid().trim();
    const fechaDesde = this.fechaDesde();
    const fechaHasta = this.fechaHasta();
    if (!descuentoUuid || !fechaDesde) return this.mostrarError('Seleccioná un descuento y la fecha de inicio.');
    if (fechaHasta && fechaHasta < fechaDesde) return this.mostrarError('La fecha de fin no puede ser anterior a la de inicio.');

    this.descuentoAgregado.emit({ descuentoUuid, fechaDesde, fechaHasta: fechaHasta || null });
    this.descuentoUuid.set('');
    this.fechaDesde.set(fechaLocalActual());
    this.fechaHasta.set('');
    this.error.set('');
  }

  protected descripcionDescuento(descuento: AsignarDescuentoPayload): string {
    const titulo = this.descuentos().find((item) => item.descuentoUuid === descuento.descuentoUuid)?.titulo ?? 'Descuento';
    const vigencia = descuento.fechaHasta ? `${descuento.fechaDesde} al ${descuento.fechaHasta}` : `desde ${descuento.fechaDesde}, sin fecha de fin`;
    return `${titulo} · ${vigencia}`;
  }


  private mostrarError(mensaje: string): void { this.error.set(mensaje); }
}
