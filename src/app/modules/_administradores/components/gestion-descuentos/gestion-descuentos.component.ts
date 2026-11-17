import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import {
  ActividadPaginateDto,
  InscripcionActividadRowDto,
} from '../../../../core/api/interfaces/actividades.interfaces';
import {
  AsignarDescuentoPayload,
  DescuentoAsignadoDto,
  DescuentoDto,
  GuardarDescuentoPayload,
  MemberDescuentosDto,
} from '../../../../core/api/interfaces/descuentos.interfaces';
import { ActividadesApiService } from '../../../../core/api/services/actividades-api.service';
import { DescuentosApiService } from '../../../../core/api/services/descuentos-api.service';
import { provideTablaResponsiveIcons } from '../../../../core/icons/app-icons.registry';
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
import { formatearFechaCorta } from '../../../../helpers/fecha-formato';
import { FormularioAsignacionDescuentoComponent } from '../../forms/formulario-asignacion-descuento/formulario-asignacion-descuento.component';
import { FormularioDescuentoComponent } from '../../forms/formulario-descuento/formulario-descuento.component';
import { FormularioFinalizacionDescuentoComponent } from '../../forms/formulario-finalizacion-descuento/formulario-finalizacion-descuento.component';

const FILAS_POR_PAGINA = 10;
const CATALOGO_FILAS_POR_PAGINA = 50;

interface FilaCatalogo extends DescuentoDto {
  readonly tipo: string;
  readonly valor: string;
}

interface FilaMember extends MemberDescuentosDto {
  readonly cantidadSociales: number;
  readonly cantidadActividades: number;
  readonly cantidadVigentes: number;
}

interface FilaAsignacion extends DescuentoAsignadoDto {
  readonly alcance: 'SOCIAL' | 'ACTIVIDAD';
  readonly destino: string;
  readonly valor: string;
}

interface ContextoAsignacion {
  readonly tipo: 'SOCIAL' | 'ACTIVIDAD';
  readonly uuidDestino: string;
  readonly nombreDestino: string;
}

interface ContextoFinalizacion {
  readonly asignacion: FilaAsignacion;
}

@Component({
  selector: 'app-gestion-descuentos',
  standalone: true,
  imports: [
    BotonComponent,
    CardComponent,
    FormularioAsignacionDescuentoComponent,
    FormularioDescuentoComponent,
    FormularioFinalizacionDescuentoComponent,
    PaginacionComponent,
    PopupComponent,
    TablaResponsiveComponent,
    TituloHeroComponent,
  ],
  providers: [provideTablaResponsiveIcons()],
  templateUrl: './gestion-descuentos.component.html',
  styleUrl: './gestion-descuentos.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GestionDescuentosComponent {
  private readonly descuentosApi = inject(DescuentosApiService);
  private readonly actividadesApi = inject(ActividadesApiService);
  private readonly toast = inject(ToastAlertService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly catalogo = signal<readonly DescuentoDto[]>([]);
  protected readonly catalogoCompleto = signal<readonly DescuentoDto[]>([]);
  protected readonly paginaCatalogo = signal(1);
  protected readonly totalPaginasCatalogo = signal(1);
  protected readonly busquedaCatalogo = signal('');
  protected readonly cargandoCatalogo = signal(false);
  protected readonly descuentoFormulario = signal<DescuentoDto | null>(null);
  protected readonly formularioCatalogoAbierto = signal(false);
  protected readonly guardandoCatalogo = signal(false);

  protected readonly members = signal<readonly MemberDescuentosDto[]>([]);
  protected readonly paginaMembers = signal(1);
  protected readonly totalPaginasMembers = signal(1);
  protected readonly busquedaMembers = signal('');
  protected readonly cargandoMembers = signal(false);
  protected readonly memberSeleccionado = signal<MemberDescuentosDto | null>(null);

  protected readonly actividades = signal<readonly ActividadPaginateDto[]>([]);
  protected readonly paginaActividades = signal(1);
  protected readonly totalPaginasActividades = signal(1);
  protected readonly busquedaActividades = signal('');
  protected readonly cargandoActividades = signal(false);
  protected readonly actividadSeleccionada = signal<ActividadPaginateDto | null>(null);
  protected readonly inscripciones = signal<readonly InscripcionActividadRowDto[]>([]);
  protected readonly paginaInscripciones = signal(1);
  protected readonly totalPaginasInscripciones = signal(1);
  protected readonly busquedaInscripciones = signal('');
  protected readonly cargandoInscripciones = signal(false);

  protected readonly contextoAsignacion = signal<ContextoAsignacion | null>(null);
  protected readonly contextoFinalizacion = signal<ContextoFinalizacion | null>(null);
  protected readonly procesando = signal(false);
  protected readonly error = signal('');

  protected readonly filasCatalogo = computed<readonly FilaCatalogo[]>(() =>
    this.catalogo().map((descuento) => ({
      ...descuento,
      tipo: descuento.tipoValor === 'PORCENTAJE' ? 'Porcentaje' : 'Monto fijo',
      valor: this.formatearValor(descuento),
    })),
  );

  protected readonly filasMembers = computed<readonly FilaMember[]>(() =>
    this.members().map((member) => {
      const actividad = member.actividades.flatMap((item) => item.descuentos);
      const todas = [...member.cuotaSocial, ...actividad];
      return {
        ...member,
        cantidadSociales: member.cuotaSocial.length,
        cantidadActividades: actividad.length,
        cantidadVigentes: todas.filter((item) => item.vigente).length,
      };
    }),
  );

  protected readonly filasAsignacionesSeleccionadas = computed<readonly FilaAsignacion[]>(() => {
    const member = this.memberSeleccionado();
    if (!member) return [];
    const sociales = member.cuotaSocial.map((item) =>
      this.aFilaAsignacion(item, 'SOCIAL', 'Cuota social'),
    );
    const actividades = member.actividades.flatMap((actividad) =>
      actividad.descuentos.map((item) =>
        this.aFilaAsignacion(item, 'ACTIVIDAD', actividad.actividadNombre),
      ),
    );
    return [...sociales, ...actividades];
  });

  protected readonly columnasCatalogo: readonly ColumnaTabla<FilaCatalogo>[] = [
    { id: 'titulo', titulo: 'Descuento', ancho: 'minmax(12rem, 1.5fr)' },
    { id: 'tipo', titulo: 'Tipo', ancho: '9rem' },
    { id: 'valor', titulo: 'Valor', ancho: '9rem' },
  ];
  protected readonly accionesCatalogo: readonly AccionTabla<FilaCatalogo>[] = [
    { predefinida: 'editar', cargando: () => this.procesando() },
    { predefinida: 'borrar', cargando: () => this.procesando() },
  ];
  protected readonly columnasMembers: readonly ColumnaTabla<FilaMember>[] = [
    {
      id: 'fotoUrl',
      titulo: 'Socio',
      tipo: 'avatar',
      ancho: 'minmax(12rem, 1.5fr)',
      avatarNombre: (fila) => fila.nombre,
    },
    { id: 'cantidadSociales', titulo: 'Cuota social', tipo: 'numero', ancho: '8rem' },
    { id: 'cantidadActividades', titulo: 'Actividades', tipo: 'numero', ancho: '8rem' },
    { id: 'cantidadVigentes', titulo: 'Vigentes', tipo: 'numero', ancho: '7rem' },
  ];
  protected readonly accionesMembers: readonly AccionTabla<FilaMember>[] = [
    { predefinida: 'ver' },
    {
      id: 'asignar-social',
      texto: 'Asignar a cuota social',
      icono: 'heroPlus',
      color: 'var(--app-accent)',
    },
  ];
  protected readonly columnasAsignaciones: readonly ColumnaTabla<FilaAsignacion>[] = [
    { id: 'destino', titulo: 'Aplicación', ancho: 'minmax(10rem, 1fr)' },
    { id: 'titulo', titulo: 'Descuento', ancho: 'minmax(11rem, 1fr)' },
    { id: 'valor', titulo: 'Valor', ancho: '8rem' },
    {
      id: 'fechaDesde',
      titulo: 'Desde',
      tipo: 'fecha',
      ancho: '8rem',
      formatearTexto: (valor) => formatearFechaCorta(valor),
    },
    {
      id: 'fechaHasta',
      titulo: 'Hasta',
      tipo: 'fecha',
      ancho: '8rem',
      formatearTexto: (valor) => formatearFechaCorta(valor),
    },
  ];
  protected readonly accionesAsignaciones: readonly AccionTabla<FilaAsignacion>[] = [
    {
      id: 'finalizar',
      texto: 'Finalizar vigencia',
      icono: 'heroCalendarDays',
      color: 'var(--app-accent)',
      deshabilitada: (fila) => !fila.vigente,
    },
    { predefinida: 'borrar', cargando: () => this.procesando() },
  ];
  protected readonly columnasActividades: readonly ColumnaTabla<ActividadPaginateDto>[] = [
    { id: 'nombre', titulo: 'Actividad', ancho: 'minmax(12rem, 1.5fr)' },
    { id: 'ubicacion', titulo: 'Ubicación', ancho: 'minmax(10rem, 1fr)' },
    { id: 'cantidadInscriptos', titulo: 'Inscriptos', tipo: 'numero', ancho: '7rem' },
  ];
  protected readonly accionesActividades: readonly AccionTabla<ActividadPaginateDto>[] = [
    {
      id: 'ver-inscriptos',
      texto: 'Ver inscriptos',
      icono: 'heroUsers',
      color: 'var(--app-accent)',
    },
  ];
  protected readonly columnasInscripciones: readonly ColumnaTabla<InscripcionActividadRowDto>[] = [
    { id: 'nombre', titulo: 'Nombre', ancho: 'minmax(9rem, 1fr)' },
    { id: 'apellido', titulo: 'Apellido', ancho: 'minmax(9rem, 1fr)' },
    { id: 'estado', titulo: 'Estado', tipo: 'estado', ancho: '8rem' },
    { id: 'fechaInscripcion', titulo: 'Inscripción', tipo: 'fecha', ancho: '9rem' },
  ];
  protected readonly accionesInscripciones: readonly AccionTabla<InscripcionActividadRowDto>[] = [
    { id: 'asignar', texto: 'Asignar descuento', icono: 'heroPlus', color: 'var(--app-accent)' },
  ];

  constructor() {
    queueMicrotask(() => {
      this.cargarCatalogo();
      this.cargarMembers();
    });
  }

  protected actualizarBusquedaCatalogo(evento: Event): void {
    this.busquedaCatalogo.set((evento.target as HTMLInputElement).value);
  }
  protected actualizarBusquedaMembers(evento: Event): void {
    this.busquedaMembers.set((evento.target as HTMLInputElement).value);
  }
  protected actualizarBusquedaActividades(evento: Event): void {
    this.busquedaActividades.set((evento.target as HTMLInputElement).value);
  }
  protected actualizarBusquedaInscripciones(evento: Event): void {
    this.busquedaInscripciones.set((evento.target as HTMLInputElement).value);
  }

  protected buscarCatalogo(): void {
    this.paginaCatalogo.set(1);
    this.cargarCatalogo();
  }
  protected buscarMembers(): void {
    this.paginaMembers.set(1);
    this.cargarMembers();
  }
  protected buscarActividades(): void {
    this.paginaActividades.set(1);
    this.cargarActividades();
  }
  protected buscarInscripciones(): void {
    this.paginaInscripciones.set(1);
    this.cargarInscripciones();
  }
  protected cambiarPaginaCatalogo(pagina: number): void {
    this.paginaCatalogo.set(pagina);
    this.cargarCatalogo();
  }
  protected cambiarPaginaMembers(pagina: number): void {
    this.paginaMembers.set(pagina);
    this.cargarMembers();
  }
  protected cambiarPaginaActividades(pagina: number): void {
    this.paginaActividades.set(pagina);
    this.cargarActividades();
  }
  protected cambiarPaginaInscripciones(pagina: number): void {
    this.paginaInscripciones.set(pagina);
    this.cargarInscripciones();
  }

  protected abrirAltaCatalogo(): void {
    this.descuentoFormulario.set(null);
    this.formularioCatalogoAbierto.set(true);
  }
  protected cerrarFormularioCatalogo(): void {
    if (!this.guardandoCatalogo()) this.formularioCatalogoAbierto.set(false);
  }
  protected cerrarDetalleMember(): void {
    if (!this.procesando()) this.memberSeleccionado.set(null);
  }
  protected cerrarInscripciones(): void {
    if (!this.procesando()) this.actividadSeleccionada.set(null);
  }
  protected cerrarAsignacion(): void {
    if (!this.procesando()) this.contextoAsignacion.set(null);
  }
  protected cerrarFinalizacion(): void {
    if (!this.procesando()) this.contextoFinalizacion.set(null);
  }

  protected manejarCatalogo(evento: EventoAccionTabla<FilaCatalogo>): void {
    if (evento.accion === 'editar') {
      this.descuentoFormulario.set(evento.fila);
      this.formularioCatalogoAbierto.set(true);
    } else if (evento.accion === 'borrar') void this.eliminarDescuento(evento.fila);
  }

  protected manejarMember(evento: EventoAccionTabla<FilaMember>): void {
    if (evento.accion === 'ver') this.memberSeleccionado.set(evento.fila);
    if (evento.accion === 'asignar-social') this.prepararAsignacionSocial(evento.fila);
  }

  protected manejarAsignacion(evento: EventoAccionTabla<FilaAsignacion>): void {
    if (evento.accion === 'finalizar') this.contextoFinalizacion.set({ asignacion: evento.fila });
    if (evento.accion === 'borrar') void this.eliminarAsignacion(evento.fila);
  }

  protected manejarActividad(evento: EventoAccionTabla<ActividadPaginateDto>): void {
    if (evento.accion !== 'ver-inscriptos') return;
    this.actividadSeleccionada.set(evento.fila);
    this.paginaInscripciones.set(1);
    this.busquedaInscripciones.set('');
    this.cargarInscripciones();
  }

  protected manejarInscripcion(evento: EventoAccionTabla<InscripcionActividadRowDto>): void {
    if (evento.accion !== 'asignar') return;
    const actividad = this.actividadSeleccionada();
    if (!actividad) return;
    this.contextoAsignacion.set({
      tipo: 'ACTIVIDAD',
      uuidDestino: evento.fila.inscripcionUuid,
      nombreDestino: `${evento.fila.nombre} ${evento.fila.apellido} · ${actividad.nombre}`,
    });
    this.actividadSeleccionada.set(null);
  }

  protected guardarCatalogo(payload: GuardarDescuentoPayload): void {
    if (this.guardandoCatalogo()) return;
    const actual = this.descuentoFormulario();
    this.guardandoCatalogo.set(true);
    const request = actual
      ? this.descuentosApi.actualizar(actual.descuentoUuid, payload)
      : this.descuentosApi.crear(payload);
    request
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.guardandoCatalogo.set(false)),
      )
      .subscribe({
        next: () => {
          this.formularioCatalogoAbierto.set(false);
          this.cargarCatalogo();
        },
        error: () => this.error.set('No se pudo guardar el descuento.'),
      });
  }

  protected guardarAsignacion(payload: AsignarDescuentoPayload): void {
    const contexto = this.contextoAsignacion();
    if (!contexto || this.procesando()) return;
    this.procesando.set(true);
    const request =
      contexto.tipo === 'SOCIAL'
        ? this.descuentosApi.asignarASocio(contexto.uuidDestino, payload)
        : this.descuentosApi.asignarAActividad(contexto.uuidDestino, payload);
    request
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.procesando.set(false)),
      )
      .subscribe({
        next: () => {
          this.contextoAsignacion.set(null);
          this.memberSeleccionado.set(null);
          this.cargarMembers();
        },
        error: () => this.error.set('No se pudo asignar el descuento.'),
      });
  }

  protected finalizarAsignacion(payload: { readonly fecha: string }): void {
    const contexto = this.contextoFinalizacion();
    if (!contexto || this.procesando()) return;
    this.procesando.set(true);
    const fila = contexto.asignacion;
    const request =
      fila.alcance === 'SOCIAL'
        ? this.descuentosApi.finalizarAsignacionSocio(fila.asignacionUuid, payload)
        : this.descuentosApi.finalizarAsignacionActividad(fila.asignacionUuid, payload);
    request
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.procesando.set(false)),
      )
      .subscribe({
        next: () => {
          this.contextoFinalizacion.set(null);
          this.memberSeleccionado.set(null);
          this.cargarMembers();
        },
        error: () => this.error.set('No se pudo finalizar la asignación.'),
      });
  }

  protected prepararAsignacionSocial(member: MemberDescuentosDto): void {
    this.contextoAsignacion.set({
      tipo: 'SOCIAL',
      uuidDestino: member.memberUuid,
      nombreDestino: member.nombre,
    });
    this.memberSeleccionado.set(null);
  }

  private async eliminarDescuento(descuento: DescuentoDto): Promise<void> {
    const confirmado = await this.toast.confirmDanger(
      `Se eliminará “${descuento.titulo}” y también todas sus asignaciones vigentes o históricas. Las cuotas ya generadas no cambiarán. Esta acción no se puede deshacer.`,
      { titulo: 'Eliminar descuento', textoConfirmar: 'Eliminar definitivamente' },
    );
    if (!confirmado) return;
    this.procesando.set(true);
    this.descuentosApi
      .eliminar(descuento.descuentoUuid)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.procesando.set(false)),
      )
      .subscribe({
        next: () => {
          this.cargarCatalogo();
          this.cargarMembers();
        },
        error: () => this.error.set('No se pudo eliminar el descuento.'),
      });
  }

  private async eliminarAsignacion(fila: FilaAsignacion): Promise<void> {
    const confirmado = await this.toast.confirmDanger(
      `Se borrará físicamente la asignación “${fila.titulo}” de ${fila.destino}. Si querés conservar el historial, usá Finalizar.`,
      { titulo: 'Eliminar asignación', textoConfirmar: 'Eliminar definitivamente' },
    );
    if (!confirmado) return;
    this.procesando.set(true);
    const request =
      fila.alcance === 'SOCIAL'
        ? this.descuentosApi.eliminarAsignacionSocio(fila.asignacionUuid)
        : this.descuentosApi.eliminarAsignacionActividad(fila.asignacionUuid);
    request
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.procesando.set(false)),
      )
      .subscribe({
        next: () => {
          this.memberSeleccionado.set(null);
          this.cargarMembers();
        },
        error: () => this.error.set('No se pudo eliminar la asignación.'),
      });
  }

  private cargarCatalogo(): void {
    this.cargandoCatalogo.set(true);
    this.descuentosApi
      .paginarCatalogo({
        page: this.paginaCatalogo(),
        size: CATALOGO_FILAS_POR_PAGINA,
        search: this.busquedaCatalogo().trim(),
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cargandoCatalogo.set(false)),
      )
      .subscribe({
        next: (r) => {
          this.catalogo.set(r.content);
          this.totalPaginasCatalogo.set(Math.max(1, r.totalPages));
          // La respuesta de 50 elementos también sirve como caché para los
          // selectores mientras el catálogo no supere ese límite.
          if (!this.busquedaCatalogo().trim() && this.paginaCatalogo() === 1) {
            if (r.totalElements <= CATALOGO_FILAS_POR_PAGINA) {
              this.catalogoCompleto.set(r.content);
            } else {
              this.cargarPaginaCatalogoCompleto(2, r.content);
            }
          }
        },
        error: () => this.error.set('No se pudo cargar el catálogo de descuentos.'),
      });
  }

  private cargarPaginaCatalogoCompleto(
    pagina: number,
    acumulados: readonly DescuentoDto[],
  ): void {
    this.descuentosApi
      .paginarCatalogo({ page: pagina, size: CATALOGO_FILAS_POR_PAGINA, search: '' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (respuesta) => {
          const catalogo = [...acumulados, ...respuesta.content];
          if (pagina < respuesta.totalPages) {
            this.cargarPaginaCatalogoCompleto(pagina + 1, catalogo);
            return;
          }
          this.catalogoCompleto.set(catalogo);
        },
        error: () =>
          this.error.set('No se pudieron cargar los descuentos disponibles para asignar.'),
      });
  }

  private cargarMembers(): void {
    this.cargandoMembers.set(true);
    this.descuentosApi
      .paginarPorSocio({
        page: this.paginaMembers(),
        size: FILAS_POR_PAGINA,
        search: this.busquedaMembers().trim(),
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cargandoMembers.set(false)),
      )
      .subscribe({
        next: (r) => {
          this.members.set(r.content);
          this.totalPaginasMembers.set(Math.max(1, r.totalPages));
        },
        error: () => this.error.set('No se pudieron cargar las asignaciones por socio.'),
      });
  }

  private cargarActividades(): void {
    this.cargandoActividades.set(true);
    this.actividadesApi
      .paginar({
        page: this.paginaActividades(),
        size: FILAS_POR_PAGINA,
        search: this.busquedaActividades().trim(),
        completa: null,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cargandoActividades.set(false)),
      )
      .subscribe({
        next: (r) => {
          this.actividades.set(r.content);
          this.totalPaginasActividades.set(Math.max(1, r.totalPages));
        },
        error: () => this.error.set('No se pudieron cargar las actividades.'),
      });
  }

  private cargarInscripciones(): void {
    const actividad = this.actividadSeleccionada();
    if (!actividad) return;
    this.cargandoInscripciones.set(true);
    this.actividadesApi
      .paginarInscripciones(actividad.actividadUuid, {
        page: this.paginaInscripciones(),
        size: FILAS_POR_PAGINA,
        search: this.busquedaInscripciones().trim(),
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cargandoInscripciones.set(false)),
      )
      .subscribe({
        next: (r) => {
          this.inscripciones.set(r.content);
          this.totalPaginasInscripciones.set(Math.max(1, r.totalPages));
        },
        error: () => this.error.set('No se pudo cargar la nómina de la actividad.'),
      });
  }

  private aFilaAsignacion(
    item: DescuentoAsignadoDto,
    alcance: 'SOCIAL' | 'ACTIVIDAD',
    destino: string,
  ): FilaAsignacion {
    return {
      ...item,
      alcance,
      destino,
      valor: this.formatearValor(item),
    };
  }

  private formatearValor(descuento: DescuentoDto): string {
    return descuento.tipoValor === 'PORCENTAJE'
      ? `${descuento.porcentaje ?? 0}%`
      : new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(
          descuento.montoFijo ?? 0,
        );
  }
}
