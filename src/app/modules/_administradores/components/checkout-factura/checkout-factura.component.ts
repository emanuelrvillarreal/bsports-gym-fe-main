import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import { FacturaDto } from '../../../../core/api/interfaces/facturas.interfaces';
import { FacturasApiService } from '../../../../core/api/services/facturas-api.service';
import { AuthSessionService } from '../../../../core/global-services/services/auth-session.service';
import { formatearMoneda } from '../../../../helpers/moneda-formato';
import { MercadoPagoCheckoutService } from '../../../pagos/services/mercado-pago-checkout.service';
import { BotonComponent } from '../../../ui/boton/boton.component';
import { CheckoutMercadoPagoComponent } from '../../../ui/checkout-mercado-pago/checkout-mercado-pago.component';
import { LoadSpinnerBlueComponent } from '../../../ui/load-spinner-blue/load-spinner-blue.component';
import { PopupComponent } from '../../../ui/popup/popup.component';

interface CheckoutFactura {
  readonly enlace: string;
  readonly qr: string;
  readonly id: string;
}

@Component({
  selector: 'app-checkout-factura',
  standalone: true,
  imports: [BotonComponent, CheckoutMercadoPagoComponent, LoadSpinnerBlueComponent, PopupComponent],
  templateUrl: './checkout-factura.component.html',
  styleUrl: './checkout-factura.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutFacturaComponent {
  private readonly api = inject(FacturasApiService);
  private readonly sesion = inject(AuthSessionService);
  private readonly mercadoPago = inject(MercadoPagoCheckoutService);
  private readonly destroyRef = inject(DestroyRef);
  private facturaProcesadaUuid = '';

  readonly factura = input<FacturaDto | null>(null);
  readonly cerrar = output<void>();
  readonly pagoGenerado = output<void>();

  protected readonly preparando = signal(false);
  protected readonly error = signal('');
  protected readonly checkout = signal<CheckoutFactura | null>(null);
  protected readonly copiando = signal(false);
  protected readonly mensaje = signal('');

  constructor() {
    effect(() => {
      const factura = this.factura();
      if (!factura) {
        this.facturaProcesadaUuid = '';
        this.checkout.set(null);
        this.error.set('');
        return;
      }

      if (factura.facturaUuid === this.facturaProcesadaUuid) return;
      this.facturaProcesadaUuid = factura.facturaUuid;
      this.generar(factura);
    });
  }

  protected reintentar(): void {
    const factura = this.factura();
    if (!factura || this.preparando()) return;
    this.generar(factura);
  }

  protected abrirCheckout(): void {
    const checkout = this.checkout();
    if (!checkout) return;
    this.mensaje.set('');
    this.error.set('');
    if (!this.mercadoPago.abrirCheckout(checkout.enlace)) {
      this.error.set('El navegador bloqueó la nueva pestaña. Copiá el enlace para continuar.');
    }
  }

  protected async copiarEnlace(): Promise<void> {
    const checkout = this.checkout();
    if (!checkout || this.copiando()) return;
    this.copiando.set(true);
    this.mensaje.set('');
    this.error.set('');
    const copiado = await this.mercadoPago.copiarEnlace(checkout.enlace);
    this.copiando.set(false);
    if (copiado) this.mensaje.set('Enlace copiado.');
    else this.error.set('No se pudo copiar el enlace. Seleccionalo y copialo manualmente.');
  }

  private generar(factura: FacturaDto): void {
    this.preparando.set(true);
    this.error.set('');
    this.checkout.set(null);
    const ahora = new Date();
    const fechaPago = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;
    const nombreClub = this.sesion.companyName().trim() || 'club';

    this.api
      .generarPago({
        facturasUuid: [factura.facturaUuid],
        referencia: `factura-${nombreClub}`,
        fechaPago,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.preparando.set(false)),
      )
      .subscribe({
        next: async (respuesta) => {
          const enlace = this.mercadoPago.normalizarEnlace(respuesta.init_point);
          if (!enlace) {
            this.error.set('Mercado Pago no devolvió un destino de pago válido.');
            return;
          }
          this.checkout.set({ enlace, qr: '', id: respuesta.id });
          this.pagoGenerado.emit();
          const qr = await this.mercadoPago.generarQr(enlace);
          if (this.checkout()?.id === respuesta.id && qr) {
            this.checkout.update((actual) => (actual ? { ...actual, qr } : null));
          } else if (this.checkout()?.id === respuesta.id) {
            this.error.set('No se pudo generar el QR. Podés copiar o abrir el enlace.');
          }
        },
        error: () => this.error.set('No se pudo iniciar el pago. Podés reintentar sin perder la factura.'),
      });
  }

  protected formatearImporte(factura: FacturaDto): string {
    return factura.importe === null ? '' : formatearMoneda(factura.importe);
  }
}
