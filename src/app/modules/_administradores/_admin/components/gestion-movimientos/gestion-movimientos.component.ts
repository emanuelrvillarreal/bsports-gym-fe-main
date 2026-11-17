import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroPlus } from '@ng-icons/heroicons/outline';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import { formatearMoneda, normalizarValorMoneda } from '../../../../../helpers/moneda-formato';
import { crearRangoMensual, crearRangoMensualActual } from '../../../../../helpers/fecha-formato';
import {
  EstadoMovimiento,
  MedioPagoManual,
  MovimientoDetalleDto,
  MovimientoManualPayload,
  MovimientoRowDto,
  TipoMovimiento,
} from '../../../../../core/api/interfaces/tesoreria.interfaces';
import { TesoreriaApiService } from '../../../../../core/api/services/tesoreria-api.service';
import { BotonComponent } from '../../../../ui/boton/boton.component';
import { CardComponent } from '../../../../ui/card/card.component';
import { PaginacionComponent } from '../../../../ui/paginacion/paginacion.component';
import { PopupComponent } from '../../../../ui/popup/popup.component';
import { InputPeriodoComponent } from '../../../../ui/input-periodo/input-periodo.component';
import { SelectComponent, SelectOption } from '../../../../ui/select/select.component';
import { ColumnaTabla, EventoAccionTabla, TablaResponsiveComponent, ValorInputTabla } from '../../../../ui/tabla-responsive/tabla-responsive.component';
import { FormularioAnulacionComponent } from '../../forms/formulario-anulacion/formulario-anulacion.component';
import { FormularioMovimientoComponent } from '../../forms/formulario-movimiento/formulario-movimiento.component';
import { TituloHeroComponent } from '../../../../ui/titulo-hero/titulo-hero.component';

@Component({
  selector: 'app-gestion-movimientos',
  imports: [BotonComponent, CardComponent, FormularioAnulacionComponent, FormularioMovimientoComponent, FormsModule, InputPeriodoComponent, NgIcon, NgTemplateOutlet, PaginacionComponent, PopupComponent, SelectComponent, TablaResponsiveComponent, TituloHeroComponent],
  providers: [provideIcons({ heroPlus })],
  templateUrl: './gestion-movimientos.component.html',
  styleUrl: './gestion-movimientos.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GestionMovimientosComponent {
  readonly tipoFijo = input<TipoMovimiento | null>(null);
  readonly titulo = input('Movimientos');
  /** Activa la variante de alta inline de movimientos. */
  readonly altaInline = input(false);
  private readonly api = inject(TesoreriaApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly filas = signal<readonly MovimientoRowDto[]>([]);
  protected readonly pagina = signal(1);
  protected readonly totalPaginas = signal(1);
  protected readonly periodo = signal('');
  protected readonly tipo = signal<TipoMovimiento | ''>('');
  protected readonly opcionesTipo: readonly SelectOption[] = [
    { value: '', label: 'Todos' },
    { value: 'INGRESO', label: 'Ingreso' },
    { value: 'EGRESO', label: 'Egreso' },
  ];
  protected readonly incluirAnulados = signal(false);
  protected readonly cargando = signal(false);
  protected readonly procesando = signal(false);
  protected readonly error = signal('');
  protected readonly altaAbierta = signal(false);
  protected readonly filaIngresoVisible = signal(false);
  protected readonly versionVisibilidadFilaIngreso = signal(0);
  protected readonly versionReinicioFilaIngreso = signal(0);
  protected readonly mantenerFilaIngresoAbierta = signal(false);
  protected readonly detalle = signal<MovimientoDetalleDto | null>(null);
  protected readonly movimientoAnular = signal<MovimientoRowDto | null>(null);
  protected readonly columnas = computed<readonly ColumnaTabla<MovimientoRowDto>[]>(() => {
    const tipoFijo = this.tipoFijo();
    return [
      // El control nativo no respeta maxlength; este límite mantiene el año en cuatro dígitos.
      {
        id: 'fecha',
        titulo: 'Fecha',
        tipo: 'fecha',
        inputType: 'date',
        max: '9999-12-31',
        ancho: 'minmax(11rem, 1fr)',
      },
      {
        id: 'tipo',
        titulo: 'Tipo',
        trInputEditable: tipoFijo === null,
        trInputTipo: 'select',
        opciones: [
          { value: 'INGRESO', label: 'Ingreso' },
          { value: 'EGRESO', label: 'Egreso' },
        ],
      },
      { id: 'concepto', titulo: 'Concepto', maxLength: 255 },
      {
        id: 'monto',
        titulo: 'Monto',
        tipo: 'moneda',
        inputMode: 'decimal',
        formatearTexto: (valor, fila) =>
          `${fila.tipo === 'EGRESO' ? '-' : ''}${formatearMoneda(Number(valor) || 0)}`,
        celdaColor: (_, fila) =>
          fila.tipo === 'EGRESO' ? 'var(--semantic-danger)' : 'var(--semantic-success, #16a34a)',
      },
      {
        id: 'medioPago',
        titulo: 'Medio de pago',
        trInputTipo: 'select',
        trInputVisible: (valores) => (tipoFijo ?? valores['tipo']) === 'INGRESO',
        opciones: [
          { value: 'EFECTIVO', label: 'Efectivo' },
          { value: 'TRANSFERENCIA', label: 'Transferencia' },
          { value: 'DEBITO', label: 'Tarjeta de débito' },
          { value: 'DEBITO_AUTOMATICO', label: 'Débito automático' },
          { value: 'CREDITO', label: 'Tarjeta de crédito' },
          { value: 'CHEQUE', label: 'Cheque' },
          { value: 'NFC', label: 'Pago con celular (NFC)' },
          { value: 'OTRO', label: 'Otro' },
        ],
      },
      { id: 'origen', titulo: 'Origen', trInputEditable: false },
      { id: 'estado', titulo: 'Estado', tipo: 'estado', trInputEditable: false },
    ];
  });
  protected readonly acciones = [
    'ver',
    {
      id: 'anular',
      texto: 'Anular',
      icono: 'heroTrash',
      color: 'var(--app-danger)',
      visible: (fila: MovimientoRowDto) => fila.estado === 'ACTIVO',
    },
  ] as const;

  constructor() { this.cargar(); }

  protected filtrar(): void { this.pagina.set(1); this.cargar(); }
  protected actualizarPeriodo(periodo: string): void {
    this.periodo.set(periodo);
    this.filtrar();
  }
  protected actualizarTipoFiltro(tipo: TipoMovimiento | ''): void {
    this.tipo.set(tipo);
    this.filtrar();
  }
  protected actualizarIncluirAnulados(evento: Event): void {
    this.incluirAnulados.set((evento.target as HTMLInputElement).checked);
    this.filtrar();
  }
  protected cambiarPagina(pagina: number): void { this.pagina.set(pagina); this.cargar(); }
  protected manejarAccion(evento: EventoAccionTabla<MovimientoRowDto>): void {
    if (evento.accion === 'ver') this.cargarDetalle(evento.fila.movimientoUuid);
    if (evento.accion === 'anular') this.movimientoAnular.set(evento.fila);
  }
  protected crear(payload: MovimientoManualPayload): void {
    if (this.procesando()) return;
    this.procesando.set(true); this.error.set('');
    this.api.crearMovimiento(payload).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.procesando.set(false))).subscribe({
      next: () => { this.altaAbierta.set(false); this.cargar(); },
      error: () => this.error.set('No se pudo registrar el movimiento. El formulario se conservó.'),
    });
  }
  protected guardarMovimientoInline(valores: Partial<Record<string, ValorInputTabla>>): void {
    if (this.procesando()) return;

    const payload = this.construirMovimientoManual(valores);
    if (!payload) {
      this.error.set('Ingresá tipo, concepto y un monto mayor a cero. Los ingresos requieren medio de pago.');
      return;
    }

    this.procesando.set(true);
    this.error.set('');
    this.api.crearMovimiento(payload).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.procesando.set(false))).subscribe({
      next: () => {
        this.versionReinicioFilaIngreso.update((version) => version + 1);
        if (!this.mantenerFilaIngresoAbierta()) {
          this.filaIngresoVisible.set(false);
          this.versionVisibilidadFilaIngreso.update((version) => version + 1);
        }
        this.pagina.set(1);
        this.cargar();
      },
      error: () => this.error.set('No se pudo registrar el movimiento. La fila se conservó.'),
    });
  }
  protected actualizarVisibilidadFilaIngreso(visible: boolean): void {
    this.filaIngresoVisible.set(visible);
    this.versionVisibilidadFilaIngreso.update((version) => version + 1);
  }
  protected abrirFilaMovimiento(): void {
    this.versionReinicioFilaIngreso.update((version) => version + 1);
    this.actualizarVisibilidadFilaIngreso(true);
  }
  protected alternarHoldIngreso(evento: Event): void {
    const activo = (evento.target as HTMLInputElement).checked;
    if (activo && !this.filaIngresoVisible()) {
      this.abrirFilaMovimiento();
    }
    this.actualizarHoldIngreso(activo);
  }
  protected actualizarHoldIngreso(activo: boolean): void {
    this.mantenerFilaIngresoAbierta.set(activo);
  }
  protected formatearMonto(valor: number): string { return formatearMoneda(valor); }
  protected formatearOrigen(origen: string): string { return origen.replaceAll('_', ' '); }
  protected formatearEstado(estado: EstadoMovimiento): string {
    return estado === 'ACTIVO' ? 'Activo' : 'Anulado';
  }
  protected anular(payload: { readonly motivo: string }): void {
    const movimiento = this.movimientoAnular();
    if (!movimiento || this.procesando()) return;
    this.procesando.set(true); this.error.set('');
    this.api.anularMovimiento(movimiento.movimientoUuid, payload).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.procesando.set(false))).subscribe({
      next: () => { this.movimientoAnular.set(null); this.cargar(); },
      error: () => this.error.set('No se pudo anular el movimiento. El motivo se conservó.'),
    });
  }

  private cargar(): void {
    this.cargando.set(true); this.error.set('');
    const tipo = (this.tipoFijo() ?? this.tipo()) || undefined;
    const estados: readonly EstadoMovimiento[] = this.incluirAnulados() ? ['ACTIVO', 'ANULADO'] : ['ACTIVO'];
    const rangoFechas = this.rangoFechasSeleccionado();
    this.api.paginarMovimientos({
      page: this.pagina(), size: 20, estados,
      ...(tipo ? { tipo } : {}),
      ...(rangoFechas ?? {}),
    }).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.cargando.set(false))).subscribe({
      next: (respuesta) => { this.filas.set(respuesta.content); this.totalPaginas.set(Math.max(1, respuesta.totalPages)); },
      error: () => this.error.set('No se pudieron cargar los movimientos.'),
    });
  }
  private cargarDetalle(uuid: string): void {
    this.api.obtenerMovimiento(uuid).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (detalle) => this.detalle.set(detalle),
      error: () => this.error.set('No se pudo cargar el detalle del movimiento.'),
    });
  }

  private rangoFechasSeleccionado(): { readonly fechaDesde: string; readonly fechaHasta: string } {
    const periodo = this.periodo() || this.periodoActual();
    const coincidencia = /^(0[1-9]|1[0-2])-(\d{4})$/.exec(periodo);
    if (!coincidencia) return crearRangoMensualActual();

    const mes = Number(coincidencia[1]);
    const anio = Number(coincidencia[2]);
    return crearRangoMensual(anio, mes);
  }

  private periodoActual(): string {
    const fecha = new Date();
    return `${String(fecha.getMonth() + 1).padStart(2, '0')}-${fecha.getFullYear()}`;
  }

  private construirMovimientoManual(
    valores: Partial<Record<string, ValorInputTabla>>,
  ): MovimientoManualPayload | null {
    const monto = normalizarValorMoneda(String(valores['monto'] ?? ''));
    const concepto = String(valores['concepto'] ?? '').trim();
    const tipo = this.tipoFijo() ?? String(valores['tipo'] ?? '') as TipoMovimiento;
    const medioPago = String(valores['medioPago'] ?? '') as MedioPagoManual;
    const fecha = String(valores['fecha'] ?? '').trim();

    if (!this.esTipoMovimiento(tipo) || !concepto || !Number.isFinite(monto) || monto <= 0) {
      return null;
    }
    if (tipo === 'INGRESO' && !this.esMedioPagoManual(medioPago)) {
      return null;
    }

    return {
      tipo,
      monto,
      concepto,
      ...(tipo === 'INGRESO' ? { medioPago } : {}),
      ...(fecha ? { fecha } : {}),
    };
  }
  private esMedioPagoManual(valor: string): valor is MedioPagoManual {
    return ['EFECTIVO', 'TRANSFERENCIA', 'OTRO', 'DEBITO', 'DEBITO_AUTOMATICO', 'CREDITO', 'CHEQUE', 'NFC'].includes(valor);
  }
  private esTipoMovimiento(valor: string): valor is TipoMovimiento {
    return valor === 'INGRESO' || valor === 'EGRESO';
  }
}
