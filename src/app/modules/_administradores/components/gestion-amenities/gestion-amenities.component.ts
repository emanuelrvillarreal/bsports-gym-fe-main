import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { provideTablaResponsiveIcons } from '../../../../core/icons/app-icons.registry';
import { formatearMoneda, normalizarValorMoneda } from '../../../../helpers/moneda-formato';
import {
  AmenityDto,
  CobrarReservaAmenityCommand,
  CobrarReservaAmenityManualCommand,
  CrearReservaAmenityCommand,
  GuardarAmenityCommand,
  ReservaAmenityDto,
} from '../../../../core/api/interfaces/amenities.interfaces';
import { AmenitiesApiService } from '../../../../core/api/services/amenities-api.service';
import { BotonComponent } from '../../../ui/boton/boton.component';
import { CardComponent } from '../../../ui/card/card.component';
import { PopupComponent } from '../../../ui/popup/popup.component';
import { InputFechaComponent } from '../../../ui/input-fecha/input-fecha.component';
import { SelectComponent, SelectOption } from '../../../ui/select/select.component';
import { TituloHeroComponent } from '../../../ui/titulo-hero/titulo-hero.component';
import {
  AccionCabeceraTabla,
  AccionTabla,
  ColumnaTabla,
  EventoAccionTabla,
  TablaResponsiveComponent,
} from '../../../ui/tabla-responsive/tabla-responsive.component';
import { ToastAlertService } from '../../../ui/toast-alert/services/toast-alert.service';
import { FormularioAmenityComponent } from '../../forms/formulario-amenity/formulario-amenity.component';
import { GestionReservaAmenityComponent } from '../gestion-reserva-amenity/gestion-reserva-amenity.component';

interface FilaAmenity extends AmenityDto {
  readonly dias: readonly string[];
  readonly horario: string;
  readonly monto: readonly string[];
  readonly senia: readonly string[];
}

interface FilaReserva extends ReservaAmenityDto {
  readonly amenity: string;
  readonly socio: string;
  readonly horario: string;
  readonly senia: number;
  readonly vencimientoSenia: string;
}

const CANTIDAD_DIAS_SEMANA = 7;

@Component({
  selector: 'app-gestion-amenities',
  imports: [
    BotonComponent,
    CardComponent,
    FormularioAmenityComponent,
    FormsModule,
    GestionReservaAmenityComponent,
    InputFechaComponent,
    PopupComponent,
    SelectComponent,
    TablaResponsiveComponent,
    TituloHeroComponent,
  ],
  providers: [provideTablaResponsiveIcons()],
  templateUrl: './gestion-amenities.component.html',
  styleUrl: './gestion-amenities.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GestionAmenitiesComponent {
  readonly puedeConfigurar = input(false);
  protected readonly formatearMoneda = formatearMoneda;

  private readonly api = inject(AmenitiesApiService);
  private readonly toast = inject(ToastAlertService);

  protected readonly amenities = signal<readonly AmenityDto[]>([]);
  protected readonly reservas = signal<readonly ReservaAmenityDto[]>([]);
  protected readonly cargandoAmenities = signal(false);
  protected readonly cargandoReservas = signal(false);
  protected readonly guardando = signal(false);
  protected readonly errorAmenities = signal('');
  protected readonly errorReservas = signal('');
  protected readonly popupAmenityAbierto = signal(false);
  protected readonly popupReservaAbierto = signal(false);
  protected readonly amenityEditando = signal<AmenityDto | null>(null);
  protected readonly reservaSeleccionada = signal<ReservaAmenityDto | null>(null);
  protected readonly reservaDetalle = signal<ReservaAmenityDto | null>(null);
  protected readonly tipoCobro = signal<'SENA' | 'SALDO' | 'TOTAL'>('TOTAL');
  protected readonly medioPago = signal('EFECTIVO');
  protected readonly canalCobro = signal<'MANUAL' | 'MERCADO_PAGO'>('MANUAL');
  protected readonly fechaCobro = signal('');
  protected readonly observacionesCobro = signal('');
  protected readonly montoCobro = signal('');
  protected readonly qrCobro = signal<string | null>(null);
  protected readonly fechaMinimaCobro = this.obtenerFechaActual();
  protected readonly tiposCobro: readonly SelectOption[] = [
    { value: 'SENA', label: 'Seña' },
    { value: 'SALDO', label: 'Saldo' },
    { value: 'TOTAL', label: 'Total' },
  ];
  protected readonly tiposCobroDisponibles = computed<readonly SelectOption[]>(() =>
    this.tieneSenaPaga(this.reservaSeleccionada())
      ? this.tiposCobro.filter((tipo) => tipo.value === 'SALDO')
      : this.tiposCobro,
  );
  protected readonly mediosPago: readonly SelectOption[] = [
    { value: 'EFECTIVO', label: 'Efectivo' },
    { value: 'TRANSFERENCIA', label: 'Transferencia' },
    { value: 'OTRO', label: 'Otro' },
  ];
  protected readonly canalesCobro: readonly SelectOption[] = [
    { value: 'MANUAL', label: 'Cobro manual' },
    { value: 'MERCADO_PAGO', label: 'Mercado Pago' },
  ];
  protected readonly esCobroManual = computed(() => this.canalCobro() === 'MANUAL');

  protected readonly filasAmenities = computed<readonly FilaAmenity[]>(() =>
    this.amenities().map((amenity) => ({
      ...amenity,
      dias: this.resumirDias(amenity.diasSemana),
      horario: `${amenity.horaInicio.slice(0, 5)} – ${amenity.horaFin.slice(0, 5)}`,
      monto: [amenity.montoHora === 0 ? 'Gratis' : formatearMoneda(amenity.montoHora)],
      senia: [amenity.montoHora === 0 ? 'Gratis' : `${amenity.porcentajeSena}%`],
    })),
  );
  protected readonly filasReservas = computed<readonly FilaReserva[]>(() =>
    this.reservas().map((reserva) => ({
      ...reserva,
      amenity: reserva.amenityNombre || 'Sin instalación',
      socio: [reserva.memberNombre, reserva.memberApellido].filter(Boolean).join(' ') || 'Sin socio',
      senia: this.montoSena(reserva),
      vencimientoSenia: this.venceSenaAt(reserva) ?? 'Sin vencimiento',
      horario: `${this.formatearFechaHorario(reserva.slotInicio ?? reserva.inicio)} – ${this.formatearFechaHorario(reserva.slotFin ?? reserva.fin)}`,
    })),
  );
  protected readonly columnasAmenities: readonly ColumnaTabla<FilaAmenity>[] = [
    { id: 'nombre', titulo: 'Instalación', ancho: 'minmax(10rem, 1fr)' },
    { id: 'dias', titulo: 'Días', tipo: 'chips', ancho: 'minmax(10rem, 1fr)' },
    { id: 'horario', titulo: 'Horario', tipo: 'horario', ancho: '10rem' },
    { id: 'monto', titulo: 'Monto/hora', tipo: 'chips', ancho: '9rem', chipClase: (valor) => valor === 'Gratis' ? 'tabla-responsive__chip--success' : null },
    { id: 'senia', titulo: 'Seña', tipo: 'chips', ancho: '6rem', chipClase: (valor) => valor === 'Gratis' ? 'tabla-responsive__chip--success' : null },
  ];
  protected readonly columnasReservas: readonly ColumnaTabla<FilaReserva>[] = [
    { id: 'amenity', titulo: 'Instalación', ancho: 'minmax(9rem, 1fr)' },
    { id: 'socio', titulo: 'Socio', ancho: 'minmax(10rem, 1fr)' },
    { id: 'horario', titulo: 'Horario', tipo: 'horario', ancho: 'minmax(15rem, 1.25fr)' },
    {
      id: 'estado',
      titulo: 'Estado',
      tipo: 'estado',
      ancho: '9rem',
      estadoTexto: (estado) => this.formatearEstadoReserva(estado),
      estadoClase: (estado) => this.claseEstadoReserva(estado),
    },
    { id: 'montoTotal', titulo: 'Total', tipo: 'moneda', ancho: '8rem' },
    { id: 'senia', titulo: 'Seña', tipo: 'moneda', ancho: '8rem' },
    { id: 'saldoPendiente', titulo: 'Saldo', tipo: 'moneda', ancho: '8rem' },
    { id: 'vencimientoSenia', titulo: 'Vence seña', ancho: '11rem' },
  ];
  protected readonly accionesCabeceraAmenities: readonly AccionCabeceraTabla[] = [
    { id: 'nuevo-amenity', texto: 'Nueva instalación', abreDialogo: true },
  ];
  protected readonly accionesCabeceraReservas: readonly AccionCabeceraTabla[] = [
    { id: 'nueva-reserva', texto: 'Nueva reserva', abreDialogo: true },
  ];
  protected readonly accionesAmenities: readonly AccionTabla<FilaAmenity>[] = ['editar', 'borrar'];
  protected readonly accionesReservas: readonly AccionTabla<FilaReserva>[] = [
    'ver',
    {
      id: 'confirmar', texto: 'Confirmar gratuita', icono: 'heroCheckCircle', color: 'var(--semantic-success)',
      visible: (reserva) => reserva.montoTotal === 0 && reserva.estado === 'PENDIENTE_SENA',
    },
    {
      id: 'cobrar', texto: 'Cobrar', icono: 'heroBanknotes', color: 'var(--app-accent)',
      visible: (reserva) => reserva.saldoPendiente > 0 && reserva.estado !== 'CANCELADA',
    },
    {
      id: 'cancelar', texto: 'Cancelar reserva', icono: 'heroXMark', color: 'var(--semantic-danger)',
      visible: (reserva) => reserva.estado === 'PENDIENTE_SENA' || reserva.estado === 'CONFIRMADA',
    },
  ];

  constructor() {
    queueMicrotask(() => { this.cargarAmenities(); this.cargarReservas(); });
  }

  protected abrirNuevoAmenity(): void { this.amenityEditando.set(null); this.popupAmenityAbierto.set(true); }
  protected cerrarAmenity(): void { if (!this.guardando()) this.popupAmenityAbierto.set(false); }
  protected abrirReserva(): void { this.popupReservaAbierto.set(true); }
  protected cerrarReserva(): void { if (!this.guardando()) this.popupReservaAbierto.set(false); }

  protected manejarCabeceraAmenities(accion: string): void { if (accion === 'nuevo-amenity') this.abrirNuevoAmenity(); }
  protected manejarCabeceraReservas(accion: string): void { if (accion === 'nueva-reserva') this.abrirReserva(); }

  protected manejarAmenity(evento: EventoAccionTabla<FilaAmenity>): void {
    if (evento.accion === 'editar') { this.amenityEditando.set(evento.fila); this.popupAmenityAbierto.set(true); }
    if (evento.accion === 'borrar') void this.desactivar(evento.fila);
  }

  protected manejarReserva(evento: EventoAccionTabla<FilaReserva>): void {
    if (evento.accion === 'ver') this.reservaDetalle.set(evento.fila);
    if (evento.accion === 'confirmar') this.confirmarGratuita(evento.fila);
    if (evento.accion === 'cobrar') this.abrirCobro(evento.fila);
    if (evento.accion === 'cancelar') void this.cancelarReserva(evento.fila);
  }

  montoSena(reserva: ReservaAmenityDto): number {
    return reserva.montoSena;
  }

  venceSenaAt(reserva: ReservaAmenityDto): string | null {
    return reserva.venceSenaAt ?? null;
  }

  protected formatearEstadoReserva(estado: unknown): string {
    const valor = String(estado ?? '').trim().toUpperCase();
    if (valor.startsWith('PENDIENTE')) return 'Pendiente de se\u00f1a';
    if (valor === 'CONFIRMADA') return 'Confirmada';
    if (valor === 'VENCIDA') return 'Vencida';
    if (valor === 'CANCELADA') return 'Cancelada';
    return valor ? valor.replaceAll('_', ' ') : 'Sin estado';
  }

  protected claseEstadoReserva(estado: unknown): string | null {
    const valor = String(estado ?? '').trim().toUpperCase();
    if (valor.startsWith('PENDIENTE')) return 'tabla-responsive__estado--debe';
    if (valor === 'CANCELADA') return 'tabla-responsive__estado--inactivo';
    return null;
  }

  protected claseEstadoDetalle(estado: unknown): string {
    const valor = String(estado ?? '').trim().toUpperCase();
    if (valor.startsWith('PENDIENTE')) return 'gestion-amenities__estado--pendiente';
    if (valor === 'CANCELADA') return 'gestion-amenities__estado--cancelada';
    return 'gestion-amenities__estado--confirmada';
  }

  protected guardarAmenity(command: GuardarAmenityCommand): void {
    if (this.guardando()) return;
    const editando = this.amenityEditando();
    this.guardando.set(true); this.errorAmenities.set('');
    (editando ? this.api.actualizar(editando.amenityUuid, command) : this.api.crear(command))
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({ next: () => { this.popupAmenityAbierto.set(false); this.cargarAmenities(); }, error: () => this.errorAmenities.set('No se pudo guardar la instalación.') });
  }

  protected crearReserva(command: CrearReservaAmenityCommand): void {
    this.guardando.set(true); this.errorReservas.set('');
    this.api.crearReserva(command).pipe(finalize(() => this.guardando.set(false))).subscribe({
      next: () => { this.popupReservaAbierto.set(false); this.cargarReservas(); },
      error: () => this.errorReservas.set('No se pudo crear la reserva. Verificá disponibilidad y horario.'),
    });
  }

  protected async desactivar(amenity: AmenityDto): Promise<void> {
    if (!await this.toast.confirmDanger('Se cancelarán las reservas futuras vinculadas.', { titulo: 'Desactivar instalación', textoConfirmar: 'Desactivar' })) return;
    this.api.eliminar(amenity.amenityUuid).subscribe({ next: () => this.cargarAmenities(), error: () => this.errorAmenities.set('No se pudo desactivar la instalación.') });
  }

  protected confirmarGratuita(reserva: ReservaAmenityDto): void {
    this.api.confirmarGratuita(reserva.reservaUuid).subscribe({ next: () => this.cargarReservas(), error: () => this.errorReservas.set('No se pudo confirmar la reserva gratuita.') });
  }

  protected async cancelarReserva(reserva: ReservaAmenityDto): Promise<void> {
    if (!await this.toast.confirmDanger('La reserva se cancelará definitivamente.', { titulo: 'Cancelar reserva', textoConfirmar: 'Cancelar reserva' })) return;
    this.api.cancelarReserva(reserva.reservaUuid).subscribe({ next: () => this.cargarReservas(), error: () => this.errorReservas.set('No se pudo cancelar la reserva.') });
  }

  protected cobrar(evento: SubmitEvent): void {
    evento.preventDefault(); const reserva = this.reservaSeleccionada(); if (!reserva || this.guardando()) return;
    const datos = new FormData(evento.target as HTMLFormElement);
    const tipo = String(datos.get('tipoCobro') ?? 'TOTAL') as 'SENA' | 'SALDO' | 'TOTAL';
    const command: CobrarReservaAmenityManualCommand = { canalCobro: 'MANUAL', monto: Number(datos.get('monto')), medioPago: String(datos.get('medioPago')) as CobrarReservaAmenityManualCommand['medioPago'], fecha: String(datos.get('fecha') ?? '') || null, observaciones: String(datos.get('observaciones') ?? '').trim() || null };
    if (!(command.monto > 0)) { this.errorReservas.set('Ingresá un monto válido.'); return; }
    const request = tipo === 'SENA' ? this.api.cobrarSena(reserva.reservaUuid, command) : tipo === 'SALDO' ? this.api.cobrarSaldo(reserva.reservaUuid, command) : this.api.cobrarTotal(reserva.reservaUuid, command);
    this.guardando.set(true); request.pipe(finalize(() => this.guardando.set(false))).subscribe({ next: () => { this.reservaSeleccionada.set(null); this.cargarReservas(); }, error: () => this.errorReservas.set('No se pudo registrar el cobro.') });
  }

  protected cobrarFormulario(evento: SubmitEvent): void {
    evento.preventDefault();
    const reserva = this.reservaSeleccionada();
    if (!reserva || this.guardando()) return;
    if (this.canalCobro() === 'MERCADO_PAGO') {
      this.iniciarCobroMercadoPago(reserva);
      return;
    }

    const monto = normalizarValorMoneda(this.montoCobro());
    const minimo = this.minimoMontoCobro();
    const maximo = this.maximoMontoCobro();
    if (monto < minimo || monto > maximo || !(monto > 0)) {
      this.errorReservas.set('El monto debe estar entre la seña y el saldo pendiente.');
      return;
    }

    const command: CobrarReservaAmenityManualCommand = {
      canalCobro: 'MANUAL',
      monto,
      medioPago: this.medioPago() as CobrarReservaAmenityManualCommand['medioPago'],
      fecha: this.fechaCobro() || null,
      observaciones: this.observacionesCobro().trim() || null,
    };
    const request = this.tipoCobro() === 'SALDO'
      ? this.api.cobrarSaldo(reserva.reservaUuid, command)
      : this.tipoCobro() === 'TOTAL'
        ? this.api.cobrarTotal(reserva.reservaUuid, command)
        : this.api.cobrarSena(reserva.reservaUuid, command);
    this.guardando.set(true);
    request.pipe(finalize(() => this.guardando.set(false))).subscribe({
      next: () => { this.reservaSeleccionada.set(null); this.cargarReservas(); },
      error: () => this.errorReservas.set('No se pudo registrar el cobro.'),
    });
  }

  protected seleccionarTipoCobro(tipo: string): void {
    if (tipo !== 'SENA' && tipo !== 'SALDO' && tipo !== 'TOTAL') return;
    this.tipoCobro.set(tipo);
    this.montoCobro.set(formatearMoneda(tipo === 'SENA' ? this.minimoMontoCobro() : this.maximoMontoCobro()));
  }

  protected seleccionarCanalCobro(canal: string): void {
    if (canal !== 'MANUAL' && canal !== 'MERCADO_PAGO') return;
    this.canalCobro.set(canal);
    this.errorReservas.set('');
  }

  protected cerrarCobro(): void {
    if (this.guardando()) return;
    this.reservaSeleccionada.set(null);
    this.qrCobro.set(null);
  }

  protected fuenteQr(qr: string): string {
    return qr.startsWith('data:image/') ? qr : `data:image/png;base64,${qr}`;
  }

  protected actualizarMontoCobro(evento: Event): void {
    const campo = evento.target as HTMLInputElement;
    const valorNumerico = campo.value.replace(/[^\d]/g, '');
    campo.value = valorNumerico;
    this.montoCobro.set(valorNumerico);
  }

  protected formatearMontoCobro(): void {
    const monto = Math.min(this.maximoMontoCobro(), Math.max(this.minimoMontoCobro(), normalizarValorMoneda(this.montoCobro())));
    this.montoCobro.set(formatearMoneda(monto));
  }

  protected actualizarObservaciones(evento: Event): void {
    this.observacionesCobro.set((evento.target as HTMLTextAreaElement).value.slice(0, 500));
  }

  protected minimoMontoCobro(): number {
    const reserva = this.reservaSeleccionada();
    return reserva ? this.montoSena(reserva) : 0;
  }

  protected maximoMontoCobro(): number {
    return this.reservaSeleccionada()?.saldoPendiente ?? 0;
  }

  private abrirCobro(reserva: ReservaAmenityDto): void {
    this.reservaSeleccionada.set(reserva);
    this.tipoCobro.set(this.tieneSenaPaga(reserva) ? 'SALDO' : 'TOTAL');
    this.canalCobro.set('MANUAL');
    this.medioPago.set('EFECTIVO');
    this.fechaCobro.set(this.fechaMinimaCobro);
    this.observacionesCobro.set('');
    this.montoCobro.set(formatearMoneda(reserva.saldoPendiente));
    this.qrCobro.set(null);
  }

  private iniciarCobroMercadoPago(reserva: ReservaAmenityDto): void {
    const command: CobrarReservaAmenityCommand = { canalCobro: 'MERCADO_PAGO' };
    const request = this.tipoCobro() === 'SALDO'
      ? this.api.cobrarSaldo(reserva.reservaUuid, command)
      : this.tipoCobro() === 'TOTAL'
        ? this.api.cobrarTotal(reserva.reservaUuid, command)
        : this.api.cobrarSena(reserva.reservaUuid, command);

    this.guardando.set(true);
    request.pipe(finalize(() => this.guardando.set(false))).subscribe({
      next: (resultado) => {
        if (!resultado.qr) {
          this.errorReservas.set('Mercado Pago no devolvió un código QR para el cobro.');
          return;
        }
        this.qrCobro.set(resultado.qr);
      },
      error: () => this.errorReservas.set('No se pudo iniciar el cobro con Mercado Pago.'),
    });
  }

  private tieneSenaPaga(reserva: ReservaAmenityDto | null): boolean {
    return !!reserva
      && this.montoSena(reserva) > 0
      && reserva.saldoPendiente < reserva.montoTotal;
  }

  private obtenerFechaActual(): string {
    const fecha = new Date();
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }

  protected cargarAmenities(): void { this.cargandoAmenities.set(true); this.api.listar().pipe(finalize(() => this.cargandoAmenities.set(false))).subscribe({ next: (items) => this.amenities.set(items), error: () => this.errorAmenities.set('No se pudieron cargar las instalaciones.') }); }
  protected cargarReservas(): void { this.cargandoReservas.set(true); this.api.paginarReservas({ page: 1, size: 50, search: '', estados: [] }).pipe(finalize(() => this.cargandoReservas.set(false))).subscribe({ next: (pagina) => this.reservas.set(pagina.content), error: () => this.errorReservas.set('No se pudieron cargar las reservas.') }); }

  private formatearFechaHorario(valor: string | undefined): string {
    return valor ? valor.replace(/:00$/, '') : 'Sin horario';
  }

  private resumirDias(diasSemana: string): readonly string[] {
    const dias = [...new Set(diasSemana.split(';').map((dia) => dia.trim()).filter(Boolean))];
    return dias.length === CANTIDAD_DIAS_SEMANA ? ['Todos los días'] : dias;
  }
}
