import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subscription, finalize } from 'rxjs';

import {
  AlumnoAsignableDto,
  AsignacionRutinaDto,
  EstadoRutina,
  FilaRutinaDto,
  RutinaDetalleDto,
} from '../../../../../core/api/interfaces/entrenamiento.interfaces';
import { EntrenamientoApiService } from '../../../../../core/api/services/entrenamiento-api.service';
import { ReproductorVideoComponent } from '../reproductor-video/reproductor-video.component';
import { BotonComponent } from '../../../../ui/boton/boton.component';
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
import { formatearFechaAsistencia, isoFecha } from '../../seguimiento-asistencia/seguimiento-asistencia.helpers';
import { EditorRutinaComponent, ModoEditorRutina } from '../editor-rutina/editor-rutina.component';
import { prescripcion, textoAccionHistorial, textoEstadoRutina } from '../entrenamiento.helpers';

type FilaRutina = FilaRutinaDto & { readonly estadoTexto: string; readonly contenido: string; readonly socios: string };
type Vista = 'plan' | 'socios' | 'historial';

/**
 * Rutinas de entrenamiento: listado, detalle (plan, socios con sus sesiones e historial),
 * asignación, registro de sesiones, edición, reemplazo y archivo.
 */
@Component({
  selector: 'app-rutinas-entrenamiento',
  standalone: true,
  imports: [
    BotonComponent,
    EditorRutinaComponent,
    InputFechaComponent,
    PaginacionComponent,
    PopupComponent,
    ReproductorVideoComponent,
    SelectComponent,
    TablaResponsiveComponent,
  ],
  templateUrl: './rutinas-entrenamiento.component.html',
  styleUrl: './rutinas-entrenamiento.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RutinasEntrenamientoComponent {
  private readonly api = inject(EntrenamientoApiService);
  private readonly toast = inject(ToastAlertService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly busqueda = signal('');
  protected readonly estado = signal<EstadoRutina | ''>('ACTIVA');
  protected readonly pagina = signal(1);
  protected readonly datos = signal<readonly FilaRutinaDto[]>([]);
  protected readonly total = signal(0);
  protected readonly totalPaginas = signal(1);
  protected readonly cargando = signal(false);

  protected readonly editorAbierto = signal(false);
  protected readonly modoEditor = signal<ModoEditorRutina>('crear');

  protected readonly detalle = signal<RutinaDetalleDto | null>(null);
  protected readonly cargandoDetalle = signal(false);
  protected readonly vista = signal<Vista>('plan');
  protected readonly procesando = signal(false);

  protected readonly asignarAbierto = signal(false);
  protected readonly alumnos = signal<readonly AlumnoAsignableDto[]>([]);
  protected readonly elegidos = signal<ReadonlySet<string>>(new Set());
  protected readonly busquedaAlumno = signal('');
  protected readonly asignarDesde = signal('');
  protected readonly asignarHasta = signal('');

  protected readonly sesionDe = signal<AsignacionRutinaDto | null>(null);
  protected readonly sesionFecha = signal('');
  protected readonly sesionItems = signal<ReadonlySet<string>>(new Set());
  protected readonly sesionEsfuerzo = signal('');
  protected readonly sesionObservaciones = signal('');
  protected readonly errorSesion = signal('');

  protected readonly opcionesEstado: readonly SelectOption[] = [
    { value: 'ACTIVA', label: 'Activas' },
    { value: 'ARCHIVADA', label: 'Archivadas' },
    { value: 'REEMPLAZADA', label: 'Reemplazadas' },
    { value: '', label: 'Todas' },
  ];
  protected readonly opcionesEsfuerzo: readonly SelectOption[] = [
    { value: '', label: 'Sin indicar' },
    ...Array.from({ length: 10 }, (_, i) => ({ value: `${i + 1}`, label: `${i + 1} de 10` })),
  ];

  protected readonly filas = computed((): readonly FilaRutina[] =>
    this.datos().map((r) => ({
      ...r,
      estadoTexto: textoEstadoRutina(r.estado),
      contenido: `${r.dias} ${r.dias === 1 ? 'día' : 'días'} · ${r.ejercicios} ejerc.`,
      socios: r.asignacionesActivas ? `${r.asignacionesActivas}` : '—',
    })),
  );
  protected readonly columnas: readonly ColumnaTabla<FilaRutina>[] = [
    { id: 'nombre', titulo: 'Rutina', ancho: 'minmax(11rem, 1.5fr)', prioridadMobile: true },
    { id: 'disciplina', titulo: 'Disciplina', ancho: 'minmax(7rem, .8fr)' },
    { id: 'actividad', titulo: 'Actividad', ancho: 'minmax(7rem, .8fr)' },
    { id: 'profesor', titulo: 'Profesor', ancho: 'minmax(8rem, 1fr)' },
    { id: 'contenido', titulo: 'Contenido', ancho: '9rem' },
    { id: 'socios', titulo: 'Socios', ancho: '5rem', prioridadMobile: true },
    { id: 'estadoTexto', titulo: 'Estado', ancho: '7rem' },
  ];
  protected readonly acciones: readonly AccionTabla<FilaRutina>[] = [{ predefinida: 'ver' }];

  protected readonly activas = computed(() => this.detalle()?.asignaciones.filter((a) => a.estado === 'ACTIVA') ?? []);
  protected readonly finalizadas = computed(() => this.detalle()?.asignaciones.filter((a) => a.estado !== 'ACTIVA') ?? []);
  protected readonly alumnosDisponibles = computed(() => {
    const yaAsignados = new Set(this.activas().map((a) => a.memberUuid));
    const texto = this.busquedaAlumno().trim().toLowerCase();
    return this.alumnos().filter(
      (a) =>
        !yaAsignados.has(a.memberUuid) &&
        (!texto || `${a.nombre ?? ''} ${a.apellido ?? ''} ${a.dni ?? ''}`.toLowerCase().includes(texto)),
    );
  });
  /** Ejercicios de la rutina para marcar en la sesión, agrupados por día. */
  protected readonly diasSesion = computed(() => this.detalle()?.dias ?? []);

  protected readonly fecha = formatearFechaAsistencia;
  protected readonly prescripcion = prescripcion;
  protected readonly accion = textoAccionHistorial;
  protected readonly estadoTexto = textoEstadoRutina;

  private consulta?: Subscription;
  private temporizador?: ReturnType<typeof setTimeout>;

  constructor() {
    queueMicrotask(() => this.consultar());
    this.destroyRef.onDestroy(() => clearTimeout(this.temporizador));
  }

  // ------------------------------------------------------------ Listado

  protected buscar(valor: string): void {
    this.busqueda.set(valor);
    clearTimeout(this.temporizador);
    this.temporizador = setTimeout(() => this.aplicar(), 350);
  }

  protected filtrarEstado(valor: string): void {
    if ((valor ?? '') === this.estado()) return;
    this.estado.set(valor as EstadoRutina | '');
    this.aplicar();
  }

  protected cambiarPagina(pagina: number): void {
    this.pagina.set(pagina);
    this.consultar();
  }

  /** Recarga el listado (por ejemplo, cuando cambia la biblioteca). */
  recargar(): void {
    this.consultar();
  }

  protected manejarAccion({ accion, fila }: EventoAccionTabla<FilaRutina>): void {
    if (accion === 'ver') this.abrirDetalle(fila.uuid);
  }

  protected nuevaRutina(): void {
    this.detalle.set(null);
    this.modoEditor.set('crear');
    this.editorAbierto.set(true);
  }

  // ------------------------------------------------------------ Detalle

  protected abrirDetalle(uuid: string): void {
    this.vista.set('plan');
    this.cargandoDetalle.set(true);
    this.detalle.set(null);
    this.api
      .obtenerRutina(uuid)
      .pipe(finalize(() => this.cargandoDetalle.set(false)))
      .subscribe({ next: (rutina) => this.detalle.set(rutina) });
    this.detalleAbierto.set(true);
  }

  protected readonly detalleAbierto = signal(false);

  protected cerrarDetalle(): void {
    this.detalleAbierto.set(false);
    this.detalle.set(null);
  }

  protected abrirEditor(modo: Exclude<ModoEditorRutina, 'crear'>): void {
    this.modoEditor.set(modo);
    this.detalleAbierto.set(false);
    this.editorAbierto.set(true);
  }

  protected rutinaGuardada(rutina: RutinaDetalleDto): void {
    this.editorAbierto.set(false);
    this.detalle.set(rutina);
    this.vista.set('plan');
    this.detalleAbierto.set(true);
    this.consultar();
  }

  protected cerrarEditor(): void {
    this.editorAbierto.set(false);
    if (this.detalle()) this.detalleAbierto.set(true);
  }

  protected async archivar(): Promise<void> {
    const rutina = this.detalle();
    if (!rutina) return;
    const confirmado = await this.toast.confirmDanger(
      `¿Archivar "${rutina.nombre}"? Se finaliza para los socios que la tienen activa; queda en su historial.`,
      { titulo: 'Archivar rutina' },
    );
    if (confirmado) this.ejecutar(this.api.archivarRutina(rutina.uuid));
  }

  protected async finalizar(asignacion: AsignacionRutinaDto): Promise<void> {
    const confirmado = await this.toast.confirm(`¿Finalizar la rutina para ${asignacion.socio}? Queda en su historial.`, {
      titulo: 'Finalizar rutina',
    });
    if (confirmado) this.ejecutar(this.api.finalizarAsignacion(asignacion.uuid));
  }

  // ------------------------------------------------------------ Asignar

  protected abrirAsignar(): void {
    this.elegidos.set(new Set());
    this.busquedaAlumno.set('');
    this.asignarDesde.set('');
    this.asignarHasta.set('');
    this.asignarAbierto.set(true);
    this.api.alumnos().subscribe({ next: (alumnos) => this.alumnos.set(alumnos) });
  }

  protected alternarAlumno(memberUuid: string): void {
    this.elegidos.update((actual) => {
      const nuevo = new Set(actual);
      if (nuevo.has(memberUuid)) nuevo.delete(memberUuid);
      else nuevo.add(memberUuid);
      return nuevo;
    });
  }

  protected confirmarAsignacion(): void {
    const rutina = this.detalle();
    if (!rutina || !this.elegidos().size) return;
    this.ejecutar(
      this.api.asignar(rutina.uuid, {
        memberUuids: [...this.elegidos()],
        fechaInicio: this.asignarDesde() || null,
        fechaFin: this.asignarHasta() || null,
      }),
      () => this.asignarAbierto.set(false),
    );
  }

  // ------------------------------------------------------------ Sesiones

  protected abrirSesion(asignacion: AsignacionRutinaDto): void {
    this.sesionDe.set(asignacion);
    this.sesionFecha.set(isoFecha(new Date()));
    this.sesionItems.set(new Set());
    this.sesionEsfuerzo.set('');
    this.sesionObservaciones.set('');
    this.errorSesion.set('');
  }

  protected alternarItem(uuid: string): void {
    this.sesionItems.update((actual) => {
      const nuevo = new Set(actual);
      if (nuevo.has(uuid)) nuevo.delete(uuid);
      else nuevo.add(uuid);
      return nuevo;
    });
  }

  protected marcarDia(uuids: readonly string[]): void {
    this.sesionItems.update((actual) => {
      const nuevo = new Set(actual);
      const todos = uuids.every((u) => nuevo.has(u));
      uuids.forEach((u) => (todos ? nuevo.delete(u) : nuevo.add(u)));
      return nuevo;
    });
  }

  protected uuidsDe(dia: { readonly items: readonly { readonly uuid: string }[] }): readonly string[] {
    return dia.items.map((i) => i.uuid);
  }

  protected guardarSesion(): void {
    const asignacion = this.sesionDe();
    if (!asignacion) return;
    if (!this.sesionFecha()) {
      this.errorSesion.set('Elegí la fecha de la sesión.');
      return;
    }
    if (this.sesionFecha() > isoFecha(new Date())) {
      this.errorSesion.set('No se puede registrar una sesión futura.');
      return;
    }
    this.ejecutar(
      this.api.registrarSesion(asignacion.uuid, {
        fecha: this.sesionFecha(),
        itemUuids: [...this.sesionItems()],
        esfuerzo: this.sesionEsfuerzo() ? Number(this.sesionEsfuerzo()) : null,
        observaciones: this.sesionObservaciones().trim() || null,
      }),
      () => this.sesionDe.set(null),
    );
  }

  protected nombreItem(uuid: string): string {
    for (const dia of this.detalle()?.dias ?? []) {
      const item = dia.items.find((i) => i.uuid === uuid);
      if (item) return item.ejercicio.nombre;
    }
    return 'Ejercicio';
  }

  // ------------------------------------------------------------ Apoyo

  private ejecutar(pedido: Observable<RutinaDetalleDto>, alTerminar?: () => void): void {
    this.procesando.set(true);
    pedido.pipe(finalize(() => this.procesando.set(false))).subscribe({
      next: (rutina) => {
        this.detalle.set(rutina);
        alTerminar?.();
        this.consultar();
      },
    });
  }

  private aplicar(): void {
    this.pagina.set(1);
    this.consultar();
  }

  private consultar(): void {
    this.consulta?.unsubscribe();
    this.cargando.set(true);
    this.consulta = this.api
      .listarRutinas({ search: this.busqueda().trim(), estado: this.estado(), page: this.pagina(), size: 20 })
      .pipe(
        finalize(() => this.cargando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (pagina) => {
          this.datos.set(pagina.content);
          this.total.set(pagina.totalElements);
          this.totalPaginas.set(Math.max(1, pagina.totalPages));
        },
      });
  }
}
