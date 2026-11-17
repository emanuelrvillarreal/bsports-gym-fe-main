import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import {
  ActividadHorarioDto,
  ActividadPaginateDto,
  PaginarActividadesPayload,
  PortalInscripcionActividadPayload,
} from '../../../../../core/api/interfaces/actividades.interfaces';
import { ActividadesApiService } from '../../../../../core/api/services/actividades-api.service';
import { PortalSocioApiService } from '../../../../../core/api/services/portal-socio-api.service';
import { GrupoFamiliarCacheService } from '../../../../../core/global-services/services/grupo-familiar-cache.service';
import { normalizarDiasSemana } from '../../../../../helpers/dias-semana.helpers';
import { formatearHoraTabla } from '../../../../../helpers/tabla-hora-fin.helpers';
import { SelectorHorariosActividadComponent } from '../../../../_compartido-perfiles/components/selector-horarios-actividad/selector-horarios-actividad.component';
import { BotonComponent } from '../../../../ui/boton/boton.component';
import { CardComponent } from '../../../../ui/card/card.component';
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
import { TituloHeroComponent } from '../../../../ui/titulo-hero/titulo-hero.component';

interface ActividadPortalFila {
  readonly actividadUuid: string;
  readonly nombre: string;
  readonly ubicacion: string;
  readonly dias: readonly string[];
  readonly horario: string;
  readonly cuota: number;
  readonly categoria: string;
  readonly cuposDisponibles: readonly string[];
  readonly completa: boolean;
  readonly horarios: readonly ActividadHorarioDto[];
}

const ABREVIATURAS_DIA: Readonly<Record<string, string>> = {
  LUNES: 'Lun',
  MARTES: 'Mar',
  MIERCOLES: 'Mié',
  JUEVES: 'Jue',
  VIERNES: 'Vie',
  SABADO: 'Sáb',
  DOMINGO: 'Dom',
};

const ACTIVIDADES_POR_PAGINA = 20;

@Component({
  selector: 'app-actividades-portal',
  standalone: true,
  imports: [
    BotonComponent,
    CardComponent,
    PaginacionComponent,
    PopupComponent,
    SelectComponent,
    SelectorHorariosActividadComponent,
    TablaResponsiveComponent,
    TituloHeroComponent,
  ],
  templateUrl: './actividades-portal.component.html',
  styleUrl: './actividades-portal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActividadesPortalComponent {
  private readonly actividadesApi = inject(ActividadesApiService);
  private readonly portalApi = inject(PortalSocioApiService);
  private readonly grupoFamiliarCache = inject(GrupoFamiliarCacheService);
  private readonly toast = inject(ToastAlertService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly filas = signal<readonly ActividadPortalFila[]>([]);
  protected readonly cargando = signal(false);
  protected readonly error = signal('');
  protected readonly busqueda = signal('');
  protected readonly paginaActual = signal(1);
  protected readonly totalPaginas = signal(1);
  protected readonly actividadSeleccionada = signal<ActividadPortalFila | null>(null);
  protected readonly integrantes = signal<readonly SelectOption[]>([]);
  protected readonly integranteSeleccionado = signal('');
  protected readonly cargandoIntegrantes = signal(false);
  protected readonly errorIntegrantes = signal('');
  protected readonly inscribiendo = signal(false);
  protected readonly horariosSeleccionados = signal<readonly string[]>([]);
  protected readonly opcionesCompleta: readonly SelectOption[] = [
    { value: '', label: 'Todas' },
    { value: 'false', label: 'Con cupo' },
    { value: 'true', label: 'Completas' },
  ];
  readonly inscripcionConfirmada = output<void>();
  protected readonly filtroCompleta = signal('');
  protected readonly opcionesIntegrantes = computed<readonly SelectOption[]>(() => [
    { value: '', label: 'Yo' },
    ...this.integrantes(),
  ]);
  protected readonly columnas: readonly ColumnaTabla<ActividadPortalFila>[] = [
    { id: 'nombre', titulo: 'Actividad', ancho: 'minmax(10rem, 1.2fr)' },
    { id: 'ubicacion', titulo: 'Ubicación', ancho: 'minmax(8rem, 1fr)' },
    { id: 'dias', titulo: 'Horarios', tipo: 'chips', ancho: 'minmax(12rem, 1.4fr)' },
    { id: 'horario', titulo: 'Horario', tipo: 'horario', ancho: '10rem' },
    { id: 'cuota', titulo: 'Cuota', tipo: 'moneda', ancho: '8rem' },
    { id: 'categoria', titulo: 'Categoría', ancho: 'minmax(8rem, 1fr)' },
    { id: 'cuposDisponibles', titulo: 'Cupos', tipo: 'chips', ancho: '8rem' },
  ];
  protected readonly acciones: readonly AccionTabla<ActividadPortalFila>[] = [
    {
      predefinida: 'inscribir',
      deshabilitada: (fila) => fila.completa,
      cargando: (fila) =>
        (this.inscribiendo() || this.cargandoIntegrantes()) &&
        this.actividadSeleccionada()?.actividadUuid === fila.actividadUuid,
    },
  ];

  constructor() {
    this.cargarActividades();
  }

  protected actualizarBusqueda(evento: Event): void {
    this.busqueda.set((evento.target as HTMLInputElement).value);
  }

  protected buscar(): void {
    this.paginaActual.set(1);
    this.cargarActividades();
  }

  protected cambiarFiltroCompleta(valor: string): void {
    this.filtroCompleta.set(valor);
    this.paginaActual.set(1);
    this.cargarActividades();
  }

  protected cambiarPagina(pagina: number): void {
    if (pagina === this.paginaActual() || this.cargando()) return;
    this.paginaActual.set(pagina);
    this.cargarActividades();
  }

  protected manejarAccion(evento: EventoAccionTabla<ActividadPortalFila>): void {
    if (evento.accion !== 'inscribir' || evento.fila.completa) return;
    this.abrirInscripcion(evento.fila);
  }

  protected cambiarIntegrante(memberUuid: string): void {
    this.integranteSeleccionado.set(memberUuid);
  }

  protected cerrarInscripcion(): void {
    if (this.inscribiendo()) return;
    this.actividadSeleccionada.set(null);
    this.integrantes.set([]);
    this.integranteSeleccionado.set('');
    this.errorIntegrantes.set('');
    this.horariosSeleccionados.set([]);
  }

  protected async confirmarInscripcion(): Promise<void> {
    const actividad = this.actividadSeleccionada();
    if (!actividad || this.inscribiendo() || !this.horariosSeleccionados().length) return;

    const integrante = this.opcionesIntegrantes().find(
      (opcion) => opcion.value === this.integranteSeleccionado(),
    );
    const confirmado = await this.toast.confirm(
      `Vas a inscribir a ${integrante?.label ?? 'vos'} en ${actividad.nombre}.`,
      { titulo: 'Confirmar inscripción', textoConfirmar: 'Inscribir' },
    );
    if (!confirmado) return;

    const payload: PortalInscripcionActividadPayload = {
      actividadUuid: actividad.actividadUuid,
      memberUuid: this.integranteSeleccionado() || null,
      horarioUuids: this.horariosSeleccionados(),
    };
    this.inscribiendo.set(true);
    this.portalApi
      .inscribirActividad(payload)
      .pipe(finalize(() => this.inscribiendo.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (respuesta) => {
          this.cerrarInscripcion();
          this.toast.success(
            `${respuesta.memberNombre} ${respuesta.memberApellido} quedó inscripto/a en ${respuesta.actividadNombre}.`,
            { titulo: 'Inscripción confirmada' },
          );
          if (!respuesta.cuotaGenerada && respuesta.cuotaAdvertencia) {
            this.toast.encolarInfo(respuesta.cuotaAdvertencia, { titulo: 'Cuota de actividad' });
          }
          this.inscripcionConfirmada.emit();
          this.cargarActividades();
        },
        error: (error: unknown) => this.mostrarErrorInscripcion(error),
      });
  }

  private abrirInscripcion(actividad: ActividadPortalFila): void {
    this.actividadSeleccionada.set(actividad);
    // Con un único horario no hay nada que elegir: queda marcado.
    this.horariosSeleccionados.set(actividad.horarios.length === 1 ? [actividad.horarios[0].uuid] : []);
    this.integrantes.set([]);
    this.integranteSeleccionado.set('');
    this.errorIntegrantes.set('');
    this.cargandoIntegrantes.set(true);
    this.grupoFamiliarCache
      .obtener()
      .pipe(finalize(() => this.cargandoIntegrantes.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (grupo) => {
          this.integrantes.set(
            grupo.integrantes
              .filter(({ member }) => !member.titular && member.estado?.toUpperCase() === 'ACTIVO')
              .map(({ member }) => ({
                value: member.memberUuid,
                label: `${member.nombre} ${member.apellido}`.trim(),
              })),
          );
        },
        error: () => this.errorIntegrantes.set('No se pudo cargar el grupo familiar.'),
      });
  }

  protected cargarActividades(): void {
    if (this.cargando()) return;
    this.cargando.set(true);
    this.error.set('');
    const payload: PaginarActividadesPayload = {
      page: this.paginaActual(),
      size: ACTIVIDADES_POR_PAGINA,
      search: this.busqueda().trim(),
      completa: this.filtroCompleta() ? this.filtroCompleta() === 'true' : null,
    };
    this.actividadesApi
      .paginar(payload)
      .pipe(finalize(() => this.cargando.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (respuesta) => {
          this.filas.set(respuesta.content.map((actividad) => this.mapearFila(actividad)));
          this.totalPaginas.set(Math.max(1, respuesta.totalPages));
        },
        error: () => {
          this.filas.set([]);
          this.totalPaginas.set(1);
          this.error.set('No se pudieron cargar las actividades disponibles.');
        },
      });
  }

  private mostrarErrorInscripcion(error: unknown): void {
    const respuesta = error instanceof HttpErrorResponse ? error : null;
    const mensaje =
      typeof respuesta?.error?.userMessage === 'string'
        ? respuesta.error.userMessage
        : 'No se pudo registrar la inscripción. Intentá nuevamente.';
    this.toast.error(mensaje, {
      titulo: respuesta?.status === 403 ? 'Permisos actualizados' : 'Inscripción a actividad',
    });
    if (respuesta?.status === 404) {
      this.cerrarInscripcion();
      this.cargarActividades();
    }
  }

  private mapearFila(actividad: ActividadPaginateDto): ActividadPortalFila {
    const horarios = actividad.horarios ?? [];
    // Con cupo por horario, la actividad está llena solo si no queda lugar en ningún horario.
    const estaCompleta = horarios.length
      ? actividad.completa || horarios.every((horario) => horario.disponibles <= 0)
      : actividad.completa ||
        actividad.cupoMaximo <= 0 ||
        actividad.cantidadInscriptos >= actividad.cupoMaximo;
    const lugaresLibres = horarios.reduce((total, horario) => total + horario.disponibles, 0);
    return {
      actividadUuid: actividad.actividadUuid,
      nombre: actividad.nombre,
      ubicacion: actividad.ubicacion,
      horarios,
      dias: horarios.length
        ? horarios.map(
            (horario) =>
              `${ABREVIATURAS_DIA[horario.diaSemana]} ${formatearHoraTabla(horario.horaInicio)}–${formatearHoraTabla(horario.horaFin)}`,
          )
        : normalizarDiasSemana(actividad.diasSemana),
      horario: `${formatearHoraTabla(actividad.horaInicio)} a ${formatearHoraTabla(actividad.horaFin)}`,
      cuota: actividad.importeCuota,
      categoria: actividad.categoriaNombre ?? '—',
      cuposDisponibles: [
        estaCompleta
          ? 'Lleno'
          : horarios.length
            ? `${lugaresLibres} ${lugaresLibres === 1 ? 'lugar' : 'lugares'}`
            : `${actividad.cantidadInscriptos}/${actividad.cupoMaximo}`,
      ],
      completa: estaCompleta,
    };
  }
}
