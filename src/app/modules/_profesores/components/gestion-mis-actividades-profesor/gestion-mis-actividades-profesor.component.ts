import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgIcon } from '@ng-icons/core';
import { finalize, Subject, takeUntil } from 'rxjs';

import { ActividadDto, ActividadInscriptoDto, ActividadPaginateDto } from '../../../../core/api/interfaces/actividades.interfaces';
import { ActividadesApiService } from '../../../../core/api/services/actividades-api.service';
import { provideTablaResponsiveIcons } from '../../../../core/icons/app-icons.registry';
import { normalizarDiasSemana } from '../../../../helpers/dias-semana.helpers';
import { CardComponent } from '../../../ui/card/card.component';
import { PaginacionComponent } from '../../../ui/paginacion/paginacion.component';
import { PopupComponent } from '../../../ui/popup/popup.component';
import { AccionTabla, ColumnaTabla, EventoAccionTabla, TablaResponsiveComponent } from '../../../ui/tabla-responsive/tabla-responsive.component';
import { TituloHeroComponent } from '../../../ui/titulo-hero/titulo-hero.component';

interface FilaInscripto extends ActividadInscriptoDto {
  readonly inscriptoUuid: string;
}

interface FilaActividad extends Omit<ActividadPaginateDto, 'diasSemana'> {
  readonly diasSemana: readonly string[];
}

@Component({
  selector: 'app-gestion-mis-actividades-profesor',
  standalone: true,
  imports: [CardComponent, NgIcon, PaginacionComponent, PopupComponent, TablaResponsiveComponent, TituloHeroComponent],
  providers: [provideTablaResponsiveIcons()],
  templateUrl: './gestion-mis-actividades-profesor.component.html',
  styleUrl: './gestion-mis-actividades-profesor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GestionMisActividadesProfesorComponent {
  private readonly api = inject(ActividadesApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cancelarDetalle$ = new Subject<void>();

  protected readonly actividades = signal<readonly FilaActividad[]>([]);
  protected readonly paginaActual = signal(1);
  protected readonly totalPaginas = signal(1);
  protected readonly cargando = signal(false);
  protected readonly detalleAbierto = signal(false);
  protected readonly detalle = signal<ActividadDto | null>(null);
  protected readonly cargandoDetalle = signal(false);
  protected readonly detalleCargandoUuid = signal<string | null>(null);
  protected readonly error = signal('');
  protected readonly errorDetalle = signal('');

  protected readonly diasHabituales = computed(() => normalizarDiasSemana(this.detalle()?.diasSemana));
  protected readonly filasInscriptos = computed<readonly FilaInscripto[]>(() =>
    this.mapearInscriptos(this.detalle()?.inscriptos ?? []),
  );
  protected readonly cupoCompleto = computed(() => {
    const actividad = this.detalle();
    return !!actividad && actividad.inscriptos.length >= actividad.cupoMaximo;
  });

  protected readonly columnas: readonly ColumnaTabla<FilaActividad>[] = [
    { id: 'nombre', titulo: 'Actividad', ancho: 'minmax(12rem, 1fr)' },
    { id: 'ubicacion', titulo: 'Ubicación', ancho: 'minmax(10rem, 1fr)' },
    { id: 'diasSemana', titulo: 'Días', tipo: 'chips', ancho: 'minmax(11rem, 1fr)' },
    { id: 'horaInicio', titulo: 'Inicio habitual', tipo: 'horario', ancho: '10rem', formatearTexto: (valor) => this.formatearHora(valor) },
    { id: 'horaFin', titulo: 'Fin habitual', tipo: 'horario', ancho: '10rem', formatearTexto: (valor) => this.formatearHora(valor) },
    { id: 'cantidadInscriptos', titulo: 'Inscriptos', tipo: 'numero', ancho: '8rem' },
  ];
  protected readonly acciones: readonly AccionTabla<FilaActividad>[] = [
    {
      id: 'ver-actividad',
      texto: 'Ver actividad',
      icono: 'heroEye',
      color: 'var(--app-accent)',
      deshabilitada: () => this.cargandoDetalle(),
      cargando: (actividad) => this.detalleCargandoUuid() === actividad.actividadUuid,
    },
  ];
  protected readonly columnasInscriptos: readonly ColumnaTabla<FilaInscripto>[] = [
    { id: 'imageUrl', titulo: 'Foto', tipo: 'avatar', avatarMostrarNombre: false, ancho: '5.5rem' },
    { id: 'nombre', titulo: 'Nombre', ancho: 'minmax(9rem, 1fr)' },
    { id: 'apellido', titulo: 'Apellido', ancho: 'minmax(9rem, 1fr)' },
    { id: 'dni', titulo: 'DNI', ancho: '9rem' },
    { id: 'fechaNacimiento', titulo: 'Fecha de nacimiento', ancho: '11rem' },
  ];

  constructor() {
    queueMicrotask(() => this.cargar());
  }

  protected cambiarPagina(pagina: number): void {
    this.paginaActual.set(pagina);
    this.cargar();
  }

  protected formatearHora(valor: unknown): string {
    const hora = String(valor ?? '').trim().replace(',', ':');
    const coincidencia = hora.match(/^(\d{1,2}):(\d{2})/);
    return coincidencia ? `${coincidencia[1].padStart(2, '0')}:${coincidencia[2]}` : hora;
  }

  protected manejarAccion({ accion, fila }: EventoAccionTabla<FilaActividad>): void {
    if (accion === 'ver-actividad') this.verActividad(fila);
  }

  protected cerrarDetalle(): void {
    this.cancelarDetalle$.next();
    this.detalleAbierto.set(false);
    this.detalle.set(null);
    this.cargandoDetalle.set(false);
    this.detalleCargandoUuid.set(null);
    this.errorDetalle.set('');
  }

  private cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.api.paginar({ page: this.paginaActual(), size: 15, search: '', completa: null })
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (pagina) => {
          this.actividades.set(pagina.content.map((actividad) => this.mapearFila(actividad)));
          this.totalPaginas.set(Math.max(1, pagina.totalPages));
        },
        error: () => {
          this.actividades.set([]);
          this.totalPaginas.set(1);
          this.error.set('No se pudieron cargar las actividades asignadas.');
        },
      });
  }

  private verActividad(actividad: Pick<ActividadPaginateDto, 'actividadUuid'>): void {
    this.cancelarDetalle$.next();
    this.detalleAbierto.set(false);
    this.detalle.set(null);
    this.errorDetalle.set('');
    this.cargandoDetalle.set(true);
    this.detalleCargandoUuid.set(actividad.actividadUuid);
    this.api.obtenerDetalle(actividad.actividadUuid)
      .pipe(
        takeUntil(this.cancelarDetalle$),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.cargandoDetalle.set(false);
          this.detalleCargandoUuid.set(null);
          this.detalleAbierto.set(true);
        }),
      )
      .subscribe({
        next: (detalle) => this.detalle.set(detalle),
        error: () => this.errorDetalle.set('No se pudo cargar el detalle de la actividad.'),
      });
  }

  private mapearInscriptos(inscriptos: readonly ActividadInscriptoDto[]): readonly FilaInscripto[] {
    return inscriptos.map((inscripto, indice) => ({
      ...inscripto,
      inscriptoUuid: inscripto.userUuid?.trim() || inscripto.memberUuid?.trim() || `${inscripto.dni}-${indice}`,
    }));
  }

  private mapearFila(actividad: ActividadPaginateDto): FilaActividad {
    return { ...actividad, diasSemana: normalizarDiasSemana(actividad.diasSemana) };
  }
}
