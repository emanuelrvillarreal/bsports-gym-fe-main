import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { provideIcons } from '@ng-icons/core';
import { heroBanknotes, heroCheckCircle } from '@ng-icons/heroicons/outline';
import { finalize } from 'rxjs';

import {
  FacturaDto,
  FacturaEstado,
} from '../../../../../core/api/interfaces/facturas.interfaces';
import { FacturasApiService } from '../../../../../core/api/services/facturas-api.service';
import { formatearMoneda } from '../../../../../helpers/moneda-formato';
import { CheckoutFacturaComponent } from '../../../components/checkout-factura/checkout-factura.component';
import { FacturaResumenComponent } from '../../../components/factura-resumen/factura-resumen.component';
import { BotonComponent } from '../../../../ui/boton/boton.component';
import { CardComponent } from '../../../../ui/card/card.component';
import { PaginacionComponent } from '../../../../ui/paginacion/paginacion.component';
import { PopupComponent } from '../../../../ui/popup/popup.component';
import { SelectComponent, SelectOption } from '../../../../ui/select/select.component';
import { TituloHeroComponent } from '../../../../ui/titulo-hero/titulo-hero.component';
import {
  AccionTabla,
  ColumnaTabla,
  EventoAccionTabla,
  TablaResponsiveComponent,
} from '../../../../ui/tabla-responsive/tabla-responsive.component';

type FacturaFila = FacturaDto & {
  readonly concepto: string;
  readonly importeVisible: string;
};

@Component({
  selector: 'app-gestion-facturas',
  standalone: true,
  imports: [
    BotonComponent,
    CardComponent,
    CheckoutFacturaComponent,
    FacturaResumenComponent,
    PaginacionComponent,
    PopupComponent,
    SelectComponent,
    TablaResponsiveComponent,
    TituloHeroComponent,
  ],
  providers: [provideIcons({ heroBanknotes, heroCheckCircle })],
  templateUrl: './gestion-facturas.component.html',
  styleUrl: './gestion-facturas.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GestionFacturasComponent {
  private readonly api = inject(FacturasApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly facturas = signal<readonly FacturaFila[]>([]);
  protected readonly pagina = signal(1);
  protected readonly totalPaginas = signal(1);
  protected readonly totalElementos = signal(0);
  protected readonly estado = signal<FacturaEstado | ''>('');
  protected readonly cargando = signal(false);
  protected readonly error = signal('');
  protected readonly facturaDetalle = signal<FacturaDto | null>(null);
  protected readonly facturaPago = signal<FacturaDto | null>(null);
  protected readonly accionDetalleCargando = signal<'pagar' | 'cerrar' | null>(null);
  protected readonly tamanoPagina = 15;

  protected readonly opcionesEstado: readonly SelectOption[] = [
    { value: '', label: 'Todos los estados' },
    { value: 'PENDIENTE', label: 'Pendientes' },
    { value: 'VENCIDA', label: 'Vencidas' },
    { value: 'PAGADA', label: 'Pagadas' },
  ];

  protected readonly columnas: readonly ColumnaTabla<FacturaFila>[] = [
    { id: 'concepto', titulo: 'Plan / productos', tipo: 'texto' },
    { id: 'importeVisible', titulo: 'Importe', tipo: 'texto' },
    { id: 'fechaGeneracion', titulo: 'Generación', tipo: 'fecha' },
    { id: 'fechaVencimiento', titulo: 'Vencimiento', tipo: 'fecha' },
    { id: 'estado', titulo: 'Estado', tipo: 'estado' },
  ];

  protected readonly acciones: readonly AccionTabla<FacturaFila>[] = [
    'ver',
    {
      id: 'pagar',
      texto: 'Pagar',
      icono: 'heroBanknotes',
      color: 'var(--app-accent)',
      visible: (factura) => factura.estado === 'PENDIENTE' || factura.estado === 'VENCIDA',
    },
    {
      id: 'pagada',
      texto: 'Pago',
      icono: 'heroCheckCircle',
      color: 'var(--app-success)',
      visible: (factura) => factura.estado === 'PAGADA',
      deshabilitada: true,
      descripcionDeshabilitada: 'Pago',
    },
  ];

  constructor() {
    this.cargar();
  }

  protected cambiarEstado(valor: string): void {
    this.estado.set(valor as FacturaEstado | '');
    this.pagina.set(1);
    this.cargar();
  }

  protected cambiarPagina(pagina: number): void {
    this.pagina.set(pagina);
    this.cargar();
  }

  protected manejarAccion(evento: EventoAccionTabla<FacturaFila>): void {
    if (evento.accion === 'ver') this.facturaDetalle.set(evento.fila);
    if (evento.accion === 'pagar') this.facturaPago.set(evento.fila);
  }

  protected cerrarDetalle(): void {
    if (this.accionDetalleCargando()) return;
    this.accionDetalleCargando.set('cerrar');
    window.setTimeout(() => {
      this.facturaDetalle.set(null);
      this.accionDetalleCargando.set(null);
    }, 180);
  }

  protected pagarDesdeDetalle(factura: FacturaDto): void {
    if (this.accionDetalleCargando()) return;
    this.accionDetalleCargando.set('pagar');
    window.setTimeout(() => {
      this.facturaDetalle.set(null);
      this.facturaPago.set(factura);
      this.accionDetalleCargando.set(null);
    }, 180);
  }

  protected cerrarCheckout(): void {
    this.facturaPago.set(null);
    this.cargar();
  }

  protected cargar(): void {
    if (this.cargando()) return;
    this.cargando.set(true);
    this.error.set('');
    this.api
      .paginar({
        page: this.pagina(),
        size: this.tamanoPagina,
        ...(this.estado() ? { estados: [this.estado() as FacturaEstado] } : {}),
        orden: 'FECHA_VENCIMIENTO_DESC',
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cargando.set(false)),
      )
      .subscribe({
        next: (respuesta) => {
          this.facturas.set(respuesta.content.map((factura) => this.crearFila(factura)));
          this.totalPaginas.set(Math.max(1, respuesta.totalPages));
          this.totalElementos.set(respuesta.totalElements);
          if (this.pagina() > Math.max(1, respuesta.totalPages)) {
            this.pagina.set(Math.max(1, respuesta.totalPages));
          }
        },
        error: () => this.error.set('No se pudieron cargar las facturas. Intentá nuevamente.'),
      });
  }

  private crearFila(factura: FacturaDto): FacturaFila {
    const conceptos = [factura.codigoPlan, ...(factura.codigosProductos ?? [])]
      .map((valor) => valor?.trim())
      .filter((valor): valor is string => !!valor);
    return {
      ...factura,
      concepto: conceptos.join(', ') || 'Sin detalle de plan o productos',
      importeVisible: factura.importe === null ? '—' : formatearMoneda(factura.importe),
    };
  }
}
