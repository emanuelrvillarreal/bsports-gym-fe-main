import { ChangeDetectionStrategy, Component, OnDestroy, computed, effect, input, output, signal } from '@angular/core';

import {
  ConfiguracionMercadoPagoDto,
  GuardarConfiguracionMercadoPagoPayload,
} from '../../../../../core/api/interfaces/empresa.interfaces';
import { ValidacionFormularioDirective } from '../../../../ui/validacion-formulario/validacion-formulario.directive';

@Component({
  selector: 'app-formulario-mercado-pago',
  standalone: true,
  imports: [ValidacionFormularioDirective],
  templateUrl: './formulario-mercado-pago.component.html',
  styleUrl: './formulario-mercado-pago.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormularioMercadoPagoComponent implements OnDestroy {
  readonly configuracion = input<ConfiguracionMercadoPagoDto | null>(null);
  readonly enviado = output<GuardarConfiguracionMercadoPagoPayload>();

  protected readonly accessToken = signal('');
  protected readonly publicKey = signal('');
  protected readonly webhookSecret = signal('');
  protected readonly error = signal('');
  protected readonly requiereCargaCompleta = computed(() => {
    const configuracion = this.configuracion();
    return !configuracion?.accessTokenHint && !configuracion?.publicKeyHint && !configuracion?.webhookSecretHint;
  });

  constructor() {
    effect(() => {
      this.configuracion();
      this.limpiarSecretos();
    });
  }

  ngOnDestroy(): void {
    this.limpiarSecretos();
  }

  limpiarSecretos(): void {
    this.accessToken.set('');
    this.publicKey.set('');
    this.webhookSecret.set('');
    this.error.set('');
  }

  protected actualizarCampo(campo: 'accessToken' | 'publicKey' | 'webhookSecret', evento: Event): void {
    const valor = (evento.target as HTMLInputElement).value.slice(0, 512);
    if (campo === 'accessToken') this.accessToken.set(valor);
    if (campo === 'publicKey') this.publicKey.set(valor);
    if (campo === 'webhookSecret') this.webhookSecret.set(valor);
    this.error.set('');
  }

  protected enviar(): void {
    const accessToken = this.accessToken().trim();
    const publicKey = this.publicKey().trim();
    const webhookSecret = this.webhookSecret().trim();
    const valores = { accessToken, publicKey, webhookSecret };

    if (this.requiereCargaCompleta() && (!accessToken || !publicKey || !webhookSecret)) {
      this.error.set('Para la primera configuración ingresá las tres credenciales.');
      return;
    }

    if (!this.requiereCargaCompleta() && !accessToken && !publicKey && !webhookSecret) {
      this.error.set('Ingresá al menos una credencial para actualizarla.');
      return;
    }

    this.enviado.emit({
      ...(valores.accessToken ? { accessToken: valores.accessToken } : {}),
      ...(valores.publicKey ? { publicKey: valores.publicKey } : {}),
      ...(valores.webhookSecret ? { webhookSecret: valores.webhookSecret } : {}),
    });
  }
}
