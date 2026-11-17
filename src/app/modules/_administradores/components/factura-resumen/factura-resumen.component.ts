import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { FacturaDto } from '../../../../core/api/interfaces/facturas.interfaces';
import { formatearMoneda } from '../../../../helpers/moneda-formato';

@Component({
  selector: 'app-factura-resumen',
  standalone: true,
  imports: [],
  templateUrl: './factura-resumen.component.html',
  styleUrl: './factura-resumen.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacturaResumenComponent {
  readonly factura = input.required<FacturaDto>();

  protected readonly importe = computed(() => {
    const importe = this.factura().importe;
    return importe === null ? '—' : formatearMoneda(importe);
  });

  protected readonly plan = computed(() => this.factura().codigoPlan?.trim() || 'Sin plan asociado');
  protected readonly productos = computed(() => this.factura().codigosProductos ?? []);
}
