import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription, finalize } from 'rxjs';

import {
  AsistenciaAlumnoDetalleDto,
  AsistenciaAlumnoFilaDto,
  AsistenciaUmbralesDto,
  EstadoInscripcionFiltro,
  NivelAsistencia,
  OrdenSeguimiento,
  SeguimientoAsistenciaDto,
  TrayectoriaDeportivaDto,
} from '../../../../core/api/interfaces/seguimiento-asistencia.interfaces';
import { SeguimientoAsistenciaApiService } from '../../../../core/api/services/seguimiento-asistencia-api.service';
import { BotonComponent } from '../../../ui/boton/boton.component';
import { BarraGrafico, GraficoBarrasComponent } from '../../../ui/grafico-barras/grafico-barras.component';
import { InputFechaComponent } from '../../../ui/input-fecha/input-fecha.component';
import { PaginacionComponent } from '../../../ui/paginacion/paginacion.component';
import { PopupComponent } from '../../../ui/popup/popup.component';
import { SelectComponent, SelectOption } from '../../../ui/select/select.component';
import {
  AccionTabla,
  ColumnaTabla,
  EventoAccionTabla,
  TablaResponsiveComponent,
} from '../../../ui/tabla-responsive/tabla-responsive.component';
import { TrayectoriaDeportivaComponent } from '../trayectoria-deportiva/trayectoria-deportiva.component';
import {
  OPCIONES_PERIODO,
  PeriodoSeguimiento,
  barrasEvolucion,
  colorNivel,
  etiquetaMes,
  formatearFechaAsistencia,
  formatearPorcentaje,
  rangoPeriodo,
} from './seguimiento-asistencia.helpers';

/** Fila de la tabla: la del backend más textos ya formateados. */
type FilaSeguimiento = AsistenciaAlumnoFilaDto & {
  readonly inscripcionTexto: string;
  readonly asistenciaTexto: string;
};

const TAMANIO_PAGINA = 20;

/**
 * Seguimiento de asistencia de alumnos. Lo usan el profesor ("Seguimiento de mis alumnos", solo
 * sus actividades) y el ADMIN ("Estadísticas de asistencia", todo el club, con filtro por profesor
 * y configuración de umbrales). El alcance real lo valida el backend.
 */
@Component({
  selector: 'app-seguimiento-asistencia',
  standalone: true,
  imports: [
    BotonComponent,
    GraficoBarrasComponent,
    InputFechaComponent,
    PaginacionComponent,
    PopupComponent,
    SelectComponent,
    TablaResponsiveComponent,
    TrayectoriaDeportivaComponent,
  ],
  templateUrl: './seguimiento-asistencia.component.html',
  styleUrl: './seguimiento-asistencia.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeguimientoAsistenciaComponent {
  private readonly api = inject(SeguimientoAsistenciaApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly alcance = input<'admin' | 'profesor'>('profesor');

  protected readonly opcionesPeriodo = OPCIONES_PERIODO;
  protected readonly periodo = signal<PeriodoSeguimiento>('inscripcion');
  protected readonly desdePersonalizado = signal('');
  protected readonly hastaPersonalizado = signal('');
  protected readonly actividadUuid = signal('');
  protected readonly profesorUuid = signal('');
  protected readonly nivel = signal<NivelAsistencia | ''>('');
  protected readonly estadoInscripcion = signal<EstadoInscripcionFiltro>('ACTIVAS');
  protected readonly orden = signal<OrdenSeguimiento>('NOMBRE');
  protected readonly busqueda = signal('');
  protected readonly soloAlertas = signal(false);
  protected readonly pagina = signal(1);

  protected readonly datos = signal<SeguimientoAsistenciaDto | null>(null);
  protected readonly cargando = signal(false);
  protected readonly error = signal('');
  private readonly catalogoActividades = signal<readonly SelectOption[]>([]);
  private readonly catalogoProfesores = signal<readonly SelectOption[]>([]);

  protected readonly detalleAbierto = signal(false);
  protected readonly detalle = signal<AsistenciaAlumnoDetalleDto | null>(null);
  protected readonly cargandoDetalle = signal(false);
  protected readonly vistaDetalle = signal<'asistencia' | 'trayectoria'>('asistencia');
  protected readonly trayectoria = signal<TrayectoriaDeportivaDto | null>(null);
  protected readonly cargandoTrayectoria = signal(false);
  protected readonly clasesVisibles = signal(20);

  protected readonly umbralesAbierto = signal(false);
  protected readonly borradorUmbrales = signal<AsistenciaUmbralesDto | null>(null);
  protected readonly guardandoUmbrales = signal(false);
  protected readonly errorUmbrales = signal('');

  private consultaSub?: Subscription;
  private detalleSub?: Subscription;
  private busquedaTimer?: ReturnType<typeof setTimeout>;

  protected readonly esAdmin = computed(() => this.alcance() === 'admin');
  protected readonly resumen = computed(() => this.datos()?.resumen ?? null);
  protected readonly umbrales = computed(() => this.datos()?.umbrales ?? null);
  protected readonly totalPaginas = computed(() => Math.max(1, this.datos()?.alumnos.totalPages ?? 1));
  protected readonly totalAlumnos = computed(() => this.datos()?.alumnos.totalElements ?? 0);
  protected readonly alertas = computed(() => (this.datos()?.alertas ?? []).slice(0, 6));
  protected readonly hayFiltros = computed(
    () =>
      this.periodo() !== 'inscripcion' ||
      !!this.actividadUuid() ||
      !!this.profesorUuid() ||
      !!this.nivel() ||
      this.estadoInscripcion() !== 'ACTIVAS' ||
      !!this.busqueda().trim() ||
      this.soloAlertas(),
  );

  protected readonly filas = computed((): readonly FilaSeguimiento[] =>
    (this.datos()?.alumnos.content ?? []).map((fila) => ({
      ...fila,
      inscripcionTexto: formatearFechaAsistencia(fila.fechaInscripcion),
      asistenciaTexto: formatearPorcentaje(fila.porcentaje),
    })),
  );

  protected readonly opcionesActividades = computed<readonly SelectOption[]>(() => [
    { value: '', label: 'Todas las actividades' },
    ...this.catalogoActividades(),
  ]);
  protected readonly opcionesProfesores = computed<readonly SelectOption[]>(() => [
    { value: '', label: 'Todos los profesores' },
    ...this.catalogoProfesores(),
  ]);
  protected readonly opcionesNivel: readonly SelectOption[] = [
    { value: '', label: 'Todos los niveles' },
    { value: 'VERDE', label: 'Buena asistencia' },
    { value: 'AMARILLO', label: 'Asistencia regular' },
    { value: 'ROJO', label: 'Baja asistencia' },
    { value: 'SIN_DATOS', label: 'Sin clases todavía' },
  ];
  protected readonly opcionesEstado: readonly SelectOption[] = [
    { value: 'ACTIVAS', label: 'Inscripciones activas' },
    { value: 'TODAS', label: 'Incluir bajas' },
  ];
  protected readonly opcionesOrden: readonly SelectOption[] = [
    { value: 'NOMBRE', label: 'Ordenar por nombre' },
    { value: 'ASISTENCIA_ASC', label: 'Menor asistencia primero' },
    { value: 'ASISTENCIA_DESC', label: 'Mayor asistencia primero' },
  ];

  protected readonly barrasMensuales = computed((): readonly BarraGrafico[] => {
    const datos = this.datos();
    return datos ? barrasEvolucion(datos.evolucionMensual, datos.umbrales.verde, datos.umbrales.amarillo) : [];
  });
  protected readonly barrasActividades = computed((): readonly BarraGrafico[] => {
    const datos = this.datos();
    if (!datos) return [];
    return datos.actividades
      .filter((actividad) => actividad.promedioAsistencia !== null)
      .slice(0, 8)
      .map((actividad) => this.barraPromedio(actividad.actividadUuid, actividad.nombre, actividad.promedioAsistencia));
  });
  protected readonly barrasProfesores = computed((): readonly BarraGrafico[] => {
    const datos = this.datos();
    if (!datos) return [];
    return datos.profesores
      .filter((profesor) => profesor.promedioAsistencia !== null)
      .slice(0, 8)
      .map((profesor) => this.barraPromedio(profesor.profesorUuid, profesor.nombre, profesor.promedioAsistencia));
  });
  protected readonly barrasDetalle = computed((): readonly BarraGrafico[] => {
    const detalle = this.detalle();
    const umbrales = this.umbrales();
    return detalle && umbrales ? barrasEvolucion(detalle.evolucionMensual, umbrales.verde, umbrales.amarillo) : [];
  });

  protected readonly columnas: readonly ColumnaTabla<FilaSeguimiento>[] = [
    { id: 'imageUrl', titulo: 'Alumno', tipo: 'avatar', ancho: 'minmax(12rem, 1.4fr)', prioridadMobile: true },
    { id: 'actividadNombre', titulo: 'Actividad', ancho: 'minmax(8rem, 1fr)' },
    { id: 'inscripcionTexto', titulo: 'Inscripción', ancho: '7rem' },
    { id: 'antiguedad', titulo: 'Antigüedad', ancho: '8.5rem' },
    { id: 'clases', titulo: 'Clases', tipo: 'numero', ancho: '5rem' },
    { id: 'presentes', titulo: 'Presentes', tipo: 'numero', ancho: '6rem' },
    { id: 'ausentes', titulo: 'Ausentes', tipo: 'numero', ancho: '6rem' },
    { id: 'asistenciaTexto', titulo: 'Asistencia', ancho: '9rem', prioridadMobile: true },
  ];
  protected readonly acciones: readonly AccionTabla<FilaSeguimiento>[] = [{ predefinida: 'ver' }];

  protected readonly fecha = formatearFechaAsistencia;
  protected readonly porcentaje = formatearPorcentaje;
  protected readonly mes = etiquetaMes;
  protected readonly color = colorNivel;

  constructor() {
    queueMicrotask(() => this.consultar());
    this.destroyRef.onDestroy(() => clearTimeout(this.busquedaTimer));
  }

  // ------------------------------------------------------------ Filtros

  protected elegirPeriodo(periodo: PeriodoSeguimiento): void {
    if (this.periodo() === periodo) return;
    this.periodo.set(periodo);
    if (periodo !== 'personalizado' || (this.desdePersonalizado() && this.hastaPersonalizado())) {
      this.aplicar();
    }
  }

  protected cambiarFecha(campo: 'desde' | 'hasta', valor: string): void {
    (campo === 'desde' ? this.desdePersonalizado : this.hastaPersonalizado).set(valor);
    if (this.desdePersonalizado() && this.hastaPersonalizado()) {
      this.aplicar();
    }
  }

  protected cambiarFiltro(filtro: 'actividad' | 'profesor' | 'nivel' | 'estado' | 'orden', valor: string): void {
    const actuales = {
      actividad: this.actividadUuid(),
      profesor: this.profesorUuid(),
      nivel: this.nivel(),
      estado: this.estadoInscripcion(),
      orden: this.orden(),
    };
    // * app-select emite su valor al iniciar: sin cambio real no se vuelve a consultar
    if ((valor ?? '') === actuales[filtro]) return;
    switch (filtro) {
      case 'actividad':
        this.actividadUuid.set(valor);
        break;
      case 'profesor':
        this.profesorUuid.set(valor);
        break;
      case 'nivel':
        this.nivel.set(valor as NivelAsistencia | '');
        break;
      case 'estado':
        this.estadoInscripcion.set(valor === 'TODAS' ? 'TODAS' : 'ACTIVAS');
        break;
      case 'orden':
        this.orden.set((valor || 'NOMBRE') as OrdenSeguimiento);
        break;
    }
    this.aplicar();
  }

  protected buscar(valor: string): void {
    this.busqueda.set(valor);
    clearTimeout(this.busquedaTimer);
    this.busquedaTimer = setTimeout(() => this.aplicar(), 350);
  }

  protected alternarAlertas(valor: boolean): void {
    this.soloAlertas.set(valor);
    this.aplicar();
  }

  protected limpiarFiltros(): void {
    this.periodo.set('inscripcion');
    this.desdePersonalizado.set('');
    this.hastaPersonalizado.set('');
    this.actividadUuid.set('');
    this.profesorUuid.set('');
    this.nivel.set('');
    this.estadoInscripcion.set('ACTIVAS');
    this.orden.set('NOMBRE');
    this.busqueda.set('');
    this.soloAlertas.set(false);
    this.aplicar();
  }

  protected cambiarPagina(pagina: number): void {
    this.pagina.set(pagina);
    this.consultar();
  }

  protected reintentar(): void {
    this.consultar();
  }

  private aplicar(): void {
    this.pagina.set(1);
    this.consultar();
  }

  private rangoActual(): { desde: string | null; hasta: string | null } {
    if (this.periodo() === 'personalizado') {
      return { desde: this.desdePersonalizado() || null, hasta: this.hastaPersonalizado() || null };
    }
    return rangoPeriodo(this.periodo());
  }

  private consultar(): void {
    this.consultaSub?.unsubscribe();
    this.cargando.set(true);
    this.error.set('');
    const rango = this.rangoActual();
    const sinFiltroActividad = !this.actividadUuid() && !this.profesorUuid();
    this.consultaSub = this.api
      .consultar(this.alcance(), {
        ...rango,
        actividadUuid: this.actividadUuid() || null,
        profesorUuid: this.esAdmin() ? this.profesorUuid() || null : null,
        nivel: this.nivel() || null,
        estadoInscripcion: this.estadoInscripcion(),
        orden: this.orden(),
        search: this.busqueda().trim() || null,
        soloAlertas: this.soloAlertas(),
        page: this.pagina(),
        size: TAMANIO_PAGINA,
      })
      .pipe(
        finalize(() => this.cargando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (datos) => {
          this.datos.set(datos);
          this.actualizarCatalogos(datos, sinFiltroActividad);
        },
        error: () => this.error.set('No se pudo cargar el seguimiento de asistencia.'),
      });
  }

  /** Las opciones de actividad y profesor salen de la consulta sin esos filtros, así no se achican al filtrar. */
  private actualizarCatalogos(datos: SeguimientoAsistenciaDto, sinFiltroActividad: boolean): void {
    if (!sinFiltroActividad && this.catalogoActividades().length) return;
    const actividades = new Map(this.catalogoActividades().map((o) => [o.value, o]));
    for (const actividad of datos.actividades) {
      actividades.set(actividad.actividadUuid, { value: actividad.actividadUuid, label: actividad.nombre });
    }
    this.catalogoActividades.set([...actividades.values()].sort((a, b) => a.label.localeCompare(b.label)));
    if (this.esAdmin()) {
      const profesores = new Map(this.catalogoProfesores().map((o) => [o.value, o]));
      for (const profesor of datos.profesores) {
        profesores.set(profesor.profesorUuid, { value: profesor.profesorUuid, label: profesor.nombre });
      }
      this.catalogoProfesores.set([...profesores.values()].sort((a, b) => a.label.localeCompare(b.label)));
    }
  }

  // ------------------------------------------------------------ Detalle del alumno

  protected manejarAccion(evento: EventoAccionTabla<FilaSeguimiento>): void {
    if (evento.accion === 'ver') {
      this.abrirDetalle(evento.fila);
    }
  }

  protected abrirDetalle(fila: AsistenciaAlumnoFilaDto): void {
    this.detalleAbierto.set(true);
    this.vistaDetalle.set('asistencia');
    this.detalle.set(null);
    this.trayectoria.set(null);
    this.clasesVisibles.set(20);
    this.detalleSub?.unsubscribe();
    this.cargandoDetalle.set(true);
    const rango = this.rangoActual();
    this.detalleSub = this.api
      .obtenerDetalle(this.alcance(), fila.inscripcionUuid, rango.desde, rango.hasta)
      .pipe(finalize(() => this.cargandoDetalle.set(false)))
      .subscribe({ next: (detalle) => this.detalle.set(detalle) });
  }

  protected verTrayectoria(): void {
    const detalle = this.detalle();
    this.vistaDetalle.set('trayectoria');
    if (!detalle || this.trayectoria() || this.cargandoTrayectoria()) return;
    this.cargandoTrayectoria.set(true);
    this.api
      .obtenerTrayectoria(this.alcance(), detalle.alumno.memberUuid)
      .pipe(finalize(() => this.cargandoTrayectoria.set(false)))
      .subscribe({ next: (trayectoria) => this.trayectoria.set(trayectoria) });
  }

  protected cerrarDetalle(): void {
    this.detalleAbierto.set(false);
    this.detalleSub?.unsubscribe();
  }

  protected verMasClases(): void {
    this.clasesVisibles.update((cantidad) => cantidad + 20);
  }

  protected textoEstadoClase(estado: string): string {
    return estado === 'PRESENTE' ? 'Presente' : estado === 'AUSENTE_JUSTIFICADO' ? 'Justificada' : 'Ausente';
  }

  protected textoInicioClase(inicio: string): string {
    const [fecha, hora] = inicio.replace('T', ' ').split(' ');
    return `${formatearFechaAsistencia(fecha)} ${hora?.slice(0, 5) ?? ''}`.trim();
  }

  // ------------------------------------------------------------ Umbrales (solo ADMIN)

  protected abrirUmbrales(): void {
    const actuales = this.umbrales();
    if (!actuales) return;
    this.borradorUmbrales.set({ ...actuales });
    this.errorUmbrales.set('');
    this.umbralesAbierto.set(true);
  }

  protected cambiarUmbral(campo: keyof AsistenciaUmbralesDto, valor: string): void {
    const numero = Number(valor);
    this.borradorUmbrales.update((actual) => (actual ? { ...actual, [campo]: Number.isFinite(numero) ? numero : 0 } : actual));
  }

  protected guardarUmbrales(): void {
    const borrador = this.borradorUmbrales();
    if (!borrador || this.guardandoUmbrales()) return;
    if (borrador.amarillo >= borrador.verde) {
      this.errorUmbrales.set('El porcentaje de "regular" tiene que ser menor que el de "buena".');
      return;
    }
    this.guardandoUmbrales.set(true);
    this.api
      .guardarUmbrales(borrador)
      .pipe(finalize(() => this.guardandoUmbrales.set(false)))
      .subscribe({
        next: () => {
          this.umbralesAbierto.set(false);
          this.consultar();
        },
        error: () => this.errorUmbrales.set('No se pudieron guardar los umbrales.'),
      });
  }

  private barraPromedio(id: string, nombre: string, promedio: number | null): BarraGrafico {
    const umbrales = this.umbrales();
    const nivel: NivelAsistencia =
      promedio === null || !umbrales
        ? 'SIN_DATOS'
        : promedio >= umbrales.verde
          ? 'VERDE'
          : promedio >= umbrales.amarillo
            ? 'AMARILLO'
            : 'ROJO';
    return { id, nombre, valor: promedio ?? 0, tope: 100, etiquetaValor: formatearPorcentaje(promedio), color: colorNivel(nivel) };
  }
}
