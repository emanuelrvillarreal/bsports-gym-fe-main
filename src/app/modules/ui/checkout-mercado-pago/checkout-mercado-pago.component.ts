import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { BotonComponent } from '../boton/boton.component';
import { LoadSpinnerBlueComponent } from '../load-spinner-blue/load-spinner-blue.component';
import { PopupComponent } from '../popup/popup.component';
import { TituloHeroComponent } from '../titulo-hero/titulo-hero.component';

@Component({
  selector: 'app-checkout-mercado-pago',
  standalone: true,
  imports: [BotonComponent, LoadSpinnerBlueComponent, PopupComponent, TituloHeroComponent],
  templateUrl: './checkout-mercado-pago.component.html',
  styleUrl: './checkout-mercado-pago.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutMercadoPagoComponent {
  readonly abierto = input(false);
  readonly enlace = input('');
  /** Oculta el enlace y su copia, manteniendo disponible la apertura directa. */
  readonly mostrarEnlace = input(true);
  /** Ubica la acción de apertura debajo del QR en lugar del footer del popup. */
  readonly abrirDebajoQr = input(false);
  readonly qr = input('');
  readonly resumen = input('Pago de cuotas');
  readonly monto = input('');
  readonly subtitulo = input(
    'La cuota se confirmará cuando Mercado Pago notifique el pago.',
  );
  readonly mensaje = input('');
  readonly mensajeError = input('');
  readonly copiando = input(false);

  readonly abrirCheckout = output<void>();
  readonly copiarEnlace = output<void>();
  readonly cerrar = output<void>();

  protected readonly tieneEnlace = computed(() => !!this.enlace().trim());
}
