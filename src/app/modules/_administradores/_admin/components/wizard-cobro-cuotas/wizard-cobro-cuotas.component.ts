import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnChanges,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, concatMap, finalize, from, map, mergeMap, of, toArray } from 'rxjs';

import {
  CobroCuotaItemResultDto,
  CuotaRowDto,
  MedioPago,
  MedioPagoManual,
} from '../../../../../core/api/interfaces/tesoreria.interfaces';
import { EstadoSocio, SocioDto } from '../../../../../core/api/interfaces/socios.interfaces';
import { SociosApiService } from '../../../../../core/api/services/socios-api.service';
import { TesoreriaApiService } from '../../../../../core/api/services/tesoreria-api.service';
import { formatearDni } from '../../../../../helpers/dni-formato';
import { formatearMoneda } from '../../../../../helpers/moneda-formato';
import { formatearEstadoTabla } from '../../../../../helpers/tabla-estado.helpers';
import { MercadoPagoCheckoutService } from '../../../../pagos/services/mercado-pago-checkout.service';
import { BotonComponent } from '../../../../ui/boton/boton.component';
import { CheckoutMercadoPagoComponent } from '../../../../ui/checkout-mercado-pago/checkout-mercado-pago.component';
import { PaginacionComponent } from '../../../../ui/paginacion/paginacion.component';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  heroArrowsRightLeft,
  heroBanknotes,
  heroCheckCircle,
  heroEllipsisHorizontalCircle,
  heroQrCode,
} from '@ng-icons/heroicons/outline';
import { SelectComponent, SelectOption } from '../../../../ui/select/select.component';
import {
  AccionTabla,
  ColumnaTabla,
  EventoAccionTabla,
  TablaResponsiveComponent,
} from '../../../../ui/tabla-responsive/tabla-responsive.component';
import { ToastAlertService } from '../../../../ui/toast-alert/services/toast-alert.service';
import { TituloHeroComponent } from '../../../../ui/titulo-hero/titulo-hero.component';
import {
  PasoWizard,
  WizardPasosComponent,
} from '../../../../ui/wizard-pasos/wizard-pasos.component';

type PasoCobro = 'socio' | 'deuda' | 'confirmacion' | 'listo';
type ModoMediosPago = 'total' | 'por-cuota';

interface FilaSocioCobro extends SocioDto {
  readonly tipoIntegrante: string;
  /** Deuda pendiente o vencida del socio (de su grupo si es titular); vacío si no se pudo calcular. */
  readonly deuda: string;
}

/** Medio de pago presentado como botón grande en el paso "¿Cómo paga?". */
interface OpcionMedioPago {
  readonly valor: MedioPago;
  readonly etiqueta: string;
  readonly descripcion: string;
  readonly icono: string;
}

/** Lo que se muestra en la pantalla final después de registrar el cobro. */
interface ResultadoCobro {
  readonly pagador: string;
  readonly monto: number;
  readonly medio: string;
  readonly cantidad: number;
}

const ETIQUETAS_MEDIO: Readonly<Record<MedioPago, string>> = {
  EFECTIVO: 'Efectivo',
  TRANSFERENCIA: 'Transferencia',
  MERCADO_PAGO: 'Mercado Pago',
  OTRO: 'Otro medio',
  DEBITO: 'Tarjeta de débito',
  DEBITO_AUTOMATICO: 'Débito automático',
  CREDITO: 'Tarjeta de crédito',
  CHEQUE: 'Cheque',
  NFC: 'Pago con celular (NFC)',
};

/** Detalle que se elige al tocar "Otro". */
const MEDIOS_OTRO: readonly MedioPagoManual[] = ['DEBITO', 'DEBITO_AUTOMATICO', 'CREDITO', 'CHEQUE', 'NFC', 'OTRO'];
/** Cuotas que se consultan de una vez para mostrar cuánto debe cada socio del listado. */
const TAMANO_RESUMEN_DEUDA = 200;

interface ResumenPersonaSeleccionada {
  readonly personaMemberUuid: string;
  readonly nombreCompleto: string;
  readonly subtotal: number;
  readonly cuotas: readonly CuotaRowDto[];
}

interface CheckoutWizard {
  readonly enlace: string;
  readonly qr: string;
  readonly preferenceId: string;
}

const ESTADOS_SOCIO: readonly EstadoSocio[] = [
  'ACTIVO',
  'MOROSO',
  'INHABILITADO',
  'SUSPENDIDO',
  'INACTIVO',
];
const TAMANO_PAGINA = 20;

@Component({
  selector: 'app-wizard-cobro-cuotas',
  standalone: true,
  imports: [
    BotonComponent,
    CheckoutMercadoPagoComponent,
    NgIcon,
    PaginacionComponent,
    SelectComponent,
    TablaResponsiveComponent,
    TituloHeroComponent,
    WizardPasosComponent,
  ],
  providers: [
    provideIcons({
      heroArrowsRightLeft,
      heroBanknotes,
      heroCheckCircle,
      heroEllipsisHorizontalCircle,
      heroQrCode,
    }),
  ],
  templateUrl: './wizard-cobro-cuotas.component.html',
  styleUrl: './wizard-cobro-cuotas.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WizardCobroCuotasComponent implements OnChanges {
  private readonly sociosApi = inject(SociosApiService);
  private readonly tesoreriaApi = inject(TesoreriaApiService);
  private readonly mercadoPagoCheckout = inject(MercadoPagoCheckoutService);
  private readonly toast = inject(ToastAlertService);
  private readonly destroyRef = inject(DestroyRef);

  readonly abierto = input(false);
  readonly cancelar = output<void>();
  readonly cobrosActualizados = output<void>();
  readonly completado = output<void>();

  readonly pasoActual = signal<PasoCobro>('socio');
  readonly procesando = signal(false);
  readonly cargandoSeleccionTotal = signal(false);
  readonly pasos: readonly PasoWizard[] = [
    { id: 'socio', etiqueta: '¿Quién paga?' },
    { id: 'deuda', etiqueta: '¿Qué paga?' },
    { id: 'confirmacion', etiqueta: '¿Cómo paga?' },
  ];

  protected readonly error = signal('');
  protected readonly busquedaSocio = signal('');
  protected readonly socios = signal<readonly FilaSocioCobro[]>([]);
  protected readonly paginaSocios = signal(1);
  protected readonly totalPaginasSocios = signal(1);
  protected readonly cargandoSocios = signal(false);
  protected readonly socioSeleccionado = signal<SocioDto | null>(null);
  /** Nombre de quien paga, para encabezados y la pantalla final. */
  protected readonly pagador = signal('');
  protected readonly resultado = signal<ResultadoCobro | null>(null);
  /** Deuda por titular y por persona, calculada al abrir; null si no se pudo consultar completa. */
  private readonly deudaPorMiembro = signal<ReadonlyMap<string, number> | null>(null);
  private readonly titularMemberUuid = signal('');
  private readonly personaMemberUuid = signal('');

  protected readonly cuotasPagina = signal<readonly CuotaRowDto[]>([]);
  private readonly cuotasConocidas = signal<readonly CuotaRowDto[]>([]);
  protected readonly paginaCuotas = signal(1);
  protected readonly totalPaginasCuotas = signal(1);
  protected readonly totalElementosCuotas = signal(0);
  protected readonly cargandoCuotas = signal(false);
  private readonly seleccionadas = signal<ReadonlySet<string>>(new Set());

  protected readonly modoMedios = signal<ModoMediosPago>('total');
  protected readonly medioGlobal = signal<MedioPago | ''>('');
  /** Con "Otro" elegido: cuál (débito, crédito, cheque…). */
  protected readonly medioOtro = signal<MedioPagoManual | ''>('');
  protected readonly opcionesOtro = MEDIOS_OTRO.map((valor) => ({
    valor,
    etiqueta: valor === 'OTRO' ? 'Otro' : ETIQUETAS_MEDIO[valor],
  }));
  /** Medio que realmente se registra cuando se paga todo con uno solo. */
  private readonly medioElegido = computed((): MedioPago | '' =>
    this.medioGlobal() === 'OTRO' ? this.medioOtro() : this.medioGlobal(),
  );
  private readonly mediosPorCuota = signal<Readonly<Record<string, MedioPagoManual | ''>>>({});
  private readonly erroresPorCuota = signal<Readonly<Record<string, string>>>({});
  protected readonly checkout = signal<CheckoutWizard | null>(null);
  readonly checkoutActivo = computed(() => !!this.checkout());
  protected readonly copiandoCheckout = signal(false);
  protected readonly mensajeCheckout = signal('');
  protected readonly errorCheckout = signal('');

  protected readonly opcionesMedioPagoManual: readonly SelectOption[] = [
    { value: '', label: 'Seleccionar medio de pago' },
    { value: 'EFECTIVO', label: 'Efectivo' },
    { value: 'TRANSFERENCIA', label: 'Transferencia' },
    { value: 'DEBITO', label: 'Tarjeta de débito' },
    { value: 'DEBITO_AUTOMATICO', label: 'Débito automático' },
    { value: 'CREDITO', label: 'Tarjeta de crédito' },
    { value: 'CHEQUE', label: 'Cheque' },
    { value: 'NFC', label: 'Pago con celular (NFC)' },
    { value: 'OTRO', label: 'Otro' },
  ];
  protected readonly opcionesMedio: readonly OpcionMedioPago[] = [
    { valor: 'EFECTIVO', etiqueta: 'Efectivo', descripcion: 'Pagó en mano', icono: 'heroBanknotes' },
    {
      valor: 'TRANSFERENCIA',
      etiqueta: 'Transferencia',
      descripcion: 'Ya transfirió al gimnasio',
      icono: 'heroArrowsRightLeft',
    },
    {
      valor: 'MERCADO_PAGO',
      etiqueta: 'Mercado Pago',
      descripcion: 'Le mandás un link o QR',
      icono: 'heroQrCode',
    },
    { valor: 'OTRO', etiqueta: 'Otro', descripcion: 'Débito, crédito, cheque, celular', icono: 'heroEllipsisHorizontalCircle' },
  ];

  protected readonly columnasSocios: readonly ColumnaTabla<FilaSocioCobro>[] = [
    { id: 'nombre', titulo: 'Nombre' },
    { id: 'apellido', titulo: 'Apellido' },
    { id: 'dni', titulo: 'DNI' },
    { id: 'numeroSocio', titulo: 'N.º socio' },
    { id: 'tipoIntegrante', titulo: 'Grupo' },
    { id: 'deuda', titulo: 'Debe' },
    {
      id: 'estado',
      titulo: 'Estado',
      tipo: 'estado',
      estadoTexto: (valor) => formatearEstadoTabla(valor),
    },
  ];
  protected readonly accionesSocios: readonly AccionTabla<FilaSocioCobro>[] = [
    {
      id: 'seleccionar',
      texto: 'Elegir',
      icono: 'heroCheck',
      mostrarTexto: true,
      color: 'var(--semantic-success)',
    },
  ];
  readonly cuotasSeleccionadas = computed(() => {
    const ids = this.seleccionadas();
    return this.cuotasConocidas().filter((cuota) => ids.has(cuota.cuotaUuid));
  });
  protected readonly totalSeleccionado = computed(() =>
    this.cuotasSeleccionadas().reduce((total, cuota) => total + this.montoACobrar(cuota), 0),
  );
  protected readonly resumenPersonas = computed<readonly ResumenPersonaSeleccionada[]>(() => {
    const personas = new Map<string, CuotaRowDto[]>();
    this.cuotasSeleccionadas().forEach((cuota) => {
      personas.set(cuota.personaMemberUuid, [
        ...(personas.get(cuota.personaMemberUuid) ?? []),
        cuota,
      ]);
    });
    return [...personas.entries()].map(([personaMemberUuid, cuotas]) => ({
      personaMemberUuid,
      nombreCompleto:
        `${cuotas[0]?.personaNombre ?? ''} ${cuotas[0]?.personaApellido ?? ''}`.trim(),
      subtotal: cuotas.reduce((total, cuota) => total + this.montoACobrar(cuota), 0),
      cuotas,
    }));
  });
  protected readonly todaDeudaSeleccionada = computed(
    () =>
      this.totalElementosCuotas() > 0 && this.seleccionadas().size >= this.totalElementosCuotas(),
  );
  readonly puedeContinuar = computed(
    () =>
      !this.estaBloqueado() &&
      (this.pasoActual() === 'socio'
        ? !!this.socioSeleccionado()
        : this.pasoActual() === 'deuda' && this.seleccionadas().size > 0),
  );
  /** Texto del botón final: deja claro cuánto se cobra antes de tocarlo. */
  readonly textoConfirmar = computed(() => {
    const monto = this.formatearMonto(this.totalSeleccionado());
    return this.modoMedios() === 'total' && this.medioGlobal() === 'MERCADO_PAGO'
      ? `Generar link de ${monto}`
      : `Cobrar ${monto}`;
  });
  readonly puedeConfirmar = computed(() => {
    const cuotas = this.cuotasSeleccionadas();
    if (this.estaBloqueado() || !cuotas.length) return false;
    if (this.modoMedios() === 'total') return !!this.medioElegido();
    const medios = this.mediosPorCuota();
    return cuotas.every((cuota) => !!medios[cuota.cuotaUuid]);
  });

  ngOnChanges(): void {
    if (this.abierto()) {
      if (!this.socios().length && !this.cargandoSocios() && this.pasoActual() === 'socio') {
        this.cargarSocios();
      }
      return;
    }
    this.reiniciar();
  }

  protected cambiarBusquedaSocio(evento: Event): void {
    this.busquedaSocio.set((evento.target as HTMLInputElement).value);
  }

  protected buscarSocios(): void {
    this.paginaSocios.set(1);
    this.cargarSocios();
  }

  protected cambiarPaginaSocios(pagina: number): void {
    this.paginaSocios.set(pagina);
    this.cargarSocios();
  }

  /**
   * Atajo desde la fila de una cuota: arranca el cobro con esa persona y esa cuota ya elegidas,
   * directo en "¿Cómo paga?". "Atrás" muestra el resto de la deuda de esa persona.
   */
  iniciarConCuota(cuota: CuotaRowDto): void {
    this.reiniciar();
    this.personaMemberUuid.set(cuota.personaMemberUuid);
    this.pagador.set(`${cuota.personaNombre} ${cuota.personaApellido}`.trim());
    this.cuotasConocidas.set([cuota]);
    this.seleccionadas.set(new Set([cuota.cuotaUuid]));
    this.totalElementosCuotas.set(1);
    this.pasoActual.set('confirmacion');
  }

  /**
   * Atajo desde la fila de una cuota en Cobros › Cuotas: arranca con esa persona (o su grupo, si es titular)
   * en "¿Qué paga?", con toda su deuda a la vista y marcada, para no cobrar una cuota y olvidar las otras.
   */
  iniciarConSocioDeCuota(cuota: CuotaRowDto): void {
    this.reiniciar();
    this.pagador.set(`${cuota.personaNombre} ${cuota.personaApellido}`.trim());
    if (cuota.personaMemberUuid === cuota.titularMemberUuid) {
      this.titularMemberUuid.set(cuota.titularMemberUuid);
    } else {
      this.personaMemberUuid.set(cuota.personaMemberUuid);
    }
    this.pasoActual.set('deuda');
    this.cargarCuotas(1, true, true);
  }

  /** Desde la pantalla final, arranca un cobro nuevo sin cerrar el popup. */
  cobrarOtroSocio(): void {
    this.reiniciar();
    this.cargarSocios();
  }

  finalizar(): void {
    this.completado.emit();
  }

  protected manejarSocio(evento: EventoAccionTabla<FilaSocioCobro>): void {
    if (evento.accion !== 'seleccionar') return;
    this.socioSeleccionado.set(evento.fila);
    this.pagador.set(`${evento.fila.nombre} ${evento.fila.apellido}`.trim());
    if (this.esTitular(evento.fila)) {
      this.titularMemberUuid.set(evento.fila.memberUuid);
      this.personaMemberUuid.set('');
    } else {
      this.titularMemberUuid.set('');
      this.personaMemberUuid.set(evento.fila.memberUuid);
    }
    this.limpiarDeuda();
    this.pasoActual.set('deuda');
    this.cargarCuotas(1, true, true);
  }

  protected cambiarPaginaCuotas(pagina: number): void {
    this.paginaCuotas.set(pagina);
    this.cargarCuotas(pagina);
  }

  protected estaSeleccionada(cuotaUuid: string): boolean {
    return this.seleccionadas().has(cuotaUuid);
  }

  protected etiquetaEstado(cuota: CuotaRowDto): string {
    return cuota.estado === 'VENCIDA'
      ? `Vencida hace ${cuota.diasMora} ${cuota.diasMora === 1 ? 'día' : 'días'}`
      : `Vence el ${cuota.vencimiento}`;
  }

  protected alternarCuota(cuota: CuotaRowDto, evento: Event): void {
    const seleccionada = (evento.target as HTMLInputElement).checked;
    const ids = new Set(this.seleccionadas());
    seleccionada ? ids.add(cuota.cuotaUuid) : ids.delete(cuota.cuotaUuid);
    this.seleccionadas.set(ids);
  }

  protected alternarSeleccionTotal(): void {
    if (this.todaDeudaSeleccionada()) {
      this.seleccionadas.set(new Set());
      return;
    }
    this.seleccionarTodaLaDeuda();
  }

  protected seleccionarModo(modo: ModoMediosPago): void {
    this.modoMedios.set(modo);
    if (modo === 'por-cuota' && this.medioGlobal() === 'MERCADO_PAGO') {
      this.medioGlobal.set('');
    this.medioOtro.set('');
    }
  }

  protected elegirMedio(valor: MedioPago): void {
    if (valor !== 'OTRO') this.medioOtro.set('');
    this.medioGlobal.set(valor);
  }

  protected actualizarMedioCuota(cuotaUuid: string, valor: string): void {
    this.mediosPorCuota.update((actuales) => ({
      ...actuales,
      [cuotaUuid]: valor as MedioPagoManual | '',
    }));
  }

  protected medioCuota(cuotaUuid: string): string {
    return this.mediosPorCuota()[cuotaUuid] ?? '';
  }

  protected errorCuota(cuotaUuid: string): string {
    return this.erroresPorCuota()[cuotaUuid] ?? '';
  }

  protected formatearMonto(monto: number): string {
    return formatearMoneda(monto);
  }

  /** Usa el importe final calculado por Cobros cuando el contrato lo informa. */
  protected montoACobrar(cuota: CuotaRowDto): number {
    const montoFinal = cuota.montoFinal;
    return typeof montoFinal === 'number' && Number.isFinite(montoFinal) ? montoFinal : cuota.monto;
  }

  protected montoFinalDifiere(cuota: CuotaRowDto): boolean {
    return this.montoACobrar(cuota) !== cuota.monto;
  }

  protected formatearDniSocio(dni: string | null | undefined): string {
    return dni ? formatearDni(dni) : '—';
  }

  anterior(): void {
    if (this.estaBloqueado()) return;
    if (this.pasoActual() === 'confirmacion') {
      this.pasoActual.set('deuda');
      // Si se llegó desde la fila de una cuota, todavía no se cargó el resto de la deuda.
      if (this.totalElementosCuotas() <= 1 && this.cuotasPagina().length === 0) this.cargarCuotas(1);
      return;
    }
    if (this.pasoActual() === 'deuda') {
      this.pasoActual.set('socio');
      // Si se entró por un atajo (fila de una cuota), la lista de socios todavía no se cargó.
      if (!this.socios().length && !this.cargandoSocios()) this.cargarSocios();
    }
  }

  siguiente(): void {
    if (!this.puedeContinuar()) return;
    if (this.pasoActual() === 'deuda') this.pasoActual.set('confirmacion');
  }

  solicitarCancelacion(): void {
    if (!this.estaBloqueado()) this.cancelar.emit();
  }

  async confirmarCobro(): Promise<void> {
    if (!this.puedeConfirmar()) return;
    const cuotas = this.cuotasSeleccionadas();
    const esMercadoPago = this.modoMedios() === 'total' && this.medioGlobal() === 'MERCADO_PAGO';
    const medio = ETIQUETAS_MEDIO[this.medioElegido() as MedioPago] ?? 'distintos medios';
    const confirmado = await this.toast.confirm(
      esMercadoPago
        ? `Vas a generar un link de Mercado Pago para que ${this.pagador() || 'el socio'} pague ${this.formatearMonto(this.totalSeleccionado())}.`
        : `Vas a registrar que ${this.pagador() || 'el socio'} pagó ${this.formatearMonto(this.totalSeleccionado())} ${this.modoMedios() === 'total' ? `en ${medio.toLowerCase()}` : 'con distintos medios'}.`,
      {
        titulo: esMercadoPago ? 'Generar checkout' : 'Confirmar cobro',
        textoConfirmar: esMercadoPago ? 'Generar link' : 'Sí, registrar cobro',
      },
    );
    if (!confirmado || !this.puedeConfirmar()) return;

    if (esMercadoPago) {
      this.iniciarCheckoutMercadoPago(cuotas);
      return;
    }

    const grupos = this.construirGruposCobro(cuotas);
    this.procesando.set(true);
    this.error.set('');
    this.erroresPorCuota.set({});

    from(grupos)
      .pipe(
        concatMap(([medioPago, cuotaUuids]) =>
          this.tesoreriaApi
            .cobrarManual(
              { cuotaUuids, canalCobro: 'MANUAL', medioPago },
              { mostrarToastExito: false },
            )
            .pipe(
              map((resultado) => this.normalizarResultado(cuotaUuids, resultado.items)),
              catchError(() =>
                of(
                  cuotaUuids.map((cuotaUuid) => ({
                    cuotaUuid,
                    exitoso: false,
                    mensajeError: 'No se pudo registrar este grupo de cobros.',
                  })),
                ),
              ),
            ),
        ),
        toArray(),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.procesando.set(false)),
      )
      .subscribe((resultadosAgrupados) => this.procesarResultados(resultadosAgrupados.flat()));
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
    this.cobrosActualizados.emit();
    this.completado.emit();
  }

  private iniciarCheckoutMercadoPago(cuotas: readonly CuotaRowDto[]): void {
    if (this.procesando() || this.checkout()) return;
    const cuotaUuids = cuotas.map((cuota) => cuota.cuotaUuid);
    this.procesando.set(true);
    this.error.set('');
    this.tesoreriaApi
      .iniciarCobroMercadoPago({
        cuotaUuids,
        canalCobro: 'MERCADO_PAGO',
        medioPago: 'MERCADO_PAGO',
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.procesando.set(false)),
      )
      .subscribe({
        next: async ({ mercadoPagoInitPoint, mercadoPagoPreferenceId }) => {
          const enlace = this.mercadoPagoCheckout.normalizarEnlace(mercadoPagoInitPoint);
          if (!enlace) {
            this.error.set('Mercado Pago no devolvió un destino de pago válido.');
            return;
          }

          this.mensajeCheckout.set('');
          this.errorCheckout.set('');
          this.checkout.set({ enlace, qr: '', preferenceId: mercadoPagoPreferenceId });
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

  private mensajeErrorMercadoPago(error: unknown): string {
    return (error as { readonly status?: number })?.status === 403
      ? 'No tenés permisos para iniciar cobros con Mercado Pago.'
      : 'No se pudo iniciar el pago con Mercado Pago. La selección se conservó.';
  }

  private cargarSocios(): void {
    if (!this.deudaPorMiembro()) this.cargarResumenDeuda();
    this.cargandoSocios.set(true);
    this.error.set('');
    this.sociosApi
      .paginar({
        page: this.paginaSocios(),
        size: 8,
        search: this.busquedaSocio().trim(),
        estados: ESTADOS_SOCIO,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cargandoSocios.set(false)),
      )
      .subscribe({
        next: (respuesta) => {
          this.sociosSinDeuda.set(respuesta.content);
          this.socios.set(this.conDeuda(respuesta.content));
          this.totalPaginasSocios.set(Math.max(1, respuesta.totalPages));
        },
        error: () => this.error.set('No se pudieron cargar los socios.'),
      });
  }

  private readonly sociosSinDeuda = signal<readonly SocioDto[]>([]);

  /** Agrega "Debe" a cada socio y deja primero a quienes tienen deuda. */
  private conDeuda(socios: readonly SocioDto[]): readonly FilaSocioCobro[] {
    const deudas = this.deudaPorMiembro();
    const filas = socios.map((socio) => {
      const monto = deudas?.get(socio.memberUuid) ?? 0;
      return {
        ...socio,
        tipoIntegrante: this.esTitular(socio)
          ? 'Titular'
          : `Familiar${socio.parentesco ? ` · ${socio.parentesco}` : ''}`,
        deuda: !deudas ? '' : monto > 0 ? this.formatearMonto(monto) : 'Al día',
        montoDeuda: monto,
      };
    });
    return [...filas]
      .sort((a, b) => b.montoDeuda - a.montoDeuda)
      .map(({ montoDeuda: _montoDeuda, ...fila }) => fila);
  }

  /** Una sola consulta de cuotas impagas para mostrar cuánto debe cada socio del listado. */
  private cargarResumenDeuda(): void {
    this.tesoreriaApi
      .paginarCuotas({
        page: 1,
        size: TAMANO_RESUMEN_DEUDA,
        estados: ['PENDIENTE', 'VENCIDA'],
        orden: 'VENCIMIENTO_ASC',
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (respuesta) => {
          // Con más cuotas que las consultadas, los montos quedarían incompletos: no se muestran.
          if (respuesta.totalElements > respuesta.content.length) return;
          const deudas = new Map<string, number>();
          respuesta.content.forEach((cuota) => {
            const monto = this.montoACobrar(cuota);
            deudas.set(cuota.titularMemberUuid, (deudas.get(cuota.titularMemberUuid) ?? 0) + monto);
            if (cuota.personaMemberUuid !== cuota.titularMemberUuid) {
              deudas.set(cuota.personaMemberUuid, (deudas.get(cuota.personaMemberUuid) ?? 0) + monto);
            }
          });
          this.deudaPorMiembro.set(deudas);
          this.socios.set(this.conDeuda(this.sociosSinDeuda()));
        },
        error: () => undefined,
      });
  }

  private cargarCuotas(pagina: number, limpiarError = true, preseleccionar = false): void {
    if (!this.titularMemberUuid() && !this.personaMemberUuid()) return;
    this.cargandoCuotas.set(true);
    if (limpiarError) this.error.set('');
    this.tesoreriaApi
      .paginarCuotas(this.crearRequestCuotas(pagina))
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cargandoCuotas.set(false)),
      )
      .subscribe({
        next: (respuesta) => {
          this.cuotasPagina.set(respuesta.content);
          this.cuotasConocidas.set(this.unificarCuotas(this.cuotasConocidas(), respuesta.content));
          this.paginaCuotas.set(pagina);
          this.totalPaginasCuotas.set(Math.max(1, respuesta.totalPages));
          this.totalElementosCuotas.set(respuesta.totalElements);
          // Lo habitual es cobrar todo lo adeudado: arranca marcado y se destilda lo que no paga.
          if (preseleccionar && respuesta.totalElements > 0) this.seleccionarTodaLaDeuda();
        },
        error: () => this.error.set('No se pudo cargar la deuda del grupo familiar.'),
      });
  }

  private seleccionarTodaLaDeuda(): void {
    const totalPaginas = this.totalPaginasCuotas();
    if ((!this.titularMemberUuid() && !this.personaMemberUuid()) || !this.totalElementosCuotas())
      return;
    const seleccionAnterior = this.seleccionadas();
    this.cargandoSeleccionTotal.set(true);
    this.error.set('');

    from(Array.from({ length: totalPaginas }, (_, indice) => indice + 1))
      .pipe(
        mergeMap((pagina) => this.tesoreriaApi.paginarCuotas(this.crearRequestCuotas(pagina)), 3),
        toArray(),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cargandoSeleccionTotal.set(false)),
      )
      .subscribe({
        next: (paginas) => {
          const cuotas = this.unificarCuotas(
            [],
            paginas.flatMap((pagina) => pagina.content),
          );
          if (cuotas.length !== this.totalElementosCuotas()) {
            this.seleccionadas.set(seleccionAnterior);
            this.error.set('La deuda cambió durante la selección. Volvé a intentarlo.');
            return;
          }
          this.cuotasConocidas.set(cuotas);
          this.seleccionadas.set(new Set(cuotas.map((cuota) => cuota.cuotaUuid)));
        },
        error: () => {
          this.seleccionadas.set(seleccionAnterior);
          this.error.set(
            'No se pudo seleccionar toda la deuda. La selección anterior se conservó.',
          );
        },
      });
  }

  private crearRequestCuotas(page: number) {
    return {
      page,
      size: TAMANO_PAGINA,
      estados: ['PENDIENTE', 'VENCIDA'] as const,
      ...(this.personaMemberUuid()
        ? { personaMemberUuid: this.personaMemberUuid() }
        : { titularMemberUuid: this.titularMemberUuid() }),
      // Las más viejas (vencidas) primero.
      orden: 'VENCIMIENTO_ASC' as const,
    };
  }

  private construirGruposCobro(
    cuotas: readonly CuotaRowDto[],
  ): readonly [MedioPagoManual, readonly string[]][] {
    const grupos = new Map<MedioPagoManual, string[]>();
    cuotas.forEach((cuota) => {
      const medio =
        this.modoMedios() === 'total'
          ? (this.medioElegido() as MedioPagoManual)
          : (this.mediosPorCuota()[cuota.cuotaUuid] as MedioPagoManual);
      grupos.set(medio, [...(grupos.get(medio) ?? []), cuota.cuotaUuid]);
    });
    return [...grupos.entries()];
  }

  private normalizarResultado(
    cuotaUuids: readonly string[],
    items: readonly CobroCuotaItemResultDto[],
  ): readonly CobroCuotaItemResultDto[] {
    const porUuid = new Map(items.map((item) => [item.cuotaUuid, item]));
    return cuotaUuids.map(
      (cuotaUuid) =>
        porUuid.get(cuotaUuid) ?? {
          cuotaUuid,
          exitoso: false,
          mensajeError: 'El backend no informó el resultado de esta cuota.',
        },
    );
  }

  private procesarResultados(resultados: readonly CobroCuotaItemResultDto[]): void {
    const exitosas = resultados.filter((resultado) => resultado.exitoso);
    const fallidas = resultados.filter((resultado) => !resultado.exitoso);
    if (exitosas.length) this.cobrosActualizados.emit();

    if (!fallidas.length) {
      // Pantalla final en lugar de cerrar: confirma qué se registró y permite seguir cobrando.
      this.resultado.set({
        pagador: this.pagador(),
        monto: this.totalSeleccionado(),
        medio:
          this.modoMedios() === 'total'
            ? (ETIQUETAS_MEDIO[this.medioElegido() as MedioPago] ?? '')
            : 'distintos medios',
        cantidad: exitosas.length,
      });
      this.pasoActual.set('listo');
      return;
    }

    const idsFallidas = new Set(fallidas.map((resultado) => resultado.cuotaUuid));
    this.erroresPorCuota.set(
      Object.fromEntries(
        fallidas.map((resultado) => [
          resultado.cuotaUuid,
          resultado.mensajeError || 'No se pudo registrar el cobro.',
        ]),
      ),
    );
    this.seleccionadas.set(idsFallidas);
    this.cuotasConocidas.set(
      this.cuotasConocidas().filter((cuota) => idsFallidas.has(cuota.cuotaUuid)),
    );
    this.mediosPorCuota.update((actuales) =>
      Object.fromEntries(
        Object.entries(actuales).filter(([cuotaUuid]) => idsFallidas.has(cuotaUuid)),
      ),
    );
    this.error.set(
      `${exitosas.length} cobro(s) aplicado(s) y ${fallidas.length} pendiente(s) de reintento.`,
    );
    this.toast.error(this.error(), { titulo: 'Cobro parcial' });
    this.cargarCuotas(1, false);
  }

  private unificarCuotas(
    actuales: readonly CuotaRowDto[],
    nuevas: readonly CuotaRowDto[],
  ): readonly CuotaRowDto[] {
    const porUuid = new Map(actuales.map((cuota) => [cuota.cuotaUuid, cuota]));
    nuevas.forEach((cuota) => porUuid.set(cuota.cuotaUuid, cuota));
    return [...porUuid.values()];
  }

  private esTitular(socio: SocioDto): boolean {
    return socio.titular === true || (socio.titular === undefined && !socio.titularMemberUuid);
  }

  private estaBloqueado(): boolean {
    return this.procesando() || this.cargandoSeleccionTotal() || this.checkoutActivo();
  }

  private limpiarDeuda(): void {
    this.cuotasPagina.set([]);
    this.cuotasConocidas.set([]);
    this.paginaCuotas.set(1);
    this.totalPaginasCuotas.set(1);
    this.totalElementosCuotas.set(0);
    this.seleccionadas.set(new Set());
    this.modoMedios.set('total');
    this.medioGlobal.set('');
    this.medioOtro.set('');
    this.mediosPorCuota.set({});
    this.erroresPorCuota.set({});
    this.checkout.set(null);
    this.mensajeCheckout.set('');
    this.errorCheckout.set('');
    this.error.set('');
  }

  private reiniciar(): void {
    this.pasoActual.set('socio');
    this.socioSeleccionado.set(null);
    this.pagador.set('');
    this.resultado.set(null);
    // Después de un cobro la deuda cambió: se vuelve a calcular al listar socios.
    this.deudaPorMiembro.set(null);
    this.titularMemberUuid.set('');
    this.personaMemberUuid.set('');
    this.busquedaSocio.set('');
    this.socios.set([]);
    this.paginaSocios.set(1);
    this.totalPaginasSocios.set(1);
    this.limpiarDeuda();
  }
}
