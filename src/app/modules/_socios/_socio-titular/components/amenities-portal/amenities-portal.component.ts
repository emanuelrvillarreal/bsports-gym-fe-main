import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, OnDestroy, PLATFORM_ID, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgIcon } from '@ng-icons/core';
import { finalize } from 'rxjs';

import { AmenityDto, ReintentarPagoReservaAmenityPortalCommand, ReservaAmenityCobroResultDto, ReservaAmenityDto, ReservarAmenityPortalCommand } from '../../../../../core/api/interfaces/amenities.interfaces';
import { PortalSocioApiService } from '../../../../../core/api/services/portal-socio-api.service';
import { AuthSessionService } from '../../../../../core/global-services/services/auth-session.service';
import { parsearFechaApi } from '../../../../../helpers/fecha-api';
import { formatearMoneda } from '../../../../../helpers/moneda-formato';
import { BotonComponent } from '../../../../ui/boton/boton.component';
import { CardComponent } from '../../../../ui/card/card.component';
import { LoadSpinnerBlueComponent } from '../../../../ui/load-spinner-blue/load-spinner-blue.component';
import { PaginacionComponent } from '../../../../ui/paginacion/paginacion.component';
import { PopupComponent } from '../../../../ui/popup/popup.component';
import { SelectComponent, SelectOption } from '../../../../ui/select/select.component';
import { AccionTabla, ColumnaTabla, EventoAccionTabla, TablaResponsiveComponent } from '../../../../ui/tabla-responsive/tabla-responsive.component';
import { ToastAlertService } from '../../../../ui/toast-alert/services/toast-alert.service';
import { TituloHeroComponent } from '../../../../ui/titulo-hero/titulo-hero.component';
import { MercadoPagoCheckoutService } from '../../../../pagos/services/mercado-pago-checkout.service';
import { FormularioReservaAmenityComponent } from '../../forms/formulario-reserva-amenity/formulario-reserva-amenity.component';

interface AmenityPortalFila { readonly amenityUuid: string; readonly nombre: string; readonly tarifa: readonly string[]; readonly senia: readonly string[]; readonly horario: string; readonly diasDisponibles: readonly string[]; }
interface ReservaAmenityPortalFila {
  readonly reservaUuid: string;
  readonly amenityUuid: string;
  readonly fechaDesde: string;
  readonly fechaHasta: string;
  readonly amenity: string;
  readonly fecha: string;
  readonly horario: string;
  readonly vencimientoSena: string;
  readonly estado: string;
  readonly montoTotal: number;
  readonly montoSena: number;
  readonly saldoPendiente: number;
  /** Valor visual: se presenta negativo mientras exista saldo por cancelar. */
  readonly saldoPendienteMostrar: number;
}
interface CheckoutAmenity { readonly reservaUuid: string; readonly monto: number; readonly concepto: string; readonly qr: string; }
interface PagoQrAmenity { readonly reserva: ReservaAmenityPortalFila; readonly tipoPago: 'SENA' | 'TOTAL' | null; }

const RESERVAS_POR_PAGINA = 50;
const DIAS_SEMANA_COMPLETOS = new Set(['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO']);
const OPCIONES_TIPO_PAGO: readonly SelectOption[] = [
  { value: 'SENA', label: 'Seña' },
  { value: 'TOTAL', label: 'Total' },
];

@Component({
  selector: 'app-amenities-portal', standalone: true,
  imports: [BotonComponent, CardComponent, FormularioReservaAmenityComponent, LoadSpinnerBlueComponent, NgIcon, PaginacionComponent, PopupComponent, SelectComponent, TablaResponsiveComponent, TituloHeroComponent],
  templateUrl: './amenities-portal.component.html', styleUrl: './amenities-portal.component.scss', changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AmenitiesPortalComponent implements OnDestroy {
  private readonly portalApi = inject(PortalSocioApiService);
  private readonly authSession = inject(AuthSessionService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(ToastAlertService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly mercadoPagoCheckout = inject(MercadoPagoCheckoutService);
  private pollingId: ReturnType<typeof setInterval> | null = null;
  protected readonly mostrarReservas = this.authSession.obtenerRolActivo() === 'SOCIO_TITULAR';
  protected readonly amenities = signal<readonly AmenityPortalFila[]>([]);
  protected readonly amenitiesDisponibles = signal<readonly AmenityDto[]>([]);
  protected readonly cargando = signal(false);
  protected readonly error = signal('');
  protected readonly reservas = signal<readonly ReservaAmenityPortalFila[]>([]);
  protected readonly paginaReservas = signal(1);
  protected readonly totalPaginasReservas = signal(1);
  protected readonly cargandoReservas = signal(false);
  protected readonly errorReservas = signal('');
  protected readonly amenityAReservar = signal<AmenityDto | null>(null);
  protected readonly procesandoReserva = signal(false);
  protected readonly pagoQr = signal<PagoQrAmenity | null>(null);
  protected readonly checkoutQr = signal<CheckoutAmenity | null>(null);
  protected readonly cargandoQr = signal(false);
  protected readonly reservaPagandoUuid = signal<string | null>(null);
  protected readonly opcionesTipoPago = OPCIONES_TIPO_PAGO;
  protected readonly columnas: readonly ColumnaTabla<AmenityPortalFila>[] = [
    { id: 'nombre', titulo: 'Amenity' },
    { id: 'tarifa', titulo: 'Monto/hora', tipo: 'chips', chipClase: (item) => item === 'Gratis' ? 'tabla-responsive__chip--success' : null },
    { id: 'senia', titulo: 'Seña', tipo: 'chips', chipClase: (item) => item === 'Gratis' ? 'tabla-responsive__chip--success' : null },
    { id: 'horario', titulo: 'Horario', tipo: 'horario' }, { id: 'diasDisponibles', titulo: 'Días disponibles', tipo: 'chips' },
  ];
  protected readonly columnasReservas: readonly ColumnaTabla<ReservaAmenityPortalFila>[] = [
    { id: 'amenity', titulo: 'Amenity', ancho: 'minmax(10rem, 1fr)' },
    { id: 'fecha', titulo: 'Fecha', ancho: '8rem' },
    { id: 'horario', titulo: 'Horario', tipo: 'horario', ancho: '9rem' },
    { id: 'vencimientoSena', titulo: 'Vencimiento seña', ancho: '11rem' },
    {
      id: 'estado',
      titulo: 'Estado',
      tipo: 'estado',
      ancho: '10rem',
      estadoTexto: (valor) => String(valor).replaceAll('_', ' ').replaceAll('SENA', 'SEÑA'),
      estadoClase: (valor) => String(valor) === 'CONFIRMADA' ? null : 'tabla-responsive__estado--debe',
    },
    { id: 'montoTotal', titulo: 'Monto total', tipo: 'moneda', ancho: '8rem' },
    { id: 'montoSena', titulo: 'Seña', tipo: 'moneda', ancho: '8rem' },
    {
      id: 'saldoPendienteMostrar',
      titulo: 'Saldo pendiente',
      tipo: 'moneda',
      ancho: '9rem',
      celdaColor: (valor) => Number(valor) < 0 ? 'var(--semantic-danger)' : null,
      formatearTexto: (valor) => {
        const saldo = Number(valor);
        return saldo < 0 ? `-${formatearMoneda(Math.abs(saldo))}` : formatearMoneda(saldo);
      },
    },
  ];
  protected readonly accionesAmenities: readonly AccionTabla<AmenityPortalFila>[] = [{ id: 'reservar', texto: 'Reservar', icono: 'heroCalendarDays', color: 'var(--app-accent)', visible: () => this.mostrarReservas }];
  protected readonly accionesReservas: readonly AccionTabla<ReservaAmenityPortalFila>[] = [{
    id: 'ver-qr', texto: 'Ver QR', icono: 'heroQrCode', color: 'var(--app-accent)',
    visible: (reserva) => reserva.estado === 'PENDIENTE_SENA' || (reserva.estado === 'CONFIRMADA' && reserva.saldoPendiente > 0),
    cargando: (reserva) => reserva.reservaUuid === this.reservaPagandoUuid(),
  }, {
    id: 'pagar-sena', texto: 'Seña', icono: 'heroBanknotes', imagenIcono: 'assets/mercado pago/MP_RGB_HANDSHAKE_pluma-solo.svg', mostrarTexto: true, color: 'var(--app-warning)',
    visible: (reserva) => reserva.estado === 'PENDIENTE_SENA' && reserva.montoSena > 0,
    cargando: (reserva) => reserva.reservaUuid === this.reservaPagandoUuid(),
  }, {
    id: 'pagar-total', texto: 'Total', icono: 'heroBanknotes', imagenIcono: 'assets/mercado pago/MP_RGB_HANDSHAKE_pluma-solo.svg', mostrarTexto: true, color: 'var(--semantic-success)',
    visible: (reserva) => reserva.estado === 'PENDIENTE_SENA' || (reserva.estado === 'CONFIRMADA' && reserva.saldoPendiente > 0),
    cargando: (reserva) => reserva.reservaUuid === this.reservaPagandoUuid(),
  }, {
    id: 'pagada', texto: 'Pago', icono: 'heroCheck', color: 'var(--semantic-success)',
    visible: (reserva) => reserva.estado === 'CONFIRMADA' && reserva.saldoPendiente <= 0, deshabilitada: true,
    descripcionDeshabilitada: 'Reserva pagada',
  }];

  constructor() { this.cargar(); if (this.mostrarReservas) this.cargarReservas(); }
  ngOnDestroy(): void { this.detenerPolling(); }
  protected cargar(): void {
    if (this.cargando()) return;
    this.cargando.set(true); this.error.set('');
    this.portalApi.listarAmenities().pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.cargando.set(false))).subscribe({
      next: (amenities) => { this.amenitiesDisponibles.set(amenities); this.amenities.set(amenities.map((amenity) => this.mapearFila(amenity))); },
      error: () => { this.amenitiesDisponibles.set([]); this.amenities.set([]); this.error.set('No se pudieron cargar los amenities.'); },
    });
  }
  protected cambiarPaginaReservas(pagina: number): void { if (pagina !== this.paginaReservas() && !this.cargandoReservas()) { this.paginaReservas.set(pagina); this.cargarReservas(); } }
  protected manejarAccionAmenity(evento: EventoAccionTabla<AmenityPortalFila>): void {
    if (evento.accion !== 'reservar' || !this.mostrarReservas) return;
    this.amenityAReservar.set(this.amenitiesDisponibles().find((item) => item.amenityUuid === evento.fila.amenityUuid) ?? null);
  }
  protected cerrarReserva(): void { if (!this.procesandoReserva()) this.amenityAReservar.set(null); }
  protected manejarAccionReserva(evento: EventoAccionTabla<ReservaAmenityPortalFila>): void {
    if (this.pagoQr() || this.reservaPagandoUuid()) return;
    if (evento.accion === 'ver-qr') this.mostrarPagoQr(evento.fila);
    if (evento.accion === 'pagar-sena') this.iniciarPagoReserva(evento.fila, { tipoPago: 'SENA' }, true);
    if (evento.accion === 'pagar-total') {
      const payload = evento.fila.estado === 'PENDIENTE_SENA' ? { tipoPago: 'TOTAL' as const } : undefined;
      this.iniciarPagoReserva(evento.fila, payload, true);
    }
  }
  protected async confirmarReserva(command: ReservarAmenityPortalCommand): Promise<void> {
    const amenity = this.amenityAReservar(); if (!amenity || this.procesandoReserva()) return;
    const esGratuita = amenity.montoHora === 0;
    const confirmado = await this.toast.confirm(`Vas a generar el pago de ${amenity.nombre}. La reserva se confirmará cuando Mercado Pago acredite el pago.`, { titulo: 'Confirmar reserva', textoConfirmar: 'Continuar' });
    if (!confirmado) return;
    this.procesandoReserva.set(true);
    if (esGratuita) {
      this.portalApi.reservarAmenity(amenity.amenityUuid, command).pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.procesandoReserva.set(false)),
      ).subscribe({
        next: () => {
          this.amenityAReservar.set(null);
          this.paginaReservas.set(1);
          this.cargarReservas();
          this.toast.success('La reserva gratuita fue registrada.', { titulo: 'Reserva de amenity' });
        },
        error: (error: unknown) => this.mostrarErrorReserva(error),
      });
      return;
    }
    this.portalApi.reservarAmenity(amenity.amenityUuid, command).pipe(finalize(() => this.procesandoReserva.set(false)), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (resultado) => {
        this.amenityAReservar.set(null); this.paginaReservas.set(1); this.cargarReservas();
        this.mostrarPagoQrReservaNueva(resultado, amenity, command);
      }, error: (error: unknown) => this.mostrarErrorReserva(error),
    });
  }
  protected fuenteQr(qr: string): string { return qr.startsWith('data:image/') ? qr : `data:image/png;base64,${qr}`; }
  protected cerrarPagoQr(): void {
    this.detenerPolling();
    this.pagoQr.set(null);
    this.checkoutQr.set(null);
    this.cargandoQr.set(false);
  }
  protected opcionesTipoPagoQr(pagoQr: PagoQrAmenity): readonly SelectOption[] {
    return pagoQr.reserva.estado === 'PENDIENTE_SENA' && pagoQr.reserva.montoSena > 0
      ? this.opcionesTipoPago
      : this.opcionesTipoPago.filter((opcion) => opcion.value === 'TOTAL');
  }
  protected cambiarTipoPagoQr(tipoPago: string): void {
    if (tipoPago !== 'SENA' && tipoPago !== 'TOTAL') return;
    const pagoQr = this.pagoQr();
    if (!pagoQr || pagoQr.tipoPago === null || pagoQr.tipoPago === tipoPago) return;
    this.pagoQr.set({ ...pagoQr, tipoPago });
    this.generarPagoQr(pagoQr.reserva, { tipoPago });
  }
  private mostrarPagoQr(reserva: ReservaAmenityPortalFila): void {
    const tipoPago = reserva.estado === 'PENDIENTE_SENA' ? 'TOTAL' : null;
    this.pagoQr.set({ reserva, tipoPago });
    this.checkoutQr.set(null);
    this.generarPagoQr(reserva, tipoPago ? { tipoPago } : undefined);
  }
  private iniciarPagoReserva(
    reserva: ReservaAmenityPortalFila,
    payload?: ReintentarPagoReservaAmenityPortalCommand,
    abrirMercadoPago = false,
  ): void {
    if (this.reservaPagandoUuid()) return;
    this.reservaPagandoUuid.set(reserva.reservaUuid);
    this.portalApi.reintentarPagoReservaAmenity(reserva.reservaUuid, payload).pipe(
      finalize(() => this.reservaPagandoUuid.set(null)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (resultado) => {
        if (!resultado.qr) { this.toast.error('Mercado Pago no devolvió un código QR.', { titulo: 'Pago' }); return; }
        if (abrirMercadoPago) void this.abrirPagoDirecto(resultado.qr);
        else this.mostrarPagoQrDesdeResultado(resultado);
      },
      error: (error: unknown) => this.mostrarErrorReserva(error),
    });
  }
  private generarPagoQr(
    reserva: ReservaAmenityPortalFila,
    payload?: ReintentarPagoReservaAmenityPortalCommand,
  ): void {
    if (this.cargandoQr()) return;
    this.cargandoQr.set(true);
    this.reservaPagandoUuid.set(reserva.reservaUuid);
    this.portalApi.reintentarPagoReservaAmenity(reserva.reservaUuid, payload).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => {
        this.cargandoQr.set(false);
        this.reservaPagandoUuid.set(null);
      }),
    ).subscribe({
      next: (resultado) => {
        if (!resultado.qr) { this.toast.error('Mercado Pago no devolvió un código QR.', { titulo: 'Pago' }); return; }
        this.mostrarPagoQrDesdeResultado(resultado);
      },
      error: (error: unknown) => this.mostrarErrorReserva(error),
    });
  }
  private mostrarPagoQrDesdeResultado(resultado: CheckoutAmenity): void {
    this.checkoutQr.set(resultado);
    this.iniciarPolling(resultado.reservaUuid);
  }
  private mostrarPagoQrReservaNueva(
    resultado: ReservaAmenityCobroResultDto,
    amenity: AmenityDto,
    command: ReservarAmenityPortalCommand,
  ): void {
    this.pagoQr.set({
      reserva: {
        reservaUuid: resultado.reservaUuid,
        amenityUuid: amenity.amenityUuid,
        fechaDesde: command.fechaDesde,
        fechaHasta: command.fechaHasta,
        amenity: amenity.nombre,
        fecha: '',
        horario: '',
        vencimientoSena: '—',
        estado: 'PENDIENTE_SENA',
        montoTotal: resultado.monto,
        montoSena: resultado.tipoCobro === 'SENA' ? resultado.monto : 0,
        saldoPendiente: resultado.monto,
        saldoPendienteMostrar: -resultado.monto,
      },
      tipoPago: null,
    });
    this.mostrarPagoQrDesdeResultado(resultado);
  }
  protected cargarReservas(): void {
    if (this.cargandoReservas()) return;
    this.cargandoReservas.set(true); this.errorReservas.set('');
    this.portalApi.paginarMisReservasAmenities({ page: this.paginaReservas(), size: RESERVAS_POR_PAGINA }).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.cargandoReservas.set(false))).subscribe({
      next: (pagina) => { this.reservas.set(pagina.content.map((reserva) => this.mapearReserva(reserva))); this.totalPaginasReservas.set(Math.max(1, pagina.totalPages)); }, error: () => { this.reservas.set([]); this.totalPaginasReservas.set(1); this.errorReservas.set('No se pudieron cargar tus reservas de amenities.'); },
    });
  }
  private iniciarPolling(reservaUuid: string): void { this.detenerPolling(); this.consultarEstadoReserva(reservaUuid); this.pollingId = setInterval(() => this.consultarEstadoReserva(reservaUuid), 5000); }
  private consultarEstadoReserva(reservaUuid: string): void {
    if (!this.pagoQr()) return;
    this.portalApi.paginarMisReservasAmenities({ page: 1, size: RESERVAS_POR_PAGINA }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: (pagina) => {
      this.reservas.set(pagina.content.map((reserva) => this.mapearReserva(reserva))); this.totalPaginasReservas.set(Math.max(1, pagina.totalPages));
      if (pagina.content.find((reserva) => reserva.reservaUuid === reservaUuid)?.estado === 'CONFIRMADA') this.detenerPolling();
    }});
  }
  private detenerPolling(): void { if (this.pollingId !== null) clearInterval(this.pollingId); this.pollingId = null; }
  private async abrirPagoDirecto(qr: string): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const { BrowserQRCodeReader } = await import('@zxing/browser');
      const resultado = await new BrowserQRCodeReader().decodeFromImageUrl(this.fuenteQr(qr));
      const enlace = this.mercadoPagoCheckout.normalizarEnlace(resultado.getText());
      if (!enlace || !this.mercadoPagoCheckout.abrirCheckout(enlace)) {
        this.toast.error('No se pudo abrir Mercado Pago. Usá la opción Ver QR para continuar.', { titulo: 'Pago' });
      }
    } catch {
      this.toast.error('No se pudo leer el enlace de pago. Usá la opción Ver QR para continuar.', { titulo: 'Pago' });
    }
  }
  private mostrarErrorReserva(error: unknown): void {
    const respuesta = error instanceof HttpErrorResponse ? error : null;
    const mensaje = typeof respuesta?.error?.userMessage === 'string' ? respuesta.error.userMessage : 'No se pudo iniciar la reserva. Intentá nuevamente.';
    this.toast.error(mensaje, { titulo: respuesta?.status === 409 ? 'Horario no disponible' : 'Reserva de amenity' }); if (respuesta?.status === 404) this.cargar();
  }
  private mapearFila(amenity: AmenityDto): AmenityPortalFila { return { amenityUuid: amenity.amenityUuid, nombre: amenity.nombre, tarifa: [amenity.montoHora === 0 ? 'Gratis' : formatearMoneda(amenity.montoHora)], senia: [amenity.montoHora === 0 ? 'Gratis' : `${amenity.porcentajeSena}%`], horario: `${amenity.horaInicio.slice(0, 5)} a ${amenity.horaFin.slice(0, 5)} h`, diasDisponibles: this.diasDisponibles(amenity.diasSemana) }; }
  private mapearReserva(reserva: ReservaAmenityDto): ReservaAmenityPortalFila { const inicio = reserva.slotInicio ?? reserva.inicio; const fin = reserva.slotFin ?? reserva.fin; const tieneSenaRegistrada = reserva.montoSena > 0 && reserva.saldoPendiente < reserva.montoTotal; return { reservaUuid: reserva.reservaUuid, amenityUuid: reserva.amenityUuid, fechaDesde: this.normalizarFechaReserva(inicio), fechaHasta: this.normalizarFechaReserva(fin), amenity: reserva.amenityNombre || 'Amenity', fecha: this.formatearFecha(inicio), horario: `${this.formatearHora(inicio)} a ${this.formatearHora(fin)} h`, vencimientoSena: tieneSenaRegistrada ? reserva.venceSenaAt ?? '—' : '', estado: reserva.estado, montoTotal: reserva.montoTotal, montoSena: reserva.montoSena, saldoPendiente: reserva.saldoPendiente, saldoPendienteMostrar: reserva.saldoPendiente > 0 ? -reserva.saldoPendiente : 0 }; }
  /** Convierte las fechas del paginado al formato local que exige el portal, sin zona horaria. */
  private normalizarFechaReserva(valor: string): string {
    const iso = valor.match(/^(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2})(?::(\d{2}))?/);
    if (iso) return `${iso[1]}T${iso[2]}:${iso[3] ?? '00'}`;
    const argentina = valor.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}:\d{2})(?::(\d{2}))?/);
    return argentina ? `${argentina[3]}-${argentina[2]}-${argentina[1]}T${argentina[4]}:${argentina[5] ?? '00'}` : valor;
  }
  private formatearFecha(valor: string): string { const fecha = parsearFechaApi(valor); return fecha ? new Intl.DateTimeFormat('es-AR').format(fecha) : 'Sin fecha'; }
  private formatearHora(valor: string): string { return valor.match(/(?:T|\s)(\d{2}:\d{2})/)?.[1] ?? '—'; }
  private diasDisponibles(dias: string): readonly string[] { const normalizados = dias.split(/[;,]/).map((dia) => dia.trim().toUpperCase()).filter(Boolean).filter((dia, indice, lista) => lista.indexOf(dia) === indice); return normalizados.length === DIAS_SEMANA_COMPLETOS.size && normalizados.every((dia) => DIAS_SEMANA_COMPLETOS.has(dia)) ? ['Todos los días'] : normalizados.map((dia) => `${dia.charAt(0)}${dia.slice(1).toLowerCase()}`); }
}
