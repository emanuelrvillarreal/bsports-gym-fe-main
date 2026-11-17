import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';

import {
  CanalCobroEventoAcceso,
  EventoAccesoCobroCommand,
  EventoAccesoCobroResultDto,
  EventoAccesoDetalleDto,
  MedioPagoEventoAccesoManual,
} from '../../../../core/api/interfaces/eventos-acceso.interfaces';
import { formatearMoneda } from '../../../../helpers/moneda-formato';
import { BotonComponent } from '../../../ui/boton/boton.component';
import { CheckoutMercadoPagoComponent } from '../../../ui/checkout-mercado-pago/checkout-mercado-pago.component';
import { PopupComponent } from '../../../ui/popup/popup.component';
import { SelectComponent, SelectOption } from '../../../ui/select/select.component';
import { TituloHeroComponent } from '../../../ui/titulo-hero/titulo-hero.component';
import { ValidacionFormularioDirective } from '../../../ui/validacion-formulario/validacion-formulario.directive';

export type ModoCobroEventoAcceso = 'socio' | 'invitado';

export interface EstadoOperacionCobroEventoAcceso {
  readonly guardando: boolean;
  readonly error: string;
  readonly resultado: EventoAccesoCobroResultDto | null;
}

const ESTADO_OPERACION_INICIAL: EstadoOperacionCobroEventoAcceso = {
  guardando: false,
  error: '',
  resultado: null,
};

@Component({
  selector: 'app-formulario-cobro-evento-acceso',
  standalone: true,
  imports: [
    BotonComponent,
    CheckoutMercadoPagoComponent,
    PopupComponent,
    SelectComponent,
    TituloHeroComponent,
    ValidacionFormularioDirective,
  ],
  templateUrl: './formulario-cobro-evento-acceso.component.html',
  styleUrl: './formulario-cobro-evento-acceso.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormularioCobroEventoAccesoComponent {
  readonly abierto = input(false);
  readonly evento = input.required<EventoAccesoDetalleDto>();
  readonly modo = input.required<ModoCobroEventoAcceso>();
  readonly userUuid = input<string | null>(null);
  readonly montoUnitario = input.required<number>();
  readonly estadoOperacion = input<EstadoOperacionCobroEventoAcceso>(ESTADO_OPERACION_INICIAL);
  readonly cerrar = output<void>();
  readonly solicitudCobro = output<EventoAccesoCobroCommand>();

  protected readonly cantidadEntradas = signal(1);
  protected readonly canalCobro = signal<CanalCobroEventoAcceso>('MANUAL');
  protected readonly medioPago = signal<MedioPagoEventoAccesoManual>('EFECTIVO');
  protected readonly observaciones = signal('');
  protected readonly nombreInvitado = signal('');
  protected readonly intentoEnvio = signal(false);
  protected readonly errorFormulario = signal('');
  protected readonly checkoutAbierto = signal(false);
  protected readonly opcionesCanal: readonly SelectOption[] = [
    { value: 'MANUAL', label: 'Cobro manual' },
    { value: 'MERCADO_PAGO', label: 'Mercado Pago' },
  ];
  protected readonly opcionesMedio: readonly SelectOption[] = [
    { value: 'EFECTIVO', label: 'Efectivo' },
    { value: 'TRANSFERENCIA', label: 'Transferencia' },
    { value: 'OTRO', label: 'Otro' },
  ];

  protected readonly titulo = computed(() =>
    this.modo() === 'socio' ? 'Cobrar entrada al socio' : 'Registrar invitado',
  );
  protected readonly cantidadValida = computed(() => {
    const cantidad = Number(this.cantidadEntradas());
    return Number.isInteger(cantidad) && cantidad > 0;
  });
  protected readonly nombreInvitadoValido = computed(
    () => this.modo() !== 'invitado' || this.nombreInvitado().trim().length > 0,
  );
  protected readonly formularioInvalido = computed(
    () => !this.cantidadValida() || !this.nombreInvitadoValido(),
  );
  protected readonly total = computed(() => {
    const cantidad = this.cantidadValida() ? Number(this.cantidadEntradas()) : 0;
    return Number(this.montoUnitario()) * cantidad;
  });
  protected readonly totalFormateado = computed(() => formatearMoneda(this.total()));
  protected readonly montoEventoFormateado = computed(() => formatearMoneda(this.montoUnitario()));
  protected readonly resultado = computed(() => this.estadoOperacion().resultado);
  protected readonly guardando = computed(() => this.estadoOperacion().guardando);
  protected readonly qrNormalizado = computed(() => this.normalizarQr(this.resultado()?.qr));
  protected readonly pagoPendienteSinQr = computed(
    () => this.resultado()?.resultado === 'DEBE_PAGAR' && !this.qrNormalizado(),
  );
  protected readonly resumenCheckout = computed(
    () => `${this.resultado()?.cantidadEntradas ?? 1} entrada(s) · ${this.evento().titulo}`,
  );
  protected readonly montoCheckout = computed(() => {
    const monto = this.resultado()?.monto;
    return typeof monto === 'number' ? formatearMoneda(monto) : '';
  });

  constructor() {
    effect(() => {
      if (!this.abierto()) return;
      this.evento().uuid;
      this.modo();
      this.userUuid();
      this.montoUnitario();
      this.cantidadEntradas.set(1);
      this.canalCobro.set('MANUAL');
      this.medioPago.set('EFECTIVO');
      this.observaciones.set('');
      this.nombreInvitado.set('');
      this.intentoEnvio.set(false);
      this.errorFormulario.set('');
      this.checkoutAbierto.set(false);
    });

    effect(() => {
      const resultado = this.resultado();
      if (!this.abierto() || !resultado) return;
      this.checkoutAbierto.set(resultado.resultado === 'DEBE_PAGAR' && !!this.qrNormalizado());
    });
  }

  protected cambiarCanal(canal: string): void {
    this.canalCobro.set(canal as CanalCobroEventoAcceso);
    this.errorFormulario.set('');
  }

  protected cambiarMedio(medio: string): void {
    this.medioPago.set(medio as MedioPagoEventoAccesoManual);
  }

  protected guardar(): void {
    if (this.guardando() || this.resultado()) return;

    this.intentoEnvio.set(true);
    this.errorFormulario.set('');
    if (this.formularioInvalido()) return;

    const cantidadEntradas = Number(this.cantidadEntradas());
    const payloadCobro =
      this.canalCobro() === 'MANUAL'
        ? {
            canalCobro: 'MANUAL' as const,
            cantidadEntradas,
            medioPago: this.medioPago(),
            observaciones: this.observaciones().trim() || null,
          }
        : {
            canalCobro: 'MERCADO_PAGO' as const,
            cantidadEntradas,
          };

    if (this.modo() === 'socio') {
      const userUuid = this.userUuid()?.trim();
      if (!userUuid) {
        this.errorFormulario.set('No se pudo identificar al socio para registrar el cobro.');
        return;
      }
      this.solicitudCobro.emit({
        tipo: 'SOCIO',
        payload: { ...payloadCobro, userUuid },
      });
      return;
    }

    this.solicitudCobro.emit({
      tipo: 'INVITADO',
      payload: { ...payloadCobro, nombre: this.nombreInvitado().trim() },
    });
  }

  protected solicitarCierre(): void {
    if (!this.guardando() && !this.checkoutAbierto()) this.cerrar.emit();
  }

  protected cerrarCheckout(): void {
    this.checkoutAbierto.set(false);
  }

  protected reabrirCheckout(): void {
    if (this.qrNormalizado()) this.checkoutAbierto.set(true);
  }

  private normalizarQr(qr: string | null | undefined): string {
    const valor = qr?.trim() ?? '';
    if (!valor || valor.startsWith('data:')) return valor;
    return `data:image/png;base64,${valor}`;
  }
}
