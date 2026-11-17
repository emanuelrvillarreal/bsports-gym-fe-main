import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { finalize } from 'rxjs';

import { provideTablaResponsiveIcons } from '../../../../core/icons/app-icons.registry';
import {
  ActividadPaginateDto,
  EventoActividadCommand,
  EventoActividadDto,
} from '../../../../core/api/interfaces/actividades.interfaces';
import { ActividadesApiService } from '../../../../core/api/services/actividades-api.service';
import { EventosActividadApiService } from '../../../../core/api/services/eventos-actividad-api.service';
import { ToastAlertService } from '../../../ui/toast-alert/services/toast-alert.service';
import { BotonComponent } from '../../../ui/boton/boton.component';
import { CardComponent } from '../../../ui/card/card.component';
import { PaginacionComponent } from '../../../ui/paginacion/paginacion.component';
import { PopupComponent } from '../../../ui/popup/popup.component';
import { SelectComponent, SelectOption } from '../../../ui/select/select.component';
import { TituloHeroComponent } from '../../../ui/titulo-hero/titulo-hero.component';
import {
  AccionTabla,
  ColumnaTabla,
  EventoAccionTabla,
  TablaResponsiveComponent,
} from '../../../ui/tabla-responsive/tabla-responsive.component';
import { FormularioEventoActividadComponent } from '../../../_compartido-perfiles/forms/formulario-evento-actividad/formulario-evento-actividad.component';

@Component({
  selector: 'app-gestion-eventos-actividad',
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
  templateUrl: './gestion-eventos-actividad.component.html',
  styleUrl: './gestion-eventos-actividad.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GestionEventosActividadComponent {
  private readonly eventosApi = inject(EventosActividadApiService);
  private readonly actividadesApi = inject(ActividadesApiService);
  private readonly toastAlert = inject(ToastAlertService);

  protected readonly eventos = signal<readonly EventoActividadDto[]>([]);
  protected readonly actividades = signal<readonly ActividadPaginateDto[]>([]);
  protected readonly paginaActual = signal(1);
  protected readonly totalPaginas = signal(1);
  protected readonly busqueda = signal('');
  protected readonly actividadUuid = signal('');
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly procesandoUuid = signal<string | null>(null);
  protected readonly popupAbierto = signal(false);
  protected readonly eventoEditando = signal<EventoActividadDto | null>(null);
  protected readonly formularioVersion = signal(0);
  protected readonly error = signal('');
  protected readonly opcionesActividades = computed<readonly SelectOption[]>(() => [
    { value: '', label: 'Todas las actividades' },
    ...this.actividades().map((actividad) => ({
      value: actividad.actividadUuid,
      label: `${actividad.nombre} · ${actividad.ubicacion}`,
    })),
  ]);
  protected readonly columnas: readonly ColumnaTabla<EventoActividadDto>[] = [
    { id: 'titulo', titulo: 'Nombre', ancho: 'minmax(11rem, 1fr)' },
    { id: 'descripcion', titulo: 'Descripción', ancho: 'minmax(14rem, 1.5fr)' },
    { id: 'inicio', titulo: 'Inicio', ancho: '11rem' },
    { id: 'fin', titulo: 'Fin', ancho: '11rem' },
    { id: 'actividadNombre', titulo: 'Actividad', ancho: 'minmax(10rem, 1fr)' },
    {
      id: 'estado',
      titulo: 'Estado',
      tipo: 'estado',
      ancho: '8rem',
      estadoTexto: (valor) => {
        const estado = String(valor ?? '').toUpperCase();
        if (estado === 'CONFIRMADO') return 'Confirmado';
        if (estado === 'CANCELADO') return 'Cancelado';
        return estado;
      },
      estadoClase: (valor) => {
        const estado = String(valor ?? '').toUpperCase();
        return estado === 'CONFIRMADO'
          ? 'tabla-responsive__estado--presente'
          : estado === 'CANCELADO'
            ? 'tabla-responsive__estado--inactivo'
            : null;
      },
    },
  ];
  protected readonly acciones: readonly AccionTabla<EventoActividadDto>[] = [
    {
      id: 'editar',
      texto: 'Editar',
      icono: 'heroPencilSquare',
      color: 'var(--semantic-warning)',
      deshabilitada: () => !!this.procesandoUuid(),
    },
    {
      id: 'cancelar',
      texto: 'Cancelar',
      icono: 'heroXMark',
      color: 'var(--semantic-danger)',
      visible: (evento) => evento.estado === 'CONFIRMADO',
      deshabilitada: () => !!this.procesandoUuid(),
      cargando: (evento) => this.procesandoUuid() === evento.uuid,
    },
    {
      id: 'confirmar',
      texto: 'Confirmar',
      icono: 'heroCheck',
      color: 'var(--semantic-success)',
      visible: (evento) => evento.estado === 'CANCELADO',
      deshabilitada: () => !!this.procesandoUuid(),
      cargando: (evento) => this.procesandoUuid() === evento.uuid,
    },
    {
      id: 'borrar',
      texto: 'Eliminar',
      icono: 'heroTrash',
      color: 'var(--semantic-danger)',
      deshabilitada: () => !!this.procesandoUuid(),
      cargando: (evento) => this.procesandoUuid() === evento.uuid,
    },
  ];

  constructor() {
    queueMicrotask(() => {
      this.cargarEventos();
      this.cargarActividades();
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
    this.popupAbierto.set(true);
    this.cargarActividades();
  }
  protected editar(evento: EventoActividadDto): void {
    this.eventoEditando.set(evento);
    this.formularioVersion.update((version) => version + 1);
    this.error.set('');
    this.popupAbierto.set(true);
    this.cargarActividades();
  }
  protected cerrarPopup(): void {
    if (!this.guardando()) {
      this.popupAbierto.set(false);
      this.error.set('');
    }
  }
  protected guardar(command: EventoActividadCommand): void {
    const actual = this.eventoEditando();
    const request = actual
      ? this.eventosApi.actualizar(actual.uuid, command)
      : this.eventosApi.crear(command);
    this.guardando.set(true);
    this.error.set('');
    request.pipe(finalize(() => this.guardando.set(false))).subscribe({
      next: () => {
        this.popupAbierto.set(false);
        this.cargarEventos();
      },
      error: () =>
        this.error.set('No se pudo guardar el evento. El formulario conserva los datos.'),
    });
  }
  protected manejarAccion({ accion, fila }: EventoAccionTabla<EventoActividadDto>): void {
    if (accion === 'editar') this.editar(fila);
    if (accion === 'cancelar') void this.cancelar(fila);
    if (accion === 'confirmar') void this.confirmar(fila);
    if (accion === 'borrar') void this.eliminar(fila);
  }
  private async cancelar(evento: EventoActividadDto): Promise<void> {
    if (this.procesandoUuid()) return;

    const confirmado = await this.toastAlert.confirmDanger(
      `Vas a cancelar el evento “${evento.titulo}”.`,
      { titulo: 'Cancelar evento', textoConfirmar: 'Cancelar evento' },
    );
    if (!confirmado || this.procesandoUuid()) return;

    this.procesandoUuid.set(evento.uuid);
    this.eventosApi
      .cancelar(evento.uuid)
      .pipe(finalize(() => this.procesandoUuid.set(null)))
      .subscribe({
        next: () => this.cargarEventos(),
        error: () => this.error.set('No se pudo cancelar el evento.'),
      });
  }
  private async confirmar(evento: EventoActividadDto): Promise<void> {
    if (this.procesandoUuid()) return;

    const confirmado = await this.toastAlert.confirm(
      `Vas a confirmar el evento “${evento.titulo}”.`,
      {
        titulo: 'Confirmar evento',
        textoConfirmar: 'Confirmar evento',
      },
    );
    if (!confirmado || this.procesandoUuid()) return;

    this.procesandoUuid.set(evento.uuid);
    this.eventosApi
      .cambiarEstado(evento.uuid, 'CONFIRMADO')
      .pipe(finalize(() => this.procesandoUuid.set(null)))
      .subscribe({
        next: () => this.cargarEventos(),
        error: () => this.error.set('No se pudo confirmar el evento.'),
      });
  }
  private async eliminar(evento: EventoActividadDto): Promise<void> {
    if (this.procesandoUuid()) return;

    const confirmado = await this.toastAlert.confirmDanger(
      `Vas a eliminar el evento “${evento.titulo}”. Esta acción no se puede deshacer.`,
      { titulo: 'Eliminar evento', textoConfirmar: 'Eliminar' },
    );
    if (!confirmado || this.procesandoUuid()) return;

    this.procesandoUuid.set(evento.uuid);
    this.eventosApi
      .eliminar(evento.uuid)
      .pipe(finalize(() => this.procesandoUuid.set(null)))
      .subscribe({
        next: () => this.cargarEventos(),
        error: () => this.error.set('No se pudo borrar el evento.'),
      });
  }
  private cargarEventos(): void {
    this.cargando.set(true);
    this.error.set('');
    this.eventosApi
      .paginar({
        page: this.paginaActual(),
        size: 5,
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
          this.error.set('No se pudieron cargar los eventos.');
        },
      });
  }
  private cargarActividades(): void {
    this.actividadesApi.paginar({ page: 1, size: 1000, search: '', completa: null }).subscribe({
      next: (pagina) => this.actividades.set(pagina.content),
      error: () => this.error.set('No se pudieron cargar las actividades para seleccionar.'),
    });
  }
}
