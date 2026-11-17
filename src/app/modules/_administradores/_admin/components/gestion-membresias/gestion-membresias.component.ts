import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription, finalize } from 'rxjs';

import {
  DashboardMembresiasDto,
  FilaMembresiaDto,
  FiltrosMembresias,
  OrigenMembresia,
  PaseDto,
  SituacionMembresia,
} from '../../../../../core/api/interfaces/membresias.interfaces';
import { MembresiasApiService } from '../../../../../core/api/services/membresias-api.service';
import { formatearMoneda } from '../../../../../helpers/moneda-formato';
import {
  textoCobro,
  textoOrigen,
  textoSituacion,
} from '../../../../_compartido-perfiles/components/membresias/membresias.helpers';
import { formatearFechaAsistencia } from '../../../../_compartido-perfiles/components/seguimiento-asistencia/seguimiento-asistencia.helpers';
import { MembresiasSocioComponent } from '../../../components/membresias-socio/membresias-socio.component';
import { BotonComponent } from '../../../../ui/boton/boton.component';
import { BarraGrafico, GraficoBarrasComponent } from '../../../../ui/grafico-barras/grafico-barras.component';
import { InputFechaComponent } from '../../../../ui/input-fecha/input-fecha.component';
import { PaginacionComponent } from '../../../../ui/paginacion/paginacion.component';
import { PopupComponent } from '../../../../ui/popup/popup.component';
import { SelectComponent, SelectOption } from '../../../../ui/select/select.component';
import {
  AccionTabla,
  ColumnaTabla,
  EventoAccionTabla,
  TablaResponsiveComponent,
} from '../../../../ui/tabla-responsive/tabla-responsive.component';
import { ToastAlertService } from '../../../../ui/toast-alert/services/toast-alert.service';

type FilaTabla = FilaMembresiaDto & {
  readonly socioTexto: string;
  readonly vigenciaTexto: string;
  readonly situacionTexto: string;
  readonly cobroTexto: string;
  readonly ingresosTexto: string;
  readonly origenTexto: string;
};

const SITUACIONES: readonly SituacionMembresia[] = [
  'VIGENTE',
  'PENDIENTE_PAGO',
  'PROGRAMADA',
  'CONGELADA',
  'AGOTADA',
  'VENCIDA',
  'BAJA',
  'REEMPLAZADA',
];

/**
 * Membresías del club: indicadores (activas, por vencer, vencidas, altas, renovaciones, bajas e ingresos por
 * pase), listado con filtros y exportación a Excel. Cada fila abre el legajo del socio. Solo ADMIN.
 */
@Component({
  selector: 'app-gestion-membresias',
  standalone: true,
  imports: [
    BotonComponent,
    GraficoBarrasComponent,
    InputFechaComponent,
    MembresiasSocioComponent,
    PaginacionComponent,
    PopupComponent,
    SelectComponent,
    TablaResponsiveComponent,
  ],
  templateUrl: './gestion-membresias.component.html',
  styleUrl: './gestion-membresias.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GestionMembresiasComponent {
  private readonly api = inject(MembresiasApiService);
  private readonly toast = inject(ToastAlertService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly dashboard = signal<DashboardMembresiasDto | null>(null);
  protected readonly pases = signal<readonly PaseDto[]>([]);
  protected readonly busqueda = signal('');
  protected readonly paseUuid = signal('');
  protected readonly situacion = signal<SituacionMembresia | ''>('');
  protected readonly origen = signal<OrigenMembresia | ''>('');
  protected readonly desde = signal('');
  protected readonly hasta = signal('');
  protected readonly pagina = signal(1);
  protected readonly filasDatos = signal<readonly FilaMembresiaDto[]>([]);
  protected readonly total = signal(0);
  protected readonly totalPaginas = signal(1);
  protected readonly cargando = signal(false);
  protected readonly descargando = signal(false);
  protected readonly socio = signal<{ readonly uuid: string; readonly nombre: string } | null>(null);

  protected readonly moneda = formatearMoneda;

  protected readonly opcionesPase = computed((): readonly SelectOption[] => [
    { value: '', label: 'Todos los pases' },
    ...this.pases().map((p) => ({ value: p.uuid, label: p.nombre })),
  ]);
  protected readonly opcionesSituacion: readonly SelectOption[] = [
    { value: '', label: 'Todas' },
    ...SITUACIONES.map((s) => ({ value: s, label: textoSituacion(s) })),
  ];
  protected readonly opcionesOrigen: readonly SelectOption[] = [
    { value: '', label: 'Todos' },
    { value: 'ALTA', label: 'Altas' },
    { value: 'RENOVACION', label: 'Renovaciones' },
    { value: 'CAMBIO_PLAN', label: 'Cambios de plan' },
  ];

  protected readonly barrasIngresos = computed((): readonly BarraGrafico[] => {
    const items = this.dashboard()?.ingresosPorPase ?? [];
    const tope = Math.max(1, ...items.map((i) => Number(i.importe)));
    return items.map((i) => ({ id: i.clave, nombre: i.nombre, valor: Number(i.importe), tope, etiquetaValor: formatearMoneda(i.importe), color: 'var(--app-accent)' }));
  });
  protected readonly barrasContratados = computed((): readonly BarraGrafico[] => {
    const items = this.dashboard()?.masContratados ?? [];
    const tope = Math.max(1, ...items.map((i) => i.cantidad));
    return items.map((i) => ({ id: i.clave, nombre: i.nombre, valor: i.cantidad, tope, etiquetaValor: `${i.cantidad}`, color: 'var(--app-accent)' }));
  });

  protected readonly filas = computed((): readonly FilaTabla[] =>
    this.filasDatos().map((f) => ({
      ...f,
      socioTexto: f.numeroSocio ? `${f.socio} (N.º ${f.numeroSocio})` : f.socio,
      vigenciaTexto: `${formatearFechaAsistencia(f.fechaInicio)} al ${formatearFechaAsistencia(f.fechaFin)}`,
      situacionTexto: textoSituacion(f.situacion),
      cobroTexto: `${formatearMoneda(f.precio)} · ${textoCobro(f.estadoCobro)}`,
      ingresosTexto: f.ingresosPermitidos ? `${f.ingresosUsados}/${f.ingresosPermitidos}` : `${f.ingresosUsados}`,
      origenTexto: textoOrigen(f.origen),
    })),
  );
  protected readonly columnas: readonly ColumnaTabla<FilaTabla>[] = [
    { id: 'socioTexto', titulo: 'Socio', ancho: 'minmax(11rem, 1.3fr)', prioridadMobile: true },
    { id: 'pase', titulo: 'Pase', ancho: 'minmax(9rem, 1fr)', prioridadMobile: true },
    { id: 'vigenciaTexto', titulo: 'Vigencia', ancho: '12rem' },
    { id: 'situacionTexto', titulo: 'Situación', ancho: '10rem', prioridadMobile: true },
    { id: 'cobroTexto', titulo: 'Cobro', ancho: '11rem' },
    { id: 'ingresosTexto', titulo: 'Ingresos', ancho: '5.5rem' },
    { id: 'origenTexto', titulo: 'Origen', ancho: '7.5rem' },
  ];
  protected readonly acciones: readonly AccionTabla<FilaTabla>[] = [{ predefinida: 'ver' }];

  private consulta?: Subscription;
  private temporizador?: ReturnType<typeof setTimeout>;

  constructor() {
    queueMicrotask(() => {
      this.consultar();
      this.cargarDashboard();
      this.api.pases().subscribe({ next: (p) => this.pases.set(p) });
    });
    this.destroyRef.onDestroy(() => clearTimeout(this.temporizador));
  }

  protected buscar(valor: string): void {
    this.busqueda.set(valor);
    clearTimeout(this.temporizador);
    this.temporizador = setTimeout(() => this.aplicar(), 350);
  }

  protected filtrar(campo: 'paseUuid' | 'situacion' | 'origen' | 'desde' | 'hasta', valor: string): void {
    const nuevo = valor ?? '';
    const actual = { paseUuid: this.paseUuid(), situacion: this.situacion(), origen: this.origen(), desde: this.desde(), hasta: this.hasta() }[campo];
    if (nuevo === actual) return;
    if (campo === 'paseUuid') this.paseUuid.set(nuevo);
    else if (campo === 'situacion') this.situacion.set(nuevo as SituacionMembresia | '');
    else if (campo === 'origen') this.origen.set(nuevo as OrigenMembresia | '');
    else if (campo === 'desde') this.desde.set(nuevo);
    else this.hasta.set(nuevo);
    this.aplicar();
  }

  protected verSituacion(situacion: SituacionMembresia): void {
    this.situacion.set(situacion);
    this.aplicar();
  }

  protected cambiarPagina(pagina: number): void {
    this.pagina.set(pagina);
    this.consultar();
  }

  protected manejarAccion({ fila }: EventoAccionTabla<FilaTabla>): void {
    this.socio.set({ uuid: fila.socioUuid, nombre: fila.socio });
  }

  protected cerrarLegajo(): void {
    this.socio.set(null);
  }

  protected refrescar(): void {
    this.consultar();
    this.cargarDashboard();
  }

  protected descargarExcel(): void {
    if (this.descargando()) return;
    if (!this.total()) {
      this.toast.encolarInfo('No hay membresías para exportar con estos filtros.', { titulo: 'Sin resultados' });
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

  private filtros(): FiltrosMembresias {
    return {
      page: this.pagina() - 1,
      size: 20,
      search: this.busqueda().trim() || undefined,
      paseUuid: this.paseUuid() || null,
      situacion: this.situacion() || null,
      origen: this.origen() || null,
      desde: this.desde() || null,
      hasta: this.hasta() || null,
    };
  }

  private consultar(): void {
    this.consulta?.unsubscribe();
    this.cargando.set(true);
    this.consulta = this.api
      .listar(this.filtros())
      .pipe(
        finalize(() => this.cargando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (pagina) => {
          this.filasDatos.set(pagina.content);
          this.total.set(pagina.totalElements);
          this.totalPaginas.set(Math.max(1, pagina.totalPages));
        },
      });
  }

  private cargarDashboard(): void {
    this.api.dashboard().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: (d) => this.dashboard.set(d) });
  }
}
