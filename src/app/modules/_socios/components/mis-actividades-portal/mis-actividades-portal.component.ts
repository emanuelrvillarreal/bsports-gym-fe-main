import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { provideIcons } from '@ng-icons/core';
import { heroClock } from '@ng-icons/heroicons/outline';
import { finalize } from 'rxjs';

import {
  ActividadHorarioDto,
  PortalInscripcionActividadDto,
} from '../../../../core/api/interfaces/actividades.interfaces';
import { PortalSocioApiService } from '../../../../core/api/services/portal-socio-api.service';
import { AuthSessionService } from '../../../../core/global-services/services/auth-session.service';
import { GrupoFamiliarCacheService } from '../../../../core/global-services/services/grupo-familiar-cache.service';
import { formatearHoraTabla } from '../../../../helpers/tabla-hora-fin.helpers';
import { SelectorHorariosActividadComponent } from '../../../_compartido-perfiles/components/selector-horarios-actividad/selector-horarios-actividad.component';
import { BotonComponent } from '../../../ui/boton/boton.component';
import { CardComponent } from '../../../ui/card/card.component';
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

interface MisActividadesFila {
  readonly inscripcionUuid: string;
  readonly actividadUuid: string;
  readonly actividad: string;
  readonly inscripto: string;
  readonly fechaInscripcion: string;
  readonly horariosElegidos: readonly string[];
  readonly horarioUuids: readonly string[];
  readonly horariosActividad: readonly ActividadHorarioDto[];
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

@Component({
  selector: 'app-mis-actividades-portal',
  standalone: true,
  imports: [
    BotonComponent,
    CardComponent,
    PopupComponent,
    SelectComponent,
    SelectorHorariosActividadComponent,
    TablaResponsiveComponent,
    TituloHeroComponent,
  ],
  providers: [provideIcons({ heroClock })],
  templateUrl: './mis-actividades-portal.component.html',
  styleUrl: './mis-actividades-portal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MisActividadesPortalComponent {
  private readonly portalApi = inject(PortalSocioApiService);
  private readonly grupoFamiliarCache = inject(GrupoFamiliarCacheService);
  private readonly authSession = inject(AuthSessionService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(ToastAlertService);
  private cargaId = 0;

  protected readonly esTitular = this.authSession.obtenerRolActivo() === 'SOCIO_TITULAR';
  protected readonly filas = signal<readonly MisActividadesFila[]>([]);
  protected readonly cargando = signal(false);
  protected readonly error = signal('');
  protected readonly integrantes = signal<readonly SelectOption[]>([]);
  protected readonly miembroSeleccionado = signal('');
  protected readonly errorGrupo = signal('');
  protected readonly opcionesMiembros = computed<readonly SelectOption[]>(() => [
    { value: '', label: 'Yo' },
    ...this.integrantes(),
  ]);
  protected readonly columnas: readonly ColumnaTabla<MisActividadesFila>[] = [
    { id: 'actividad', titulo: 'Actividad', ancho: 'minmax(10rem, 1.2fr)' },
    { id: 'inscripto', titulo: 'Inscripto', ancho: 'minmax(8rem, 1fr)' },
    { id: 'horariosElegidos', titulo: 'Horarios', tipo: 'chips', ancho: 'minmax(12rem, 1.4fr)' },
    { id: 'fechaInscripcion', titulo: 'Fecha', tipo: 'fecha', ancho: '8rem' },
  ];
  /** Solo el titular puede cambiar horarios (propios o de su grupo familiar). */
  protected readonly acciones: readonly AccionTabla<MisActividadesFila>[] = this.esTitular
    ? [
        {
          id: 'cambiar-horarios',
          texto: 'Cambiar horarios',
          icono: 'heroClock',
          color: 'var(--app-accent)',
          visible: (fila) => fila.horariosActividad.length > 1,
        },
      ]
    : [];
  protected readonly inscripcionEditada = signal<MisActividadesFila | null>(null);
  protected readonly horariosEditados = signal<readonly string[]>([]);
  protected readonly guardandoHorarios = signal(false);
  protected readonly hayCambiosHorarios = computed(() => {
    const fila = this.inscripcionEditada();
    const editados = this.horariosEditados();
    return (
      !!fila &&
      editados.length > 0 &&
      (editados.length !== fila.horarioUuids.length ||
        editados.some((uuid) => !fila.horarioUuids.includes(uuid)))
    );
  });

  constructor() {
    this.cargar();
    if (this.esTitular) this.cargarGrupo();
  }

  protected cargar(): void {
    this.cargarInscripciones();
  }

  recargar(): void {
    this.cargar();
  }

  protected manejarAccion(evento: EventoAccionTabla<MisActividadesFila>): void {
    if (evento.accion !== 'cambiar-horarios') return;
    this.inscripcionEditada.set(evento.fila);
    this.horariosEditados.set(evento.fila.horarioUuids);
  }

  protected cerrarCambioHorarios(): void {
    if (this.guardandoHorarios()) return;
    this.inscripcionEditada.set(null);
    this.horariosEditados.set([]);
  }

  protected guardarHorarios(): void {
    const fila = this.inscripcionEditada();
    if (!fila || !this.hayCambiosHorarios() || this.guardandoHorarios()) return;
    this.guardandoHorarios.set(true);
    this.portalApi
      .cambiarHorariosActividad({
        actividadUuid: fila.actividadUuid,
        memberUuid: this.miembroSeleccionado() || null,
        horarioUuids: this.horariosEditados(),
      })
      .pipe(finalize(() => this.guardandoHorarios.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success(`Actualizamos tus horarios de ${fila.actividad}.`, {
            titulo: 'Horarios actualizados',
          });
          this.inscripcionEditada.set(null);
          this.cargarInscripciones();
        },
        error: (error: unknown) => {
          const mensaje =
            error instanceof HttpErrorResponse && typeof error.error?.userMessage === 'string'
              ? error.error.userMessage
              : 'No se pudieron cambiar los horarios. Intentá nuevamente.';
          this.toast.error(mensaje, { titulo: 'Cambiar horarios' });
        },
      });
  }

  protected cambiarMiembro(memberUuid: string): void {
    if (memberUuid === this.miembroSeleccionado()) return;
    this.miembroSeleccionado.set(memberUuid);
    this.cargarInscripciones();
  }

  private cargarGrupo(): void {
    this.errorGrupo.set('');
    this.grupoFamiliarCache
      .obtener()
      .pipe(takeUntilDestroyed(this.destroyRef))
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
        error: () => this.errorGrupo.set('No se pudo cargar el grupo familiar.'),
      });
  }

  private cargarInscripciones(): void {
    const id = ++this.cargaId;
    const memberUuid = this.miembroSeleccionado();
    this.cargando.set(true);
    this.error.set('');
    const peticion = memberUuid
      ? this.portalApi.listarInscripcionesActividadesFamiliar(memberUuid)
      : this.portalApi.listarMisInscripcionesActividades();
    peticion
      .pipe(
        finalize(() => {
          if (id === this.cargaId) this.cargando.set(false);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (inscripciones) => {
          if (id !== this.cargaId) return;
          this.filas.set(inscripciones.map((inscripcion) => this.mapearFila(inscripcion)));
        },
        error: (error: unknown) => {
          if (id !== this.cargaId) return;
          this.filas.set([]);
          this.mostrarErrorListado(error, memberUuid);
        },
      });
  }

  private mostrarErrorListado(error: unknown, memberUuid: string): void {
    const status = error instanceof HttpErrorResponse ? error.status : 0;
    if (memberUuid && (status === 403 || status === 404)) {
      this.miembroSeleccionado.set('');
      this.grupoFamiliarCache.invalidar();
      this.cargarGrupo();
      this.error.set(
        status === 404
          ? 'Ese integrante ya no está en el gimnasio. Actualizamos el grupo familiar.'
          : 'Ese integrante no pertenece a tu grupo familiar.',
      );
      return;
    }
    this.error.set('No se pudieron cargar las actividades inscriptas.');
  }

  private mapearFila(inscripcion: PortalInscripcionActividadDto): MisActividadesFila {
    const horariosActividad = inscripcion.horarios ?? [];
    const horarioUuids = inscripcion.horarioUuids ?? [];
    return {
      inscripcionUuid: inscripcion.inscripcionUuid,
      actividadUuid: inscripcion.actividadUuid,
      actividad: inscripcion.actividadNombre,
      inscripto: `${inscripcion.memberNombre} ${inscripcion.memberApellido}`.trim(),
      fechaInscripcion: inscripcion.fechaInscripcion,
      horarioUuids,
      horariosActividad,
      horariosElegidos: horariosActividad
        .filter((horario) => horarioUuids.includes(horario.uuid))
        .map(
          (horario) =>
            `${ABREVIATURAS_DIA[horario.diaSemana]} ${formatearHoraTabla(horario.horaInicio)}–${formatearHoraTabla(horario.horaFin)}`,
        ),
    };
  }
}
