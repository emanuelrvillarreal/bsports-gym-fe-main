import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import {
  CuotaGrupoTitularDto,
  EstadoCuota,
} from '../../../../../core/api/interfaces/tesoreria.interfaces';
import { PortalSocioApiService } from '../../../../../core/api/services/portal-socio-api.service';
import { TesoreriaApiService } from '../../../../../core/api/services/tesoreria-api.service';
import { parsearFechaApi } from '../../../../../helpers/fecha-api';
import { formatearMoneda } from '../../../../../helpers/moneda-formato';
import { CardComponent } from '../../../../ui/card/card.component';
import { MercadoPagoCheckoutService } from '../../../../pagos/services/mercado-pago-checkout.service';
import { CheckoutMercadoPagoComponent } from '../../../../ui/checkout-mercado-pago/checkout-mercado-pago.component';
import {
  AccionTabla,
  ColumnaTabla,
  EventoAccionTabla,
  TablaResponsiveComponent,
} from '../../../../ui/tabla-responsive/tabla-responsive.component';

interface CuotaPortalFila {
  readonly cuotaUuid: string;
  readonly personaMemberUuid: string;
  readonly socio: string;
  readonly concepto: string;
  readonly tipo: string;
  readonly vencimiento: string;
  readonly monto: number;
  readonly montoFinal?: number | null;
  readonly estado: EstadoCuota;
}

interface CheckoutPortal {
  readonly enlace: string;
  readonly qr: string;
  readonly preferenceId: string;
  readonly resumen: string;
  readonly monto: string;
}

@Component({
  selector: 'app-cuotas-portal',
  standalone: true,
  imports: [CardComponent, CheckoutMercadoPagoComponent, TablaResponsiveComponent],
  templateUrl: './cuotas-portal.component.html',
  styleUrl: './cuotas-portal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CuotasPortalComponent {
  private readonly portalApi = inject(PortalSocioApiService);
  private readonly tesoreriaApi = inject(TesoreriaApiService);
  private readonly mercadoPagoCheckout = inject(MercadoPagoCheckoutService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly grupo = signal<CuotaGrupoTitularDto | null>(null);
  protected readonly cargando = signal(false);
  protected readonly error = signal('');
  protected readonly incluirFamiliares = signal(true);
  /** Incluye el mes actual; el portal admite consultar hasta doce meses. */
  protected readonly cantidadMeses = signal(6);
  protected readonly cuotaProcesandoUuid = signal<string | null>(null);
  protected readonly checkout = signal<CheckoutPortal | null>(null);
  protected readonly copiandoCheckout = signal(false);
  protected readonly mensajeCheckout = signal('');
  protected readonly errorCheckout = signal('');
  protected readonly cantidadMesesTexto = computed(() => {
    const cantidad = this.cantidadMeses();
    return `${cantidad} ${cantidad === 1 ? 'mes' : 'meses'}`;
  });
  protected readonly tituloPeriodo = computed(() =>
    this.cantidadMeses() === 1
      ? 'Mostrar el último mes'
      : `Mostrar los últimos ${this.cantidadMesesTexto()}`,
  );
  protected readonly progresoRango = computed(() => ((this.cantidadMeses() - 1) / 11) * 100);

  protected readonly columnas: readonly ColumnaTabla<CuotaPortalFila>[] = [
    { id: 'socio', titulo: 'Socio', ancho: 'minmax(11rem, 1.2fr)' },
    { id: 'concepto', titulo: 'Concepto', ancho: 'minmax(11rem, 1.5fr)' },
    { id: 'tipo', titulo: 'Tipo', ancho: '8rem' },
    { id: 'vencimiento', titulo: 'Vencimiento', tipo: 'fecha', ancho: '9rem' },
    { id: 'monto', titulo: 'Monto', tipo: 'moneda', ancho: '9rem' },
    { id: 'estado', titulo: 'Estado', tipo: 'estado', ancho: '8rem' },
  ];
  protected readonly acciones: readonly AccionTabla<CuotaPortalFila>[] = [
    {
      // Solo icono (el texto queda como tooltip y para lectores de pantalla): con dos botones con texto la columna
      // de acciones, que es fija a la derecha, se ensanchaba y tapaba los datos de la cuota.
      id: 'pagar-qr', texto: 'Ver QR de pago', icono: 'heroQrCode', color: 'var(--app-accent)', mostrarTexto: false,
      visible: (cuota) => this.puedePagarse(cuota.estado), deshabilitada: () => !!this.checkout(),
      cargando: (cuota) => cuota.cuotaUuid === this.cuotaProcesandoUuid(),
    },
    {
      id: 'pagar-directo', texto: 'Abrir Mercado Pago', icono: 'heroBanknotes', mostrarTexto: false,
      imagenIcono: 'assets/mercado pago/MP_RGB_HANDSHAKE_pluma-solo.svg', color: 'var(--app-accent)',
      visible: (cuota) => this.puedePagarse(cuota.estado),
      deshabilitada: () => !!this.checkout(),
      cargando: (cuota) => cuota.cuotaUuid === this.cuotaProcesandoUuid(),
    },
    {
      id: 'pagada',
      texto: 'Pago',
      icono: 'heroCheck',
      color: 'var(--semantic-success)',
      visible: (cuota) => cuota.estado === 'PAGADA',
      deshabilitada: true,
      descripcionDeshabilitada: 'Cuota pagada',
    },
  ];
  protected readonly filas = computed(() => {
    const grupo = this.grupo();
    if (!grupo) return [];

    const desde = this.obtenerMesDesde();
    return grupo.personas
      .filter(
        (persona) =>
          this.incluirFamiliares() || persona.personaMemberUuid === grupo.titularMemberUuid,
      )
      .flatMap((persona) =>
        persona.cuotas
          .filter((cuota) => this.estaDentroDelPeriodo(cuota.fechaGeneracion, desde))
          .map((cuota) => ({
            cuotaUuid: cuota.cuotaUuid,
            personaMemberUuid: persona.personaMemberUuid,
            socio: `${persona.nombre} ${persona.apellido}`.trim(),
            concepto: cuota.concepto,
            tipo: cuota.tipo,
            vencimiento: cuota.vencimiento,
            monto: cuota.monto,
            montoFinal: cuota.montoFinal,
            estado: cuota.estado,
          })),
      );
  });

  constructor() {
    this.cargarCuotas();
  }

  protected actualizarIncluirFamiliares(evento: Event): void {
    this.incluirFamiliares.set((evento.target as HTMLInputElement).checked);
  }

  protected montoFinalDifiere(cuota: CuotaPortalFila): boolean {
    return (
      typeof cuota.montoFinal === 'number' &&
      Number.isFinite(cuota.montoFinal) &&
      cuota.montoFinal !== cuota.monto
    );
  }

  protected formatearMonto(monto: number): string {
    return formatearMoneda(monto);
  }

  protected actualizarCantidadMeses(evento: Event): void {
    const cantidad = Number((evento.target as HTMLInputElement).value);
    const cantidadNormalizada = Math.min(12, Math.max(1, cantidad));
    if (cantidadNormalizada === this.cantidadMeses()) return;

    this.cantidadMeses.set(cantidadNormalizada);
    this.cargarCuotas();
  }

  protected manejarAccion(evento: EventoAccionTabla<CuotaPortalFila>): void {
    if (evento.accion === 'pagar-qr') this.iniciarPago(evento.fila, false);
    if (evento.accion === 'pagar-directo') this.iniciarPago(evento.fila, true);
  }

  private cargarCuotas(): void {
    this.cargando.set(true);
    this.error.set('');
    this.portalApi
      .listarCuotasGrupoFamiliar({ ultimosMeses: this.cantidadMeses() })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cargando.set(false)),
      )
      .subscribe({
        next: (grupo) => this.grupo.set(grupo),
        error: () => this.error.set('No se pudieron cargar las cuotas del grupo familiar.'),
      });
  }

  private iniciarPago(cuota: CuotaPortalFila, abrirDirecto: boolean): void {
    if (!this.puedePagarse(cuota.estado) || this.cuotaProcesandoUuid() || this.checkout()) return;

    this.error.set('');
    this.cuotaProcesandoUuid.set(cuota.cuotaUuid);
    this.tesoreriaApi
      .iniciarCobroMercadoPago({
        cuotaUuids: [cuota.cuotaUuid],
        canalCobro: 'MERCADO_PAGO',
        medioPago: 'MERCADO_PAGO',
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cuotaProcesandoUuid.set(null)),
      )
      .subscribe({
        next: async ({ mercadoPagoInitPoint, mercadoPagoPreferenceId }) => {
          const enlace = this.mercadoPagoCheckout.normalizarEnlace(mercadoPagoInitPoint);
          if (!enlace) {
            this.error.set('Mercado Pago no devolvió un destino de pago válido.');
            return;
          }

          if (abrirDirecto) {
            if (!this.mercadoPagoCheckout.abrirCheckout(enlace)) {
              this.error.set('El navegador bloqueó la nueva pestaña de Mercado Pago.');
            }
            return;
          }

          this.mensajeCheckout.set('');
          this.errorCheckout.set('');
          this.checkout.set({
            enlace,
            qr: '',
            preferenceId: mercadoPagoPreferenceId,
            resumen: cuota.concepto,
            monto: formatearMoneda(cuota.monto),
          });
          const qr = await this.mercadoPagoCheckout.generarQr(enlace);
          if (!this.checkout() || this.checkout()?.preferenceId !== mercadoPagoPreferenceId) return;
          if (!qr) {
            this.errorCheckout.set('No se pudo generar el QR. Podés copiar o abrir el enlace.');
            return;
          }
          this.checkout.update((actual) => (actual ? { ...actual, qr } : null));
        },
        error: (error) => this.error.set(this.mensajeErrorMercadoPago(error)),
      });
  }

  protected abrirCheckout(): void {
    const checkout = this.checkout();
    if (!checkout) return;
    this.mensajeCheckout.set('');
    this.errorCheckout.set('');
    if (!this.mercadoPagoCheckout.abrirCheckout(checkout.enlace)) {
      this.errorCheckout.set(
        'El navegador bloqueó la nueva pestaña. Copiá el enlace para continuar.',
      );
    }
  }

  protected async copiarEnlaceCheckout(): Promise<void> {
    const checkout = this.checkout();
    if (!checkout || this.copiandoCheckout()) return;
    this.copiandoCheckout.set(true);
    this.mensajeCheckout.set('');
    this.errorCheckout.set('');
    const copiado = await this.mercadoPagoCheckout.copiarEnlace(checkout.enlace);
    this.copiandoCheckout.set(false);
    if (copiado) {
      this.mensajeCheckout.set('Enlace copiado.');
    } else {
      this.errorCheckout.set('No se pudo copiar el enlace. Seleccionalo y copialo manualmente.');
    }
  }

  protected cerrarCheckout(): void {
    this.checkout.set(null);
    this.mensajeCheckout.set('');
    this.errorCheckout.set('');
    this.cargarCuotas();
  }

  private mensajeErrorMercadoPago(error: unknown): string {
    return (error as { readonly status?: number })?.status === 403
      ? 'No tenés permisos para pagar esta cuota con Mercado Pago.'
      : 'No se pudo iniciar el pago con Mercado Pago.';
  }

  private puedePagarse(estado: EstadoCuota): boolean {
    return estado === 'PENDIENTE' || estado === 'VENCIDA';
  }

  private obtenerMesDesde(): Date {
    const hoy = new Date();
    return new Date(hoy.getFullYear(), hoy.getMonth() - this.cantidadMeses() + 1, 1);
  }

  private estaDentroDelPeriodo(fechaGeneracion: string, desde: Date): boolean {
    const fecha = parsearFechaApi(fechaGeneracion);
    return !fecha || fecha >= desde;
  }
}
