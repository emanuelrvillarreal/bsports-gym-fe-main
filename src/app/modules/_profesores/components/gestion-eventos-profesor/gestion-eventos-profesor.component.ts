import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgIcon } from '@ng-icons/core';
import { Subject, finalize, takeUntil } from 'rxjs';

import {
  ActividadDto,
  ActividadInscriptoDto,
  ActividadPaginateDto,
  EventoActividadCommand,
  EventoActividadDto,
} from '../../../../core/api/interfaces/actividades.interfaces';
import { provideTablaResponsiveIcons } from '../../../../core/icons/app-icons.registry';
import { ActividadesApiService } from '../../../../core/api/services/actividades-api.service';
import { EventosActividadApiService } from '../../../../core/api/services/eventos-actividad-api.service';
import { PortalProfesorApiService } from '../../../../core/api/services/portal-profesor-api.service';
import { normalizarDiasSemana } from '../../../../helpers/dias-semana.helpers';
import { FormularioEventoActividadComponent } from '../../../_compartido-perfiles/forms/formulario-evento-actividad/formulario-evento-actividad.component';
import { BotonComponent } from '../../../ui/boton/boton.component';
import { CardComponent } from '../../../ui/card/card.component';
import { PaginacionComponent } from '../../../ui/paginacion/paginacion.component';
import { PopupComponent } from '../../../ui/popup/popup.component';
import { SelectComponent, SelectOption } from '../../../ui/select/select.component';
import {
  AccionTabla,
  ColumnaTabla,
  EventoAccionTabla,
  TablaResponsiveComponent,
} from '../../../ui/tabla-responsive/tabla-responsive.component';
import { ToastAlertService } from '../../../ui/toast-alert/services/toast-alert.service';
import { TituloHeroComponent } from '../../../ui/titulo-hero/titulo-hero.component';

interface FilaInscriptoActividad extends ActividadInscriptoDto {
  readonly inscriptoUuid: string;
}

type TipoDetalle = 'evento' | 'actividad';

@Component({
  selector: 'app-gestion-eventos-profesor',
  standalone: true,
  imports: [
    BotonComponent,
    CardComponent,
    FormularioEventoActividadComponent,
    NgIcon,
    PaginacionComponent,
    PopupComponent,
    SelectComponent,
    TablaResponsiveComponent,
    TituloHeroComponent,
  ],
  providers: [provideTablaResponsiveIcons()],
  templateUrl: './gestion-eventos-profesor.component.html',
  styleUrl: './gestion-eventos-profesor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GestionEventosProfesorComponent {
  private readonly actividadesApi = inject(ActividadesApiService);
  private readonly eventosApi = inject(EventosActividadApiService);
  private readonly portalProfesorApi = inject(PortalProfesorApiService);
  private readonly toastAlert = inject(ToastAlertService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cancelarDetalle$ = new Subject<void>();

  protected readonly actividades = signal<readonly ActividadPaginateDto[]>([]);
  protected readonly eventos = signal<readonly EventoActividadDto[]>([]);
  protected readonly actividadUuid = signal('');
  protected readonly busqueda = signal('');
  protected readonly paginaActual = signal(1);
  protected readonly totalPaginas = signal(1);
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly procesandoEventoUuid = signal<string | null>(null);
  protected readonly procesandoDetalle = signal<{ tipo: TipoDetalle; uuid: string } | null>(null);
  protected readonly error = signal('');

  protected readonly popupFormularioAbierto = signal(false);
  protected readonly eventoEditando = signal<EventoActividadDto | null>(null);
  protected readonly formularioVersion = signal(0);

  protected readonly popupDetalleAbierto = signal(false);
  protected readonly tipoDetalle = signal<TipoDetalle | null>(null);
  protected readonly eventoDetalle = signal<EventoActividadDto | null>(null);
  protected readonly actividadDetalle = signal<ActividadDto | null>(null);
  protected readonly participantesEvento = signal<readonly FilaInscriptoActividad[]>([]);
  protected readonly errorDetalle = signal('');
  protected readonly errorParticipantesEvento = signal('');

  protected readonly diasHabituales = computed(() =>
    normalizarDiasSemana(this.actividadDetalle()?.diasSemana),
  );
  protected readonly filasInscriptosActividad = computed<readonly FilaInscriptoActividad[]>(() =>
    this.mapearInscriptos(this.actividadDetalle()?.inscriptos ?? []),
  );
  protected readonly cupoCompleto = computed(() => {
    const actividad = this.actividadDetalle();
    return !!actividad && actividad.inscriptos.length >= actividad.cupoMaximo;
  });

  protected readonly opcionesActividades = computed<readonly SelectOption[]>(() => [
    { value: '', label: 'Todas las actividades' },
    ...this.actividades().map((actividad) => ({
      value: actividad.actividadUuid,
      label: `${actividad.nombre} · ${actividad.ubicacion}`,
    })),
  ]);
  protected readonly opcionesFormulario = computed(() =>
    this.opcionesActividades().filter((opcion) => !!opcion.value),
  );

  protected readonly columnasEventos: readonly ColumnaTabla<EventoActividadDto>[] = [
    { id: 'titulo', titulo: 'Evento', ancho: 'minmax(12rem, 1fr)' },
    { id: 'actividadNombre', titulo: 'Actividad', ancho: 'minmax(11rem, 1fr)' },
    { id: 'inicio', titulo: 'Inicio', ancho: '11rem' },
    { id: 'fin', titulo: 'Fin', ancho: '11rem' },
    { id: 'ubicacion', titulo: 'Ubicación', ancho: 'minmax(10rem, 1fr)' },
    {
      id: 'estado',
      titulo: 'Estado',
      tipo: 'estado',
      ancho: '8rem',
      estadoTexto: (valor) => {
        if (valor === 'CONFIRMADO') return 'Confirmado';
        if (valor === 'PENDIENTE') return 'Pendiente';
        return 'Cancelado';
      },
    },
  ];
  protected readonly accionesEventos: readonly AccionTabla<EventoActividadDto>[] = [
    {
      id: 'ver-evento',
      texto: 'Ver evento',
      icono: 'heroEye',
      color: 'var(--app-accent)',
      deshabilitada: () => this.hayAccionEnCurso(),
      cargando: (evento) => this.detalleEstaCargando('evento', evento.uuid),
    },
    {
      id: 'editar',
      texto: 'Editar',
      icono: 'heroPencilSquare',
      color: 'var(--semantic-warning)',
      deshabilitada: () => this.hayAccionEnCurso(),
    },
    {
      id: 'dar-baja',
      texto: 'Dar de baja',
      icono: 'heroTrash',
      color: 'var(--semantic-danger)',
      deshabilitada: () => this.hayAccionEnCurso(),
      cargando: (evento) => this.procesandoEventoUuid() === evento.uuid,
    },
  ];
  protected readonly columnasActividades: readonly ColumnaTabla<ActividadPaginateDto>[] = [
    { id: 'nombre', titulo: 'Actividad', ancho: 'minmax(12rem, 1fr)' },
    { id: 'ubicacion', titulo: 'UbicaciÃ³n', ancho: 'minmax(10rem, 1fr)' },
    { id: 'diasSemana', titulo: 'DÃ­as', ancho: 'minmax(11rem, 1fr)' },
    { id: 'horaInicio', titulo: 'Inicio habitual', ancho: '10rem' },
    { id: 'horaFin', titulo: 'Fin habitual', ancho: '10rem' },
    { id: 'cantidadInscriptos', titulo: 'Inscriptos', tipo: 'numero', ancho: '8rem' },
  ];
  protected readonly accionesActividades: readonly AccionTabla<ActividadPaginateDto>[] = [
    {
      id: 'ver-actividad',
      texto: 'Ver actividad',
      icono: 'heroEye',
      color: 'var(--app-accent)',
    },
  ];

  protected readonly columnasInscriptos: readonly ColumnaTabla<FilaInscriptoActividad>[] = [
    {
      id: 'imageUrl',
      titulo: 'Foto',
      tipo: 'avatar',
      avatarMostrarNombre: false,
      ancho: '5.5rem',
    },
    { id: 'nombre', titulo: 'Nombre', ancho: 'minmax(9rem, 1fr)' },
    { id: 'apellido', titulo: 'Apellido', ancho: 'minmax(9rem, 1fr)' },
    { id: 'dni', titulo: 'DNI', ancho: '9rem' },
    { id: 'fechaNacimiento', titulo: 'Fecha de nacimiento', ancho: '11rem' },
  ];
  constructor() {
    queueMicrotask(() => {
      this.cargarActividades();
      this.cargarEventos();
    });
  }

  protected actualizarBusqueda(evento: Event): void {
    this.busqueda.set((evento.target as HTMLInputElement).value);
  }

  protected cambiarActividad(actividadUuid: string): void {
    this.actividadUuid.set(actividadUuid);
    this.buscar();
  }

  protected buscar(): void {
    this.paginaActual.set(1);
    this.cargarEventos();
  }

  protected cambiarPagina(pagina: number): void {
    this.paginaActual.set(pagina);
    this.cargarEventos();
  }

  protected abrirAlta(): void {
    this.eventoEditando.set(null);
    this.formularioVersion.update((version) => version + 1);
    this.error.set('');
    this.popupFormularioAbierto.set(true);
  }

  protected editar(evento: EventoActividadDto): void {
    this.eventoEditando.set(evento);
    this.formularioVersion.update((version) => version + 1);
    this.error.set('');
    this.popupFormularioAbierto.set(true);
  }

  protected cerrarFormulario(): void {
    if (this.guardando()) return;
    this.popupFormularioAbierto.set(false);
    this.error.set('');
  }

  protected guardar(command: EventoActividadCommand): void {
    const actual = this.eventoEditando();
    const request = actual
      ? this.portalProfesorApi.actualizarEvento(actual.uuid, command)
      : this.portalProfesorApi.crearEvento(command);

    this.guardando.set(true);
    this.error.set('');
    request.pipe(finalize(() => this.guardando.set(false))).subscribe({
      next: () => {
        this.popupFormularioAbierto.set(false);
        this.cargarEventos();
      },
      error: () =>
        this.error.set('No se pudo guardar el evento. El formulario conserva los datos.'),
    });
  }

  protected manejarAccionEvento({ accion, fila }: EventoAccionTabla<EventoActividadDto>): void {
    if (accion === 'ver-evento') this.verEvento(fila);
    if (accion === 'editar') this.editar(fila);
    if (accion === 'dar-baja') void this.darDeBaja(fila);
  }

  protected manejarAccionActividad({
    accion,
    fila,
  }: EventoAccionTabla<ActividadPaginateDto>): void {
    if (accion === 'ver-actividad') this.verActividad(fila);
  }

  protected cerrarDetalle(): void {
    this.cancelarDetalle$.next();
    this.popupDetalleAbierto.set(false);
    this.errorDetalle.set('');
  }

  private verEvento(evento: EventoActividadDto): void {
    this.cancelarDetalle$.next();
    this.procesandoDetalle.set({ tipo: 'evento', uuid: evento.uuid });
    this.popupDetalleAbierto.set(false);
    this.tipoDetalle.set('evento');
    this.eventoDetalle.set(null);
    this.actividadDetalle.set(null);
    this.participantesEvento.set([]);
    this.errorDetalle.set('');
    this.errorParticipantesEvento.set('');
    let cargasPendientes = 2;
    const abrirDetalleAlFinalizar = (): void => {
      cargasPendientes -= 1;
      if (cargasPendientes === 0 && this.procesandoDetalle()?.uuid === evento.uuid) {
        this.procesandoDetalle.set(null);
        this.popupDetalleAbierto.set(true);
      }
    };

    this.portalProfesorApi
      .obtenerEvento(evento.uuid)
      .pipe(
        takeUntil(this.cancelarDetalle$),
        takeUntilDestroyed(this.destroyRef),
        finalize(abrirDetalleAlFinalizar),
      )
      .subscribe({
        next: (detalleEvento) => this.eventoDetalle.set(detalleEvento),
        error: () => this.errorDetalle.set('No se pudo cargar el detalle del evento.'),
      });

    this.actividadesApi
      .obtenerDetalle(evento.actividadUuid)
      .pipe(
        takeUntil(this.cancelarDetalle$),
        takeUntilDestroyed(this.destroyRef),
        finalize(abrirDetalleAlFinalizar),
      )
      .subscribe({
        next: (actividad) =>
          this.participantesEvento.set(this.mapearInscriptos(actividad.inscriptos)),
        error: () =>
          this.errorParticipantesEvento.set(
            'No se pudieron cargar los alumnos de la actividad asociada al evento.',
          ),
      });
  }

  private verActividad(actividad: ActividadPaginateDto): void {
    this.cancelarDetalle$.next();
    this.procesandoDetalle.set({ tipo: 'actividad', uuid: actividad.actividadUuid });
    this.popupDetalleAbierto.set(true);
    this.tipoDetalle.set('actividad');
    this.eventoDetalle.set(null);
    this.actividadDetalle.set(null);
    this.participantesEvento.set([]);
    this.errorDetalle.set('');
    this.errorParticipantesEvento.set('');

    this.actividadesApi
      .obtenerDetalle(actividad.actividadUuid)
      .pipe(
        takeUntil(this.cancelarDetalle$),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.procesandoDetalle.set(null)),
      )
      .subscribe({
        next: (detalleActividad) => this.actividadDetalle.set(detalleActividad),
        error: () => this.errorDetalle.set('No se pudo cargar el detalle de la actividad.'),
      });
  }

  protected textoEstadoEvento(): string {
    const estado = this.eventoDetalle()?.estado;
    if (estado === 'CONFIRMADO') return 'Confirmado';
    if (estado === 'PENDIENTE') return 'Pendiente';
    if (estado === 'CANCELADO') return 'Cancelado';
    return 'Sin estado';
  }

  protected claseEstadoEvento(): string {
    const estado = this.eventoDetalle()?.estado;
    if (estado === 'CONFIRMADO') return 'detalle-actividad__chip--exito';
    if (estado === 'PENDIENTE') return 'detalle-actividad__chip--advertencia';
    if (estado === 'CANCELADO') return 'detalle-actividad__chip--peligro';
    return '';
  }

  private async darDeBaja(evento: EventoActividadDto): Promise<void> {
    if (this.procesandoEventoUuid()) return;
    const confirmado = await this.toastAlert.confirmDanger(
      `Vas a dar de baja el evento “${evento.titulo}”.`,
      { titulo: 'Dar de baja evento', textoConfirmar: 'Dar de baja' },
    );
    if (!confirmado || this.procesandoEventoUuid()) return;

    this.procesandoEventoUuid.set(evento.uuid);
    this.portalProfesorApi
      .eliminarEvento(evento.uuid)
      .pipe(finalize(() => this.procesandoEventoUuid.set(null)))
      .subscribe({
        next: () => this.cargarEventos(),
        error: () => this.error.set('No se pudo dar de baja el evento.'),
      });
  }

  private cargarEventos(): void {
    this.cargando.set(true);
    this.error.set('');
    this.eventosApi
      .paginar({
        page: this.paginaActual(),
        size: 15,
        search: this.busqueda().trim(),
        actividadUuid: this.actividadUuid() || null,
      })
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (pagina) => {
          this.eventos.set(pagina.content);
          this.totalPaginas.set(Math.max(1, pagina.totalPages));
        },
        error: () => {
          this.eventos.set([]);
          this.totalPaginas.set(1);
          this.error.set('No se pudieron cargar los eventos asignados.');
        },
      });
  }

  private cargarActividades(): void {
    this.actividadesApi.paginar({ page: 1, size: 1000, search: '', completa: null }).subscribe({
      next: (pagina) => {
        this.actividades.set(pagina.content);
      },
      error: () => this.error.set('No se pudieron cargar las actividades asignadas.'),
    });
  }

  private hayAccionEnCurso(): boolean {
    return !!this.procesandoEventoUuid() || !!this.procesandoDetalle();
  }

  private detalleEstaCargando(tipo: TipoDetalle, uuid: string): boolean {
    const detalle = this.procesandoDetalle();
    return detalle?.tipo === tipo && detalle.uuid === uuid;
  }

  private mapearInscriptos(
    inscriptos: readonly ActividadInscriptoDto[],
  ): readonly FilaInscriptoActividad[] {
    return inscriptos.map((inscripto, indice) => ({
      ...inscripto,
      inscriptoUuid:
        inscripto.userUuid?.trim() || inscripto.memberUuid?.trim() || `${inscripto.dni}-${indice}`,
    }));
  }
}
