import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import {
  EventoAccesoAltaCommand,
  EventoAccesoDetalleDto,
} from '../../../../core/api/interfaces/eventos-acceso.interfaces';
import { EventosAccesoApiService } from '../../../../core/api/services/eventos-acceso-api.service';
import { provideTablaResponsiveIcons } from '../../../../core/icons/app-icons.registry';
import { formatearFechaCorta } from '../../../../helpers/fecha-formato';
import { formatearMoneda } from '../../../../helpers/moneda-formato';
import { BotonComponent } from '../../../ui/boton/boton.component';
import { CardComponent } from '../../../ui/card/card.component';
import { PaginacionComponent } from '../../../ui/paginacion/paginacion.component';
import { PopupComponent } from '../../../ui/popup/popup.component';
import {
  AccionTabla,
  ColumnaTabla,
  EventoAccionTabla,
  TablaResponsiveComponent,
} from '../../../ui/tabla-responsive/tabla-responsive.component';
import { TituloHeroComponent } from '../../../ui/titulo-hero/titulo-hero.component';
import { ToastAlertService } from '../../../ui/toast-alert/services/toast-alert.service';
import { FormularioEventoAccesoComponent } from '../../forms/formulario-evento-acceso/formulario-evento-acceso.component';
import { HistorialEventoAccesoComponent } from '../historial-evento-acceso/historial-evento-acceso.component';
import { OperacionEventoAccesoComponent } from '../operacion-evento-acceso/operacion-evento-acceso.component';

type AccionDetalle = 'ver' | 'ingresar' | 'editar';

type EventoAccesoFila = EventoAccesoDetalleDto & {
  readonly montoTotal: readonly string[];
};

@Component({
  selector: 'app-gestion-eventos-acceso',
  standalone: true,
  imports: [
    BotonComponent,
    CardComponent,
    FormularioEventoAccesoComponent,
    HistorialEventoAccesoComponent,
    OperacionEventoAccesoComponent,
    PaginacionComponent,
    PopupComponent,
    TablaResponsiveComponent,
    TituloHeroComponent,
  ],
  providers: [provideTablaResponsiveIcons()],
  templateUrl: './gestion-eventos-acceso.component.html',
  styleUrl: './gestion-eventos-acceso.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GestionEventosAccesoComponent {
  private readonly api = inject(EventosAccesoApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(ToastAlertService);

  protected readonly eventos = signal<readonly EventoAccesoFila[]>([]);
  protected readonly paginaActual = signal(1);
  protected readonly totalPaginas = signal(1);
  protected readonly busqueda = signal('');
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly detalleCargando = signal(false);
  protected readonly eliminando = signal(false);
  protected readonly accionDetalle = signal<AccionDetalle | null>(null);
  protected readonly procesandoUuid = signal<string | null>(null);
  protected readonly errorListado = signal('');
  protected readonly errorPopup = signal('');
  protected readonly popupFormularioAbierto = signal(false);
  protected readonly popupDetalleAbierto = signal(false);
  protected readonly popupOperacionAbierto = signal(false);
  protected readonly popupHistorialAbierto = signal(false);
  protected readonly eventoSeleccionado = signal<EventoAccesoDetalleDto | null>(null);
  protected readonly editando = signal(false);
  protected readonly formularioVersion = signal(0);

  protected readonly columnas: readonly ColumnaTabla<EventoAccesoFila>[] = [
    { id: 'titulo', titulo: 'Título', ancho: 'minmax(11rem, 0.8fr)' },
    { id: 'descripcion', titulo: 'Descripción', ancho: 'minmax(15rem, 1.5fr)' },
    {
      id: 'fecha',
      titulo: 'Fecha',
      tipo: 'fecha',
      ancho: '8rem',
      formatearTexto: (valor) => formatearFechaCorta(valor),
    },
    {
      id: 'montoTotal',
      titulo: 'Monto total',
      tipo: 'chips',
      ancho: '9rem',
      chipClase: () => 'tabla-responsive__chip--success',
    },
    {
      id: 'montoInvitados',
      titulo: 'Monto invitados',
      tipo: 'moneda',
      ancho: '10rem',
      celdaColor: () => 'var(--semantic-success)',
    },
    {
      id: 'montoMorosos',
      titulo: 'Monto morosos',
      tipo: 'moneda',
      ancho: '10rem',
      celdaColor: () => 'var(--semantic-success)',
    },
    {
      id: 'permiteInvitados',
      titulo: 'Permite invitados',
      tipo: 'estado',
      ancho: '10rem',
      estadoTexto: (valor) => (valor === true ? 'Sí' : 'No'),
    },
    {
      id: 'permiteMorosos',
      titulo: 'Permite morosos',
      tipo: 'estado',
      ancho: '10rem',
      estadoTexto: (valor) => (valor === true ? 'Sí' : 'No'),
    },
  ];
  protected readonly acciones: readonly AccionTabla<EventoAccesoFila>[] = [
    {
      id: 'ver',
      texto: 'Ver',
      icono: 'heroEye',
      color: 'var(--app-text-soft)',
      deshabilitada: () => !!this.procesandoUuid(),
      cargando: (evento) => this.esAccionCargando(evento, 'ver'),
    },
    {
      id: 'ingresar',
      texto: 'Ingresar',
      icono: 'heroArrowRightOnRectangle',
      color: (evento) =>
        this.eventoYaFinalizo(evento) ? 'var(--app-text-soft)' : 'var(--semantic-success)',
      deshabilitada: (evento) => !!this.procesandoUuid() || this.eventoYaFinalizo(evento),
      descripcionDeshabilitada: 'No se pueden registrar ingresos en eventos de fechas anteriores.',
      cargando: (evento) => this.esAccionCargando(evento, 'ingresar'),
    },
    {
      id: 'editar',
      texto: 'Editar',
      icono: 'heroPencilSquare',
      color: (evento) =>
        this.eventoYaFinalizo(evento) ? 'var(--app-text-soft)' : 'var(--semantic-warning)',
      deshabilitada: (evento) => !!this.procesandoUuid() || this.eventoYaFinalizo(evento),
      descripcionDeshabilitada: 'No se pueden editar eventos de fechas anteriores.',
      cargando: (evento) => this.esAccionCargando(evento, 'editar'),
    },
    {
      id: 'historial',
      texto: 'Historial',
      icono: 'heroClock',
      color: 'var(--app-accent)',
      deshabilitada: () => !!this.procesandoUuid(),
    },
    {
      id: 'eliminar',
      texto: 'Eliminar',
      icono: 'heroTrash',
      color: 'var(--semantic-danger)',
      deshabilitada: () => !!this.procesandoUuid(),
    },
  ];

  constructor() {
    queueMicrotask(() => this.cargarEventos());
  }

  protected formatearMonto(monto: number): string {
    return formatearMoneda(monto);
  }

  protected actualizarBusqueda(evento: Event): void {
    this.busqueda.set((evento.target as HTMLInputElement).value);
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
    this.editando.set(false);
    this.eventoSeleccionado.set(null);
    this.errorPopup.set('');
    this.formularioVersion.update((version) => version + 1);
    this.popupFormularioAbierto.set(true);
  }

  protected manejarAccion({ accion, fila }: EventoAccionTabla<EventoAccesoFila>): void {
    if ((accion === 'ingresar' || accion === 'editar') && this.eventoYaFinalizo(fila)) {
      return;
    }

    if (accion === 'ver' || accion === 'ingresar' || accion === 'editar') {
      this.cargarDetallePara(fila, accion);
    }
    if (accion === 'eliminar') {
      this.abrirEliminar(fila);
    }
    if (accion === 'historial') {
      this.abrirHistorial(fila);
    }
  }

  protected guardar(command: EventoAccesoAltaCommand): void {
    if (this.guardando()) {
      return;
    }
    const evento = this.eventoSeleccionado();
    const request =
      this.editando() && evento
        ? this.api.actualizar(evento.uuid, command, {
            mostrarToastError: false,
          })
        : this.api.crear(command, {
            mostrarToastError: false,
          });

    this.guardando.set(true);
    this.errorPopup.set('');
    request
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.guardando.set(false)),
      )
      .subscribe({
        next: () => {
          this.popupFormularioAbierto.set(false);
          this.cargarEventos();
        },
        error: () => {
          this.errorPopup.set('');
          this.toast.error(
            'No se pudo guardar el evento. Corregí el problema y reintentá; los datos se conservaron.',
            { titulo: 'Eventos de acceso' },
          );
        },
      });
  }

  protected cerrarFormulario(): void {
    if (!this.guardando() && !this.detalleCargando()) {
      this.popupFormularioAbierto.set(false);
      this.errorPopup.set('');
    }
  }

  protected cerrarDetalle(): void {
    if (!this.detalleCargando()) {
      this.popupDetalleAbierto.set(false);
      this.errorPopup.set('');
    }
  }

  protected async abrirEliminar(evento: EventoAccesoDetalleDto): Promise<void> {
    this.eventoSeleccionado.set(evento);
    this.errorPopup.set('');
    const confirmado = await this.toast.confirmDanger(
      `Vas a dar de baja el evento “${evento.titulo}”. Esta acción dejará de permitir nuevas operaciones de entrada.`,
      { titulo: 'Eliminar evento', textoConfirmar: 'Dar de baja' },
    );
    if (confirmado) {
      this.confirmarEliminar();
    }
  }

  protected confirmarEliminar(): void {
    const evento = this.eventoSeleccionado();
    if (!evento || this.eliminando()) {
      return;
    }

    this.eliminando.set(true);
    this.errorPopup.set('');
    this.api
      .eliminar(evento.uuid, { mostrarToastError: false })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.eliminando.set(false)),
      )
      .subscribe({
        next: () => {
          this.cargarEventos();
        },
        error: () => this.errorPopup.set('No se pudo dar de baja el evento. Intentá nuevamente.'),
      });
  }

  protected cerrarOperacion(): void {
    this.popupOperacionAbierto.set(false);
  }

  protected abrirHistorial(evento: EventoAccesoDetalleDto): void {
    this.eventoSeleccionado.set(evento);
    this.popupHistorialAbierto.set(true);
  }

  protected cerrarHistorial(): void {
    this.popupHistorialAbierto.set(false);
  }

  private cargarEventos(): void {
    this.cargando.set(true);
    this.errorListado.set('');
    this.api
      .paginar(
        {
          page: this.paginaActual(),
          size: 10,
          search: this.busqueda().trim(),
        },
        { mostrarToastError: false },
      )
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cargando.set(false)),
      )
      .subscribe({
        next: (pagina) => {
          this.eventos.set(pagina.content.map((evento) => this.crearFilaEvento(evento)));
          this.totalPaginas.set(Math.max(1, pagina.totalPages));
        },
        error: () => {
          this.eventos.set([]);
          this.totalPaginas.set(1);
          this.errorListado.set('No se pudieron cargar los eventos.');
        },
      });
  }

  private cargarDetallePara(evento: EventoAccesoDetalleDto, accion: AccionDetalle): void {
    if (this.procesandoUuid()) {
      return;
    }

    this.procesandoUuid.set(evento.uuid);
    this.accionDetalle.set(accion);
    this.detalleCargando.set(true);
    this.errorPopup.set('');
    this.eventoSeleccionado.set(null);

    this.api
      .obtenerDetalle(evento.uuid, { mostrarToastError: false })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.detalleCargando.set(false);
          this.procesandoUuid.set(null);
          this.accionDetalle.set(null);
        }),
      )
      .subscribe({
        next: (detalle) => {
          this.eventoSeleccionado.set(detalle);
          if (accion === 'ver') {
            this.popupDetalleAbierto.set(true);
          }
          if (accion === 'editar') {
            this.editando.set(true);
            this.formularioVersion.update((version) => version + 1);
            this.popupFormularioAbierto.set(true);
          }
          if (accion === 'ingresar') {
            this.popupOperacionAbierto.set(true);
          }
        },
        error: () => {
          const mensaje =
            accion === 'ingresar'
              ? 'No se pudo abrir la operación del evento.'
              : 'No se pudo obtener el detalle actualizado del evento.';
          this.errorListado.set(mensaje);
          this.toast.error(mensaje, { titulo: 'Eventos de acceso' });
        },
      });
  }

  private esAccionCargando(evento: EventoAccesoDetalleDto, accion: AccionDetalle): boolean {
    return this.procesandoUuid() === evento.uuid && this.accionDetalle() === accion;
  }

  private eventoYaFinalizo(evento: EventoAccesoDetalleDto): boolean {
    const fechaEvento = this.obtenerFechaLocal(evento.fecha);
    if (!fechaEvento) return false;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return fechaEvento < hoy;
  }

  private obtenerFechaLocal(fecha: EventoAccesoDetalleDto['fecha']): Date | null {
    if (Array.isArray(fecha) && fecha.length >= 3) {
      const [anio, mes, dia] = fecha;
      if ([anio, mes, dia].every((parte) => Number.isInteger(parte))) {
        return new Date(anio, mes - 1, dia);
      }
      return null;
    }

    if (typeof fecha !== 'string') return null;
    const valor = fecha.trim();
    const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor);
    const formatoLocal = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(valor);
    const partes = iso
      ? [Number(iso[1]), Number(iso[2]), Number(iso[3])]
      : formatoLocal
        ? [Number(formatoLocal[3]), Number(formatoLocal[2]), Number(formatoLocal[1])]
        : null;
    if (!partes) return null;

    const [anio, mes, dia] = partes;
    const resultado = new Date(anio, mes - 1, dia);
    return resultado.getFullYear() === anio && resultado.getMonth() === mes - 1 && resultado.getDate() === dia
      ? resultado
      : null;
  }

  private crearFilaEvento(evento: EventoAccesoDetalleDto): EventoAccesoFila {
    return {
      ...evento,
      montoTotal: [formatearMoneda(evento.monto)],
    };
  }
}
