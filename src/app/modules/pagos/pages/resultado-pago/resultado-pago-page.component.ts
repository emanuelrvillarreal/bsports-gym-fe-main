import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, switchMap, throwError } from 'rxjs';
import { PagoDetalleDto } from '../../../../core/api/interfaces/pagos.interfaces';
import { PagosApiService } from '../../../../core/api/services/pagos-api.service';
import { AuthService } from '../../../../core/global-services/services/auth.service';
import { formatearMoneda } from '../../../../helpers/moneda-formato';
import { BotonComponent } from '../../../ui/boton/boton.component';
import { LoadSpinnerBlueComponent } from '../../../ui/load-spinner-blue/load-spinner-blue.component';
import { PerformanceModeService } from '../../../ui/performance-mode.service';
import { PagoResultadoService } from '../../services/pago-resultado.service';

export type EstadoResultadoPago = 'exito' | 'error';

@Component({
  selector: 'app-resultado-pago-page',
  standalone: true,
  imports: [BotonComponent, LoadSpinnerBlueComponent],
  templateUrl: './resultado-pago-page.component.html',
  styleUrl: './resultado-pago-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResultadoPagoPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly pagoResultadoService = inject(PagoResultadoService);
  private readonly pagosApiService = inject(PagosApiService);
  private readonly authService = inject(AuthService);
  private readonly performanceModeService = inject(PerformanceModeService);
  private readonly destinoRegreso = this.obtenerDestinoRegreso();

  private readonly datosRuta = toSignal(this.route.data, {
    initialValue: this.route.snapshot.data,
  });
  private readonly parametros = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  protected readonly estado = computed<EstadoResultadoPago>(() =>
    this.datosRuta()['estadoResultado'] === 'exito' ? 'exito' : 'error',
  );
  protected readonly esExito = computed(() => this.estado() === 'exito');
  protected readonly altoRendimiento = computed(() => !this.performanceModeService.desactivado());
  protected readonly cargandoComprobante = signal(false);
  protected readonly pago = signal<PagoDetalleDto | null>(null);
  protected readonly errorComprobante = signal('');
  protected readonly formatearMoneda = formatearMoneda;
  protected readonly detallePago = computed(() => {
    const pago = this.pago();
    const detalleItem = pago?.items
      .map((item) => item.detalle?.trim() ?? '')
      .find((detalle) => detalle.length > 0);

    return detalleItem || pago?.detalle?.trim() || '';
  });
  protected readonly comprobanteDisponible = computed(() => {
    const pago = this.pago();
    return pago?.estado === 'APROBADO' && pago.paymentId !== null && pago.paymentId !== undefined;
  });
  protected readonly titulo = computed(() =>
    this.esExito() ? 'Pago realizado con éxito' : 'No pudimos procesar el pago',
  );
  protected readonly descripcion = computed(() =>
    this.esExito()
      ? 'Tu pago fue procesado correctamente.'
      : 'Intentá nuevamente o regresá para revisar el estado.',
  );
  protected readonly textoBotonRegreso = this.destinoRegreso.texto;

  constructor() {
    effect((alLimpiar) => {
      const referenciaExterna = this.parametros().get('external_reference')?.trim();

      if (referenciaExterna) {
        this.pagoResultadoService.guardarReferenciaExterna(referenciaExterna);
      }

      this.pago.set(null);
      this.errorComprobante.set('');

      if (!this.esExito()) {
        return;
      }

      if (!referenciaExterna) {
        this.errorComprobante.set(
          'No recibimos la referencia necesaria para consultar el comprobante.',
        );
        return;
      }

      this.cargandoComprobante.set(true);
      const suscripcion = this.authService
        .rehidratarSesion()
        .pipe(
          switchMap((sesionActiva) =>
            sesionActiva
              ? this.pagosApiService.obtenerPorReferenciaExterna(referenciaExterna)
              : throwError(() => new Error('No se pudo rehidratar la sesion.')),
          ),
        )
        .pipe(finalize(() => this.cargandoComprobante.set(false)))
        .subscribe({
          next: (pago) => this.pago.set(pago),
          error: () =>
            this.errorComprobante.set(
              'No pudimos cargar los datos del comprobante. Podés revisarlos más tarde desde el sistema.',
            ),
        });

      alLimpiar(() => suscripcion.unsubscribe());
    });
  }

  protected volver(): void {
    void this.router.navigateByUrl(this.destinoRegreso.ruta);
  }

  private obtenerDestinoRegreso(): { ruta: string; texto: string } {
    switch (this.authService.obtenerRolUsuario()) {
      case 'ADMIN':
        return { ruta: '/admin/tesoreria/ingresos', texto: 'Volver a ingresos' };
      case 'ADM_RECEPCION':
        return { ruta: '/adm-recepcion/tesoreria/ingresos', texto: 'Volver a ingresos' };
      case 'SOCIO_TITULAR':
      default:
        return { ruta: '/socio-titular/cuotas', texto: 'Volver a mis cuotas' };
    }
  }
}
