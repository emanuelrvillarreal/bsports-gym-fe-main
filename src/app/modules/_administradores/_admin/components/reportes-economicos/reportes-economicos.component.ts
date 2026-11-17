import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription, finalize } from 'rxjs';

import {
  CategoriaMovimiento,
  ComparacionPeriodosDto,
  MedioPagoReporte,
  ReporteCuotasDto,
  ReporteEconomicoDto,
  ReporteEconomicoFiltros,
  ReporteGrupoDto,
  ReporteMovimientoDto,
  TipoMovimientoReporte,
} from '../../../../../core/api/interfaces/reportes-economicos.interfaces';
import { ActividadesApiService } from '../../../../../core/api/services/actividades-api.service';
import { CategoriasApiService } from '../../../../../core/api/services/categorias-api.service';
import { ReportesEconomicosApiService } from '../../../../../core/api/services/reportes-economicos-api.service';
import { formatearMoneda } from '../../../../../helpers/moneda-formato';
import {
  etiquetaMes,
  formatearFechaAsistencia,
} from '../../../../_compartido-perfiles/components/seguimiento-asistencia/seguimiento-asistencia.helpers';
import { BotonComponent } from '../../../../ui/boton/boton.component';
import { BarraGrafico, GraficoBarrasComponent } from '../../../../ui/grafico-barras/grafico-barras.component';
import { InputFechaComponent } from '../../../../ui/input-fecha/input-fecha.component';
import { PaginacionComponent } from '../../../../ui/paginacion/paginacion.component';
import { SelectComponent, SelectOption } from '../../../../ui/select/select.component';
import { ColumnaTabla, TablaResponsiveComponent } from '../../../../ui/tabla-responsive/tabla-responsive.component';
import { ToastAlertService } from '../../../../ui/toast-alert/services/toast-alert.service';
import {
  ComparacionRapida,
  OPCIONES_COMPARACION,
  OPCIONES_PERIODO_REPORTE,
  PeriodoReporte,
  Rango,
  formatearVariacion,
  periodosComparacion,
  rangoReporte,
} from './reportes-economicos.helpers';

type Vista = 'movimientos' | 'cuotas' | 'comparar';
type FilaMovimiento = ReporteMovimientoDto & { readonly fechaTexto: string };

const TAMANIO_PAGINA = 20;

/**
 * Cobros › Reportes: movimientos económicos con filtros combinables y descarga en Excel,
 * reporte de cuotas (generado vs. cobrado) y comparación de períodos. Solo ADMIN.
 * Amplía el módulo financiero existente: todo sale de los movimientos reales de caja.
 */
@Component({
  selector: 'app-reportes-economicos',
  standalone: true,
  imports: [
    BotonComponent,
    GraficoBarrasComponent,
    InputFechaComponent,
    PaginacionComponent,
    SelectComponent,
    TablaResponsiveComponent,
  ],
  templateUrl: './reportes-economicos.component.html',
  styleUrl: './reportes-economicos.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportesEconomicosComponent {
  private readonly api = inject(ReportesEconomicosApiService);
  private readonly actividadesApi = inject(ActividadesApiService);
  private readonly categoriasApi = inject(CategoriasApiService);
  private readonly toast = inject(ToastAlertService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly vista = signal<Vista>('movimientos');

  // ------------------------------------------------------------ Filtros de movimientos
  protected readonly opcionesPeriodo = OPCIONES_PERIODO_REPORTE;
  protected readonly periodo = signal<PeriodoReporte>('mes');
  protected readonly desde = signal('');
  protected readonly hasta = signal('');
  protected readonly tipo = signal<TipoMovimientoReporte | ''>('');
  protected readonly categorias = signal<readonly CategoriaMovimiento[]>([]);
  protected readonly actividadUuid = signal('');
  protected readonly socio = signal('');
  protected readonly categoriaSocioUuid = signal('');
  protected readonly medios = signal<readonly MedioPagoReporte[]>([]);
  protected readonly incluirAnulados = signal(false);
  protected readonly concepto = signal('');
  protected readonly importeMinimo = signal('');
  protected readonly importeMaximo = signal('');
  protected readonly pagina = signal(1);

  protected readonly opcionesCategoria: readonly { readonly id: CategoriaMovimiento; readonly etiqueta: string }[] = [
    { id: 'CUOTA_SOCIAL', etiqueta: 'Cuotas sociales' },
    { id: 'CUOTA_ACTIVIDAD', etiqueta: 'Cuotas de actividades' },
    { id: 'PASE', etiqueta: 'Pases y membresías' },
    { id: 'AMENITY', etiqueta: 'Instalaciones' },
    { id: 'EVENTO', etiqueta: 'Entradas a eventos' },
    { id: 'MANUAL', etiqueta: 'Otros ingresos y gastos' },
  ];
  protected readonly opcionesMedio: readonly { readonly id: MedioPagoReporte; readonly etiqueta: string }[] = [
    { id: 'EFECTIVO', etiqueta: 'Efectivo' },
    { id: 'TRANSFERENCIA', etiqueta: 'Transferencia' },
    { id: 'MERCADO_PAGO', etiqueta: 'Mercado Pago' },
    { id: 'DEBITO', etiqueta: 'Tarjeta de débito' },
    { id: 'DEBITO_AUTOMATICO', etiqueta: 'Débito automático' },
    { id: 'CREDITO', etiqueta: 'Tarjeta de crédito' },
    { id: 'CHEQUE', etiqueta: 'Cheque' },
    { id: 'NFC', etiqueta: 'Pago con celular (NFC)' },
    { id: 'OTRO', etiqueta: 'Otro' },
  ];
  protected readonly opcionesTipo: readonly SelectOption[] = [
    { value: '', label: 'Ingresos y egresos' },
    { value: 'INGRESO', label: 'Solo ingresos' },
    { value: 'EGRESO', label: 'Solo egresos' },
  ];
  private readonly catalogoActividades = signal<readonly SelectOption[]>([]);
  private readonly catalogoCategorias = signal<readonly SelectOption[]>([]);
  protected readonly opcionesActividades = computed<readonly SelectOption[]>(() => [
    { value: '', label: 'Todas las actividades' },
    ...this.catalogoActividades(),
  ]);
  protected readonly opcionesCategoriasSocio = computed<readonly SelectOption[]>(() => [
    { value: '', label: 'Todas las categorías' },
    ...this.catalogoCategorias(),
  ]);

  protected readonly datos = signal<ReporteEconomicoDto | null>(null);
  protected readonly cargando = signal(false);
  protected readonly error = signal('');
  protected readonly descargando = signal(false);
  private consultaSub?: Subscription;
  private textoTimer?: ReturnType<typeof setTimeout>;

  protected readonly rangoActual = computed((): Rango | null => {
    if (this.periodo() === 'personalizado') {
      return this.desde() && this.hasta() ? { desde: this.desde(), hasta: this.hasta() } : null;
    }
    return rangoReporte(this.periodo());
  });

  /** Filtros tal cual se mandan al backend: la pantalla y el Excel usan exactamente estos. */
  protected readonly filtros = computed((): ReporteEconomicoFiltros => {
    const rango = this.rangoActual();
    const minimo = Number(this.importeMinimo());
    const maximo = Number(this.importeMaximo());
    return {
      desde: rango?.desde ?? null,
      hasta: rango?.hasta ?? null,
      tipo: this.tipo() || null,
      categorias: this.categorias(),
      actividadUuid: this.actividadUuid() || null,
      socio: this.socio().trim() || null,
      categoriaSocioUuid: this.categoriaSocioUuid() || null,
      mediosPago: this.medios(),
      estados: this.incluirAnulados() ? ['ACTIVO', 'ANULADO'] : ['ACTIVO'],
      concepto: this.concepto().trim() || null,
      importeMinimo: this.importeMinimo() !== '' && Number.isFinite(minimo) ? minimo : null,
      importeMaximo: this.importeMaximo() !== '' && Number.isFinite(maximo) ? maximo : null,
      page: this.pagina(),
      size: TAMANIO_PAGINA,
    };
  });

  protected readonly hayFiltros = computed(
    () =>
      this.periodo() !== 'mes' ||
      !!this.tipo() ||
      this.categorias().length > 0 ||
      !!this.actividadUuid() ||
      !!this.socio().trim() ||
      !!this.categoriaSocioUuid() ||
      this.medios().length > 0 ||
      this.incluirAnulados() ||
      !!this.concepto().trim() ||
      this.importeMinimo() !== '' ||
      this.importeMaximo() !== '',
  );

  protected readonly resumen = computed(() => this.datos()?.resumen ?? null);
  protected readonly totalMovimientos = computed(() => this.datos()?.movimientos.totalElements ?? 0);
  protected readonly totalPaginas = computed(() => Math.max(1, this.datos()?.movimientos.totalPages ?? 1));
  protected readonly filas = computed((): readonly FilaMovimiento[] =>
    (this.datos()?.movimientos.content ?? []).map((fila) => ({ ...fila, fechaTexto: formatearFechaAsistencia(fila.fecha) })),
  );

  protected readonly columnas: readonly ColumnaTabla<FilaMovimiento>[] = [
    { id: 'fechaTexto', titulo: 'Fecha', ancho: '7rem', prioridadMobile: true },
    { id: 'operacion', titulo: 'Operación', ancho: '8rem' },
    { id: 'tipo', titulo: 'Tipo', ancho: '6.5rem' },
    { id: 'categoriaTexto', titulo: 'Categoría', ancho: 'minmax(9rem, 1fr)' },
    { id: 'concepto', titulo: 'Concepto', ancho: 'minmax(12rem, 1.6fr)', prioridadMobile: true },
    { id: 'actividad', titulo: 'Actividad', ancho: 'minmax(7rem, .8fr)' },
    { id: 'socio', titulo: 'Socio', ancho: 'minmax(9rem, 1fr)' },
    { id: 'medioPago', titulo: 'Medio', ancho: '8rem' },
    { id: 'importe', titulo: 'Importe', ancho: '8.5rem', prioridadMobile: true },
    { id: 'estado', titulo: 'Estado', ancho: '6rem' },
  ];

  protected readonly barrasMensuales = computed((): readonly BarraGrafico[] => {
    const meses = this.datos()?.mensual ?? [];
    return meses.flatMap((mes) => {
      const tope = Math.max(1, mes.ingresos, mes.egresos);
      return [
        { id: `${mes.clave}-i`, nombre: 'Ingresos', grupoNombre: etiquetaMes(mes.clave), valor: mes.ingresos, tope, color: 'var(--semantic-success)', etiquetaValor: formatearMoneda(mes.ingresos) },
        { id: `${mes.clave}-e`, nombre: 'Egresos', grupoNombre: etiquetaMes(mes.clave), valor: mes.egresos, tope, color: 'var(--semantic-danger)', etiquetaValor: formatearMoneda(mes.egresos) },
      ];
    });
  });
  protected readonly barrasCategoria = computed(() => this.barras(this.datos()?.porCategoria ?? [], 'total'));
  protected readonly barrasActividad = computed(() =>
    this.barras((this.datos()?.porActividad ?? []).filter((g) => g.ingresos > 0), 'ingresos'),
  );
  protected readonly barrasMedio = computed(() => this.barras(this.datos()?.porMedioPago ?? [], 'total'));

  // ------------------------------------------------------------ Cuotas
  protected readonly periodoCuotas = signal<PeriodoReporte>('mes');
  protected readonly desdeCuotas = signal('');
  protected readonly hastaCuotas = signal('');
  protected readonly actividadCuotas = signal('');
  protected readonly tipoCuotas = signal<'' | 'SOCIAL' | 'ACTIVIDAD' | 'PASE'>('');
  protected readonly cuotas = signal<ReporteCuotasDto | null>(null);
  protected readonly cargandoCuotas = signal(false);
  protected readonly opcionesTipoCuota: readonly SelectOption[] = [
    { value: '', label: 'Todas' },
    { value: 'SOCIAL', label: 'Solo cuotas sociales' },
    { value: 'ACTIVIDAD', label: 'Solo cuotas de actividades' },
    { value: 'PASE', label: 'Solo pases y membresías' },
  ];

  // ------------------------------------------------------------ Comparación
  protected readonly opcionesComparacion = OPCIONES_COMPARACION;
  protected readonly comparacionRapida = signal<ComparacionRapida>('mesVsAnterior');
  protected readonly periodoA = signal<Rango>({ desde: '', hasta: '' });
  protected readonly periodoB = signal<Rango>({ desde: '', hasta: '' });
  protected readonly comparacion = signal<ComparacionPeriodosDto | null>(null);
  protected readonly cargandoComparacion = signal(false);
  protected readonly errorComparacion = signal('');

  /** Importe con signo adelante del símbolo: −$27.000 en vez de $-27.000. */
  protected readonly moneda = (valor: number): string =>
    valor < 0 ? `−${formatearMoneda(-valor)}` : formatearMoneda(valor);
  protected readonly fecha = formatearFechaAsistencia;
  protected readonly variacion = formatearVariacion;
  protected readonly mes = etiquetaMes;

  constructor() {
    queueMicrotask(() => {
      this.cargarCatalogos();
      this.consultar();
    });
    this.destroyRef.onDestroy(() => clearTimeout(this.textoTimer));
  }

  protected elegirVista(vista: Vista): void {
    this.vista.set(vista);
    if (vista === 'cuotas' && !this.cuotas()) this.consultarCuotas();
    if (vista === 'comparar' && !this.comparacion()) this.elegirComparacion(this.comparacionRapida(), true);
  }

  // ------------------------------------------------------------ Movimientos

  protected elegirPeriodo(periodo: PeriodoReporte): void {
    if (this.periodo() === periodo) return;
    this.periodo.set(periodo);
    if (periodo !== 'personalizado' || (this.desde() && this.hasta())) this.aplicar();
  }

  protected cambiarFecha(campo: 'desde' | 'hasta', valor: string): void {
    (campo === 'desde' ? this.desde : this.hasta).set(valor);
    if (this.desde() && this.hasta()) this.aplicar();
  }

  protected cambiarSelect(filtro: 'tipo' | 'actividad' | 'categoriaSocio', valor: string): void {
    const actual = filtro === 'tipo' ? this.tipo() : filtro === 'actividad' ? this.actividadUuid() : this.categoriaSocioUuid();
    // * app-select emite su valor al iniciar: sin cambio real no se vuelve a consultar
    if ((valor ?? '') === actual) return;
    if (filtro === 'tipo') this.tipo.set(valor as TipoMovimientoReporte | '');
    if (filtro === 'actividad') this.actividadUuid.set(valor);
    if (filtro === 'categoriaSocio') this.categoriaSocioUuid.set(valor);
    this.aplicar();
  }

  protected alternarCategoria(categoria: CategoriaMovimiento): void {
    this.categorias.update((actual) =>
      actual.includes(categoria) ? actual.filter((c) => c !== categoria) : [...actual, categoria],
    );
    this.aplicar();
  }

  protected alternarMedio(medio: MedioPagoReporte): void {
    this.medios.update((actual) => (actual.includes(medio) ? actual.filter((m) => m !== medio) : [...actual, medio]));
    this.aplicar();
  }

  protected alternarAnulados(valor: boolean): void {
    this.incluirAnulados.set(valor);
    this.aplicar();
  }

  /** Texto e importes: esperan a que se termine de escribir. */
  protected cambiarTexto(campo: 'socio' | 'concepto' | 'importeMinimo' | 'importeMaximo', valor: string): void {
    ({ socio: this.socio, concepto: this.concepto, importeMinimo: this.importeMinimo, importeMaximo: this.importeMaximo })[campo].set(valor);
    clearTimeout(this.textoTimer);
    this.textoTimer = setTimeout(() => this.aplicar(), 400);
  }

  protected limpiarFiltros(): void {
    this.periodo.set('mes');
    this.desde.set('');
    this.hasta.set('');
    this.tipo.set('');
    this.categorias.set([]);
    this.actividadUuid.set('');
    this.socio.set('');
    this.categoriaSocioUuid.set('');
    this.medios.set([]);
    this.incluirAnulados.set(false);
    this.concepto.set('');
    this.importeMinimo.set('');
    this.importeMaximo.set('');
    this.aplicar();
  }

  protected cambiarPagina(pagina: number): void {
    this.pagina.set(pagina);
    this.consultar();
  }

  protected reintentar(): void {
    this.consultar();
  }

  protected descargarExcel(): void {
    if (this.descargando()) return;
    if (!this.totalMovimientos()) {
      this.toast.encolarInfo('No hay movimientos para exportar con los filtros elegidos.', { titulo: 'Sin resultados' });
      return;
    }
    this.descargando.set(true);
    this.api
      .descargarExcel(this.filtros())
      .pipe(finalize(() => this.descargando.set(false)))
      .subscribe({
        next: ({ blob, nombre }) => {
          const url = URL.createObjectURL(blob);
          const enlace = document.createElement('a');
          enlace.href = url;
          enlace.download = nombre;
          document.body.appendChild(enlace);
          enlace.click();
          enlace.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        },
      });
  }

  private aplicar(): void {
    this.pagina.set(1);
    this.consultar();
  }

  private consultar(): void {
    if (this.periodo() === 'personalizado' && !this.rangoActual()) return;
    this.consultaSub?.unsubscribe();
    this.cargando.set(true);
    this.error.set('');
    this.consultaSub = this.api
      .consultar(this.filtros())
      .pipe(
        finalize(() => this.cargando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (datos) => this.datos.set(datos),
        error: () => this.error.set('No se pudo cargar el reporte. Revisá los filtros e intentá de nuevo.'),
      });
  }

  // ------------------------------------------------------------ Cuotas

  protected elegirPeriodoCuotas(periodo: PeriodoReporte): void {
    this.periodoCuotas.set(periodo);
    if (periodo !== 'personalizado' || (this.desdeCuotas() && this.hastaCuotas())) this.consultarCuotas();
  }

  protected cambiarFechaCuotas(campo: 'desde' | 'hasta', valor: string): void {
    (campo === 'desde' ? this.desdeCuotas : this.hastaCuotas).set(valor);
    if (this.desdeCuotas() && this.hastaCuotas()) this.consultarCuotas();
  }

  protected cambiarFiltroCuotas(filtro: 'actividad' | 'tipo', valor: string): void {
    const actual = filtro === 'actividad' ? this.actividadCuotas() : this.tipoCuotas();
    if ((valor ?? '') === actual) return;
    if (filtro === 'actividad') this.actividadCuotas.set(valor);
    else this.tipoCuotas.set(valor as '' | 'SOCIAL' | 'ACTIVIDAD' | 'PASE');
    this.consultarCuotas();
  }

  private consultarCuotas(): void {
    const rango =
      this.periodoCuotas() === 'personalizado'
        ? this.desdeCuotas() && this.hastaCuotas()
          ? { desde: this.desdeCuotas(), hasta: this.hastaCuotas() }
          : null
        : rangoReporte(this.periodoCuotas());
    this.cargandoCuotas.set(true);
    this.api
      .consultarCuotas({
        desde: rango?.desde ?? null,
        hasta: rango?.hasta ?? null,
        actividadUuid: this.actividadCuotas() || null,
        tipo: this.tipoCuotas() || null,
      })
      .pipe(
        finalize(() => this.cargandoCuotas.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({ next: (cuotas) => this.cuotas.set(cuotas) });
  }

  // ------------------------------------------------------------ Comparación

  protected elegirComparacion(tipo: ComparacionRapida, forzar = false): void {
    if (!forzar && this.comparacionRapida() === tipo) return;
    this.comparacionRapida.set(tipo);
    const periodos = periodosComparacion(tipo);
    if (periodos) {
      this.periodoA.set(periodos.a);
      this.periodoB.set(periodos.b);
      this.comparar();
    }
  }

  protected cambiarPeriodoComparacion(periodo: 'a' | 'b', campo: 'desde' | 'hasta', valor: string): void {
    const destino = periodo === 'a' ? this.periodoA : this.periodoB;
    destino.update((actual) => ({ ...actual, [campo]: valor }));
    const a = this.periodoA();
    const b = this.periodoB();
    if (a.desde && a.hasta && b.desde && b.hasta) this.comparar();
  }

  private comparar(): void {
    this.cargandoComparacion.set(true);
    this.errorComparacion.set('');
    this.api
      .comparar(this.periodoA(), this.periodoB(), this.filtros())
      .pipe(
        finalize(() => this.cargandoComparacion.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (comparacion) => this.comparacion.set(comparacion),
        error: () => this.errorComparacion.set('No se pudo comparar los períodos.'),
      });
  }

  protected claseVariacion(valor: number | null, invertir = false): string {
    if (valor === null || valor === 0) return '';
    const positivo = invertir ? valor < 0 : valor > 0;
    return positivo ? 'reportes__variacion--sube' : 'reportes__variacion--baja';
  }

  // ------------------------------------------------------------ Apoyo

  private cargarCatalogos(): void {
    this.actividadesApi
      .paginar({ page: 1, size: 100, search: '', completa: null })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (pagina) =>
          this.catalogoActividades.set(
            pagina.content.map((actividad) => ({ value: actividad.actividadUuid, label: actividad.nombre })),
          ),
      });
    this.categoriasApi
      .listar()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (categorias) =>
          this.catalogoCategorias.set(categorias.map((categoria) => ({ value: categoria.categoriaUuid, label: categoria.nombre }))),
      });
  }

  private barras(grupos: readonly ReporteGrupoDto[], medida: 'total' | 'ingresos'): readonly BarraGrafico[] {
    const valores = grupos.map((g) => (medida === 'ingresos' ? g.ingresos : g.ingresos + g.egresos));
    const tope = Math.max(1, ...valores);
    return grupos.slice(0, 8).map((grupo, indice) => ({
      id: grupo.clave,
      nombre: grupo.nombre,
      valor: valores[indice],
      tope,
      etiquetaValor: formatearMoneda(valores[indice]),
      color: grupo.egresos > grupo.ingresos ? 'var(--semantic-danger)' : 'var(--app-accent)',
    }));
  }
}
