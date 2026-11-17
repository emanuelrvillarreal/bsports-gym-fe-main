import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroChatBubbleLeftRight, heroEnvelope } from '@ng-icons/heroicons/outline';

import { formatearTelefono, limpiarTelefono } from '../../../../../helpers/telefono-formato';
import { BotonComponent } from '../../../../ui/boton/boton.component';
import { ValidacionFormularioDirective } from '../../../../ui/validacion-formulario/validacion-formulario.directive';

export type CanalNotificacionMora = 'EMAIL' | 'WHATSAPP';

export interface CuotaNotificacionMora {
  readonly titular: string;
  readonly titularEmail?: string | null;
  readonly titularTelefono?: string | null;
  readonly concepto: string;
  readonly monto: string;
  readonly vencimiento: string;
}

export interface ContactoEmpresaNotificacion {
  readonly nombre: string;
  readonly direccion?: string | null;
  readonly email?: string | null;
  readonly telefono?: string | null;
}

export interface NotificacionMoraPayload {
  readonly canal: CanalNotificacionMora;
  readonly destinatario: string;
  readonly asunto: string;
  readonly mensaje: string;
}

@Component({
  selector: 'app-formulario-notificacion-mora',
  imports: [BotonComponent, NgIcon, ValidacionFormularioDirective],
  providers: [provideIcons({ heroChatBubbleLeftRight, heroEnvelope })],
  templateUrl: './formulario-notificacion-mora.component.html',
  styleUrl: './formulario-notificacion-mora.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormularioNotificacionMoraComponent {
  readonly cuota = input.required<CuotaNotificacionMora>();
  readonly empresa = input.required<ContactoEmpresaNotificacion>();
  readonly enviado = output<NotificacionMoraPayload>();

  protected readonly canal = signal<CanalNotificacionMora>('WHATSAPP');
  protected readonly email = signal('');
  protected readonly telefono = signal('');
  protected readonly asunto = signal('');
  protected readonly mensaje = signal('');
  protected readonly error = signal('');
  protected readonly cantidadCaracteresMensaje = computed(() => this.mensaje().length);
  protected readonly maximoCaracteresMensaje = 700;

  constructor() {
    effect(() => {
      const cuota = this.cuota();
      const empresa = this.empresa();
      this.email.set(cuota.titularEmail?.trim() ?? '');
      this.telefono.set(formatearTelefono(cuota.titularTelefono?.trim() ?? ''));
      this.asunto.set(`Recordatorio de cuota vencida - ${cuota.concepto}`);
      this.mensaje.set(this.crearMensajePredeterminado(cuota, empresa));
      this.error.set('');
    });
  }

  protected cambiarCanal(canal: CanalNotificacionMora): void {
    this.canal.set(canal);
    this.error.set('');
  }

  protected actualizarAsunto(evento: Event): void {
    this.asunto.set((evento.target as HTMLInputElement).value);
  }

  protected actualizarMensaje(evento: Event): void {
    this.mensaje.set((evento.target as HTMLTextAreaElement).value.slice(0, this.maximoCaracteresMensaje));
  }

  protected enviar(): void {
    const asunto = this.asunto().trim();
    const mensaje = this.mensaje().trim();
    if (!asunto || !mensaje) {
      this.error.set('Completá el asunto y el mensaje antes de continuar.');
      return;
    }

    if (this.canal() === 'EMAIL') {
      const email = this.email().trim().toLowerCase();
      if (!this.esEmailValido(email)) {
        this.error.set('Ingresá un correo electrónico válido.');
        return;
      }
      this.error.set('');
      this.enviado.emit({ canal: 'EMAIL', destinatario: email, asunto, mensaje });
      return;
    }

    const telefono = this.normalizarTelefonoWhatsapp(this.telefono());
    if (!telefono) {
      this.error.set('Ingresá un teléfono argentino válido para WhatsApp.');
      return;
    }
    this.error.set('');
    this.enviado.emit({ canal: 'WHATSAPP', destinatario: telefono, asunto, mensaje });
  }

  private crearMensajePredeterminado(
    cuota: CuotaNotificacionMora,
    empresa: ContactoEmpresaNotificacion,
  ): string {
    const datosContacto = [
      empresa.direccion?.trim() ? `Dirección: ${empresa.direccion.trim()}` : '',
      empresa.telefono?.trim() ? `Teléfono: ${empresa.telefono.trim()}` : '',
      empresa.email?.trim() ? `Correo: ${empresa.email.trim()}` : '',
    ]
      .filter((valor): valor is string => Boolean(valor))
      .join('\n');

    const lineas = [
      `Hola, somos ${empresa.nombre}.`,
      '',
      `Te recordamos que la cuota "${cuota.concepto}" por ${cuota.monto}, con vencimiento ${cuota.vencimiento}, se encuentra vencida.`,
      'Por favor, comunicate con el gimnasio para regularizarla.',
      'También podés pagar desde el portal del socio mediante Mercado Pago.',
      '',
      `Atentamente: ${empresa.nombre}.`,
      ...(datosContacto ? [datosContacto] : []),
    ];

    return lineas.join('\n');
  }

  private esEmailValido(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private normalizarTelefonoWhatsapp(valor: string): string | null {
    const limpio = limpiarTelefono(valor);
    const conCodigoPais = limpio.startsWith('549') ? limpio : `549${limpio.replace(/^0/, '')}`;
    return /^549\d{10,11}$/.test(conCodigoPais) ? conCodigoPais : null;
  }
}
