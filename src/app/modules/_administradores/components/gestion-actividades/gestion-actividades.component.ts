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
import { NgIcon } from '@ng-icons/core';
import { finalize } from 'rxjs';

import { provideTablaResponsiveIcons } from '../../../../core/icons/app-icons.registry';
import { obtenerColorTextoContraste } from '../../../../helpers/color-texto-contraste';
import { formatearDni } from '../../../../helpers/dni-formato';
import { formatearEdadDesdeFechaNacimiento } from '../../../../helpers/edad-formato';
import { formatearTelefono } from '../../../../helpers/telefono-formato';
import { formatearHoraTabla } from '../../../../helpers/tabla-hora-fin.helpers';
import { normalizarDiasSemana } from '../../../../helpers/dias-semana.helpers';
import {
  ActividadDto,
  ActividadHorarioDto,
  ActividadInscriptoDto,
  ActividadPaginateDto,
  GuardarActividadPayload,
  ProfesorActividadDto,
} from '../../../../core/api/interfaces/actividades.interfaces';
import {
  AsignarDescuentoPayload,
  DescuentoDto,
} from '../../../../core/api/interfaces/descuentos.interfaces';
import { SocioDto } from '../../../../core/api/interfaces/socios.interfaces';
import { ProfesorDto } from '../../../../core/api/interfaces/usuarios-internos.interfaces';
import { CategoriaDto } from '../../../../core/api/interfaces/categorias.interfaces';
import { ActividadesApiService } from '../../../../core/api/services/actividades-api.service';
import { ProfesoresApiService } from '../../../../core/api/services/profesores-api.service';
import { SociosApiService } from '../../../../core/api/services/socios-api.service';
import { CategoriasApiService } from '../../../../core/api/services/categorias-api.service';
import { DescuentosApiService } from '../../../../core/api/services/descuentos-api.service';
import { CardComponent } from '../../../ui/card/card.component';
import { BotonComponent } from '../../../ui/boton/boton.component';
import { ColorThemeService } from '../../../ui/color-mod/color-theme.service';
import { PaginacionComponent } from '../../../ui/paginacion/paginacion.component';
import { PopupComponent } from '../../../ui/popup/popup.component';
import { SelectComponent, SelectOption } from '../../../ui/select/select.component';
import { TituloHeroComponent } from '../../../ui/titulo-hero/titulo-hero.component';
import { ToastAlertService } from '../../../ui/toast-alert/services/toast-alert.service';
import { FormularioActividadComponent } from '../../forms/formulario-actividad/formulario-actividad.component';
import { SelectorHorariosActividadComponent } from '../../../_compartido-perfiles/components/selector-horarios-actividad/selector-horarios-actividad.component';
import { SelectorDescuentosComponent } from '../../forms/selector-descuentos/selector-descuentos.component';
import {
  AccionTabla,
  ColumnaTabla,
  EventoAccionTabla,
  TablaResponsiveComponent,
} from '../../../ui/tabla-responsive/tabla-responsive.component';
import { ETIQUETAS_SITUACION_CERTIFICADO } from '../../../../core/api/interfaces/certificados-medicos.interfaces';

interface FilaActividad {
  readonly actividadUuid: string;
  readonly nombre: string;
  readonly ubicacion: string;
  readonly dias: readonly string[];
  readonly horario: string;
  readonly cupoMaximo: number;
  readonly importeCuota: number;
  readonly completa: boolean;
  readonly categoria: string;
  readonly categoriaPrimera: string;
  readonly cantidadCategorias: number;
  readonly cantidadInscriptos: number;
  readonly cuposDisponibles?: readonly string[];
}

/** Inscripto del detalle con los horarios que eligió, listos para mostrar como chips. */
type InscriptoDetalleFila = ActividadInscriptoDto & {
  readonly horarios: readonly string[];
  /** Texto de la situación del certificado médico (o "No exige"). */
  readonly certificado: string;
};

/** Horarios del detalle agrupados por día, con su ocupación. */
interface DiaHorariosDetalle {
  readonly dia: string;
  readonly franjas: readonly {
    readonly uuid: string;
    readonly franja: string;
    readonly ocupacion: string;
    readonly lleno: boolean;
  }[];
}

interface FilaProfesorSeleccionable {
  readonly profesorUuid: string;
  readonly nombre: string;
  readonly apellido: string;
  readonly nombreCompleto: string;
  readonly dni: string;
}

interface FilaSocioInscribible {
  readonly memberUuid: string;
  readonly imageUrl: string | null;
  readonly nombre: string;
  readonly apellido: string;
  readonly nombreCompleto: string;
  readonly dni: string;
  readonly edad: string;
}

type ModoInscripcion = 'DESCUENTO' | null;

const TAMANIO_PAGINA_INSCRIPTOS = 50;
const TAMANIO_PAGINA_SOCIOS_INSCRIPCION = 100;

@Component({
  selector: 'app-gestion-actividades',
  imports: [
    BotonComponent,
    CardComponent,
    FormularioActividadComponent,
    SelectorDescuentosComponent,
    SelectorHorariosActividadComponent,
    NgIcon,
    PaginacionComponent,
    PopupComponent,
    SelectComponent,
    TablaResponsiveComponent,
    TituloHeroComponent,
  ],
  providers: [provideTablaResponsiveIcons()],
  templateUrl: './gestion-actividades.component.html',
  styleUrl: './gestion-actividades.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GestionActividadesComponent {
  private readonly actividadesApi = inject(ActividadesApiService);
  private readonly profesoresApi = inject(ProfesoresApiService);
  private readonly sociosApi = inject(SociosApiService);
  private readonly categoriasApi = inject(CategoriasApiService);
  private readonly descuentosApi = inject(DescuentosApiService);
  private readonly colorThemeService = inject(ColorThemeService);
  private readonly toast = inject(ToastAlertService);
  private readonly destroyRef = inject(DestroyRef);

  readonly puedeAdministrar = input(false);

  protected readonly actividades = signal<readonly ActividadPaginateDto[]>([]);
  protected readonly profesoresDisponibles = signal<readonly ProfesorDto[]>([]);
  protected readonly categoriasDisponibles = signal<readonly CategoriaDto[]>([]);
  protected readonly errorCatalogos = signal('');
  protected readonly filas = computed<readonly FilaActividad[]>(() =>
    this.actividades().map((actividad) => ({
      actividadUuid: actividad.actividadUuid,
      nombre: actividad.nombre,
      ubicacion: actividad.ubicacion,
      dias: actividad.horarios?.length
        ? this.formatearHorariosTabla(actividad.horarios)
        : this.formatearDiasTabla(actividad.diasSemana),
      horario: `De ${this.formatearHorario(actividad.horaInicio)} a ${this.formatearHorario(actividad.horaFin)}`,
      cupoMaximo: actividad.cupoMaximo,
      importeCuota: actividad.importeCuota,
      completa: actividad.completa,
      ...this.obtenerResumenCategoriasTabla(actividad),
      cantidadInscriptos: actividad.cantidadInscriptos,
      cuposDisponibles: [`${actividad.cantidadInscriptos}/${actividad.cupoMaximo}`],
    })),
  );
  protected readonly filasProfesores = computed<readonly FilaProfesorSeleccionable[]>(() =>
    this.profesoresDisponibles().map((profesor) => ({
      profesorUuid: profesor.profesorUuid,
      nombre: profesor.nombre,
      apellido: profesor.apellido,
      nombreCompleto: `${profesor.nombre} ${profesor.apellido}`.trim(),
      dni: profesor.dni ?? '—',
    })),
  );
  protected readonly paginaActual = signal(1);
  protected readonly totalPaginas = signal(1);
  protected readonly busqueda = signal('');
  protected readonly filtroCompleta = signal('');
  protected readonly cargando = signal(false);
  protected readonly colorTextoContadorCategorias = computed(() =>
    obtenerColorTextoContraste(this.colorThemeService.colorSecundario()),
  );
  protected readonly guardando = signal(false);
  protected readonly error = signal('');

  protected readonly formularioVisible = signal(false);
  protected readonly editandoUuid = signal<string | null>(null);
  protected readonly actividadFormulario = signal<ActividadDto | null>(null);
  protected readonly profesoresSeleccionados = signal<readonly string[]>([]);
  protected readonly paginaProfesores = signal(1);
  protected readonly totalPaginasProfesores = signal(1);
  protected readonly totalProfesores = signal(0);
  protected readonly busquedaProfesores = signal('');
  protected readonly cargandoProfesores = signal(false);
  protected readonly cargandoDetalleUuid = signal<string | null>(null);

  protected readonly actividadInscripcionUuid = signal<string | null>(null);
  protected readonly sociosInscripcion = signal<readonly SocioDto[]>([]);
  protected readonly paginaSociosInscripcion = signal(1);
  protected readonly totalPaginasSociosInscripcion = signal(1);
  protected readonly totalSociosInscripcion = signal(0);
  protected readonly busquedaSociosInscripcion = signal('');
  protected readonly cargandoSociosInscripcion = signal(false);
  protected readonly inscribiendoMemberUuid = signal<string | null>(null);
  protected readonly socioInscripcionSeleccionado = signal<FilaSocioInscribible | null>(null);
  /** Horarios elegidos para la inscripción en curso; se exige al menos uno. */
  protected readonly horariosInscripcionSeleccionados = signal<readonly string[]>([]);
  protected readonly horariosActividadInscripcion = computed(
    () =>
      this.actividades().find((actividad) => actividad.actividadUuid === this.actividadInscripcionUuid())
        ?.horarios ?? [],
  );
  protected readonly catalogoDescuentos = signal<readonly DescuentoDto[]>([]);
  protected readonly cargandoCatalogoDescuentos = signal(false);
  protected readonly descuentosInscripcionSeleccionados = signal<
    readonly AsignarDescuentoPayload[]
  >([]);
  /** Se muestra recién cuando el operador elige la modalidad con descuento. */
  protected readonly modoInscripcion = signal<ModoInscripcion>(null);
  protected readonly formularioAsignacionVisible = signal(true);
  protected readonly catalogoDescuentosDisponibles = computed(() => {
    const seleccionados = new Set(
      this.descuentosInscripcionSeleccionados().map((descuento) => descuento.descuentoUuid),
    );
    return this.catalogoDescuentos().filter(
      (descuento) => !seleccionados.has(descuento.descuentoUuid),
    );
  });
  protected readonly filasSociosInscripcion = computed<readonly FilaSocioInscribible[]>(() =>
    this.sociosInscripcion().map((socio) => ({
      memberUuid: socio.memberUuid,
      imageUrl: socio.imageUrl ?? null,
      nombre: socio.nombre,
      apellido: socio.apellido,
      nombreCompleto: `${socio.nombre} ${socio.apellido}`.trim(),
      dni: socio.dni ? formatearDni(socio.dni) : '—',
      edad: formatearEdadDesdeFechaNacimiento(socio.fechaNacimiento),
    })),
  );
  protected readonly actividadDetalleUuid = signal<string | null>(null);
  protected readonly actividadDetalle = signal<ActividadDto | null>(null);
  protected readonly profesorDetalle = signal<ProfesorActividadDto | null>(null);
  protected readonly tituloProfesorDetalle = computed(() => {
    const profesor = this.profesorDetalle();
    return profesor ? `Profesor ${profesor.nombre} ${profesor.apellido}` : 'Detalle del profesor';
  });
  protected readonly inscriptos = signal<readonly ActividadInscriptoDto[]>([]);
  protected readonly paginaInscriptosDetalle = signal(1);
  protected readonly totalPaginasInscriptosDetalle = computed(() =>
    Math.max(1, Math.ceil(this.inscriptos().length / TAMANIO_PAGINA_INSCRIPTOS)),
  );
  protected readonly inscriptosPagina = computed((): readonly InscriptoDetalleFila[] => {
    const inicio = (this.paginaInscriptosDetalle() - 1) * TAMANIO_PAGINA_INSCRIPTOS;
    const horarios = this.actividadDetalle()?.horarios ?? [];
    const exigeCertificado = !!this.actividadDetalle()?.requiereCertificado;
    return this.inscriptos()
      .slice(inicio, inicio + TAMANIO_PAGINA_INSCRIPTOS)
      .map((inscripto) => ({
        ...inscripto,
        horarios: horarios
          .filter((horario) => inscripto.horarioUuids?.includes(horario.uuid))
          .map((horario) => this.etiquetaHorario(horario)),
        certificado: exigeCertificado
          ? ETIQUETAS_SITUACION_CERTIFICADO[inscripto.certificadoSituacion ?? 'SIN_CERTIFICADO']
          : 'No exige',
      }));
  });
  /** Todas las franjas de la actividad agrupadas por día, en el orden de la semana. */
  protected readonly horariosDetalle = computed((): readonly DiaHorariosDetalle[] => {
    const horarios = this.actividadDetalle()?.horarios ?? [];
    const orden = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];
    return orden
      .map((dia) => ({
        dia: normalizarDiasSemana(dia)[0] ?? dia,
        franjas: horarios
          .filter((horario) => horario.diaSemana === dia)
          .sort((a, b) => this.formatearHorario(a.horaInicio).localeCompare(this.formatearHorario(b.horaInicio)))
          .map((horario) => ({
            uuid: horario.uuid,
            franja: `${this.formatearHorario(horario.horaInicio)} a ${this.formatearHorario(horario.horaFin)}`,
            ocupacion: `${horario.inscriptos} de ${horario.cupoMaximo} ${horario.cupoMaximo === 1 ? 'lugar' : 'lugares'}`,
            lleno: horario.disponibles <= 0,
          })),
      }))
      .filter((grupo) => grupo.franjas.length > 0);
  });
  protected readonly diasDetalle = computed(() =>
    normalizarDiasSemana(this.actividadDetalle()?.diasSemana),
  );
  protected readonly todosLosDias = computed(() => this.diasDetalle()[0] === 'Todos los días');
  protected readonly bajandoInscriptoDni = signal<string | null>(null);
  protected readonly registrandoConsentimientoMemberUuid = signal<string | null>(null);
  protected readonly opcionesCompleta: readonly SelectOption[] = [
    { value: '', label: 'Todas' },
    { value: 'false', label: 'Con cupo' },
    { value: 'true', label: 'Completas' },
  ];
  protected readonly columnas: readonly ColumnaTabla<FilaActividad>[] = [
    { id: 'nombre', titulo: 'Actividad', ancho: 'minmax(9rem, 1fr)' },
    { id: 'ubicacion', titulo: 'Ubicación', ancho: 'minmax(8rem, 1fr)' },
    { id: 'dias', titulo: 'Horarios', tipo: 'chips', ancho: 'minmax(12rem, 1.4fr)' },
    { id: 'horario', titulo: 'Horario', tipo: 'horario', ancho: '11rem' },
    { id: 'cuposDisponibles', titulo: 'Cupos', tipo: 'chips', ancho: '7rem' },
    { id: 'importeCuota', titulo: 'Cuota', tipo: 'moneda', ancho: '8rem' },
    { id: 'categoria', titulo: 'Categoría', ancho: 'minmax(8rem, 1fr)' },
  ];
  protected readonly columnasProfesores: readonly ColumnaTabla<FilaProfesorSeleccionable>[] = [
    { id: 'nombreCompleto', titulo: 'Nombre y apellido', ancho: 'minmax(12rem, 1fr)' },
    { id: 'dni', titulo: 'DNI', ancho: '8rem' },
  ];
  protected readonly columnasSociosInscripcion: readonly ColumnaTabla<FilaSocioInscribible>[] = [
    {
      id: 'imageUrl',
      titulo: 'Foto',
      tipo: 'avatar',
      ancho: '5rem',
      avatarMostrarNombre: false,
    },
    { id: 'nombreCompleto', titulo: 'Nombre y apellido', ancho: 'minmax(10rem, 1fr)' },
    { id: 'dni', titulo: 'DNI', ancho: '7rem' },
    { id: 'edad', titulo: 'Edad', ancho: '10rem' },
  ];
  protected readonly accionesSociosInscripcion: readonly AccionTabla<FilaSocioInscribible>[] = [
    {
      predefinida: 'inscribir',
      cargando: (socio) => this.inscribiendoMemberUuid() === socio.memberUuid,
    },
  ];
  protected readonly columnasInscriptosDetalle: readonly ColumnaTabla<InscriptoDetalleFila>[] = [
    {
      id: 'imageUrl',
      titulo: 'Socio',
      tipo: 'avatar',
      ancho: 'minmax(11rem, 1.2fr)',
    },
    { id: 'horarios', titulo: 'Horarios', tipo: 'chips', ancho: 'minmax(11rem, 1.2fr)' },
    { id: 'email', titulo: 'Email', ancho: 'minmax(13rem, 1.5fr)' },
    { id: 'dni', titulo: 'DNI', ancho: '9rem' },
    { id: 'certificado', titulo: 'Certificado médico', ancho: '10rem' },
  ];
  protected readonly accionesInscriptosDetalle: readonly AccionTabla<InscriptoDetalleFila>[] = [
    {
      id: 'registrar-consentimiento',
      texto: 'Registrar consentimiento',
      icono: 'heroDocumentText',
      color: 'var(--app-accent)',
      visible: (inscripto) => this.requiereConsentimiento(inscripto),
      cargando: (inscripto) =>
        this.registrandoConsentimientoMemberUuid() === inscripto.memberUuid,
    },
    {
      id: 'dar-baja-inscripto',
      texto: 'Dar de baja',
      icono: 'heroUserMinus',
      color: 'var(--semantic-danger)',
      cargando: (inscripto) => this.bajandoInscriptoDni() === inscripto.dni,
    },
  ];
  protected readonly acciones: readonly AccionTabla<FilaActividad>[] = [
    {
      predefinida: 'ver',
      cargando: (fila) => this.cargandoDetalleUuid() === fila.actividadUuid,
    },
    {
      predefinida: 'editar',
      visible: () => this.puedeAdministrar(),
      cargando: (fila) => this.cargandoDetalleUuid() === fila.actividadUuid,
    },
    {
      predefinida: 'inscribir',
      deshabilitada: (fila) => fila.completa,
    },
    {
      id: 'desactivar-actividad',
      texto: 'Desactivar actividad',
      icono: 'heroTrash',
      color: 'var(--semantic-danger)',
      visible: () => this.puedeAdministrar(),
    },
  ];

  constructor() {
    queueMicrotask(() => this.cargarInicial());
  }

  protected actualizarBusqueda(evento: Event): void {
    this.busqueda.set((evento.target as HTMLInputElement).value);
  }

  protected cambiarFiltroCompleta(valor: string): void {
    this.filtroCompleta.set(valor);
    this.paginaActual.set(1);
    this.cargarActividades();
  }

  protected buscar(): void {
    this.paginaActual.set(1);
    this.cargarActividades();
  }

  protected cambiarPagina(pagina: number): void {
    this.paginaActual.set(pagina);
    this.cargarActividades();
  }

  protected abrirAlta(): void {
    this.cancelarInscripcion();
    this.limpiarFormulario();
    this.actividadFormulario.set(null);
    this.profesoresSeleccionados.set([]);
    this.paginaProfesores.set(1);
    this.busquedaProfesores.set('');
    this.error.set('');
    this.formularioVisible.set(true);
    this.cargarProfesores();
  }

  protected editar(fila: FilaActividad): void {
    this.cancelarInscripcion();
    this.error.set('');
    this.cargandoDetalleUuid.set(fila.actividadUuid);
    this.actividadesApi
      .obtenerDetalle(fila.actividadUuid)
      .pipe(finalize(() => this.cargandoDetalleUuid.set(null)))
      .subscribe({
        next: (actividad) => {
          this.editandoUuid.set(actividad.actividadUuid);
          this.actividadFormulario.set(actividad);
          this.profesoresSeleccionados.set(
            actividad.profesores.map((profesor) => profesor.profesorUuid),
          );
          this.paginaProfesores.set(1);
          this.busquedaProfesores.set('');
          this.formularioVisible.set(true);
          this.cargarProfesores();
        },
        error: () => this.error.set('No se pudo cargar el detalle de la actividad.'),
      });
  }

  protected cancelarFormulario(): void {
    this.limpiarFormulario();
    this.formularioVisible.set(false);
    this.error.set('');
  }

  protected async guardar(payload: GuardarActividadPayload): Promise<void> {
    if (this.guardando()) return;
    const uuid = this.editandoUuid();
    const importeAnterior = this.actividadFormulario()?.importeCuota;
    const cambioImporte =
      !!uuid && importeAnterior !== undefined && importeAnterior !== payload.importeCuota;
    // El importe nuevo siempre rige para las próximas cuotas; el admin decide si además toca las pendientes.
    const aplicarAPendientes = cambioImporte
      ? await this.toast.confirm(
          'Cambiaste el importe de la cuota. ¿Querés actualizar también las cuotas pendientes ya generadas, o que el nuevo importe rija solo desde la próxima cuota? Las cuotas con descuento o recargo no se modifican.',
          {
            titulo: 'Nuevo importe de cuota',
            textoConfirmar: 'Actualizar pendientes',
            textoCancelar: 'Solo próximas cuotas',
          },
        )
      : false;

    if (this.guardando()) return;
    this.guardando.set(true);
    this.error.set('');
    const payloadCompleto: GuardarActividadPayload = {
      ...payload,
      profesorUuids: this.profesoresSeleccionados(),
      ...(cambioImporte ? { aplicarImporteACuotasPendientes: aplicarAPendientes } : {}),
    };
    const request = uuid
      ? this.actividadesApi.actualizar(uuid, payloadCompleto)
      : this.actividadesApi.crear(payloadCompleto);
    request.pipe(finalize(() => this.guardando.set(false))).subscribe({
      next: () => {
        this.cancelarFormulario();
        this.cargarActividades();
      },
      error: () => {
        this.error.set('No se pudo guardar la actividad. El formulario conserva todos los datos.');
      },
    });
  }

  protected prepararInscripcion(fila: FilaActividad): void {
    this.cancelarFormulario();
    this.error.set('');
    this.actividadInscripcionUuid.set(fila.actividadUuid);
    this.sociosInscripcion.set([]);
    this.paginaSociosInscripcion.set(1);
    this.totalPaginasSociosInscripcion.set(1);
    this.totalSociosInscripcion.set(0);
    this.busquedaSociosInscripcion.set('');
    this.socioInscripcionSeleccionado.set(null);
    this.catalogoDescuentos.set([]);
    this.descuentosInscripcionSeleccionados.set([]);
    this.modoInscripcion.set(null);
    this.formularioAsignacionVisible.set(true);
    this.cargarSociosInscripcion();
    this.cargarCatalogoDescuentos();
  }

  protected manejarAccion(evento: EventoAccionTabla<FilaActividad>): void {
    switch (evento.accion) {
      case 'editar':
        this.editar(evento.fila);
        break;
      case 'ver':
        this.verInscriptos(evento.fila);
        break;
      case 'inscribir':
        this.prepararInscripcion(evento.fila);
        break;
      case 'desactivar-actividad':
        void this.desactivarActividad(evento.fila);
        break;
    }
  }

  protected cancelarInscripcion(): void {
    this.actividadInscripcionUuid.set(null);
    this.sociosInscripcion.set([]);
    this.paginaSociosInscripcion.set(1);
    this.totalPaginasSociosInscripcion.set(1);
    this.totalSociosInscripcion.set(0);
    this.busquedaSociosInscripcion.set('');
    this.inscribiendoMemberUuid.set(null);
    this.socioInscripcionSeleccionado.set(null);
    this.catalogoDescuentos.set([]);
    this.cargandoCatalogoDescuentos.set(false);
    this.descuentosInscripcionSeleccionados.set([]);
    this.horariosInscripcionSeleccionados.set([]);
    this.modoInscripcion.set(null);
    this.formularioAsignacionVisible.set(true);
    this.error.set('');
  }

  protected actualizarBusquedaSociosInscripcion(evento: Event): void {
    this.busquedaSociosInscripcion.set((evento.target as HTMLInputElement).value);
    this.paginaSociosInscripcion.set(1);
    this.cargarSociosInscripcion();
  }

  protected cambiarPaginaSociosInscripcion(pagina: number): void {
    this.paginaSociosInscripcion.set(pagina);
    this.cargarSociosInscripcion();
  }

  protected manejarAccionSocioInscripcion(
    evento: EventoAccionTabla<FilaSocioInscribible>,
  ): void {
    if (evento.accion === 'inscribir') {
      this.socioInscripcionSeleccionado.set(evento.fila);
      this.descuentosInscripcionSeleccionados.set([]);
      // Con un único horario no hay nada que elegir: queda marcado.
      const horarios = this.horariosActividadInscripcion();
      this.horariosInscripcionSeleccionados.set(horarios.length === 1 ? [horarios[0].uuid] : []);
      this.modoInscripcion.set(null);
      this.formularioAsignacionVisible.set(true);
    }
  }

  protected volverASeleccionSocio(): void {
    if (this.inscribiendoMemberUuid()) return;
    this.socioInscripcionSeleccionado.set(null);
    this.descuentosInscripcionSeleccionados.set([]);
    this.modoInscripcion.set(null);
  }

  protected inscribirSinDescuento(): void {
    const socio = this.socioInscripcionSeleccionado();
    if (socio) this.confirmarInscripcion(socio.memberUuid);
  }

  protected abrirInscripcionConDescuento(): void {
    this.modoInscripcion.set('DESCUENTO');
  }

  protected volverAModalidadesInscripcion(): void {
    if (this.inscribiendoMemberUuid()) return;
    this.modoInscripcion.set(null);
    this.descuentosInscripcionSeleccionados.set([]);
  }

  protected agregarDescuentoInscripcion(descuento: AsignarDescuentoPayload): void {
    if (
      this.descuentosInscripcionSeleccionados().some(
        (seleccionado) => seleccionado.descuentoUuid === descuento.descuentoUuid,
      )
    ) {
      return;
    }
    this.descuentosInscripcionSeleccionados.update((seleccionados) => [
      ...seleccionados,
      descuento,
    ]);
  }

  protected quitarDescuentoInscripcion(descuentoUuid: string): void {
    this.descuentosInscripcionSeleccionados.update((seleccionados) =>
      seleccionados.filter((descuento) => descuento.descuentoUuid !== descuentoUuid),
    );
  }

  protected confirmarInscripcionConDescuentos(): void {
    const socio = this.socioInscripcionSeleccionado();
    if (socio) {
      this.confirmarInscripcion(socio.memberUuid, this.descuentosInscripcionSeleccionados());
    }
  }

  protected cambiarPaginaProfesores(pagina: number): void {
    this.paginaProfesores.set(pagina);
    this.cargarProfesores();
  }

  protected actualizarBusquedaProfesores(evento: Event): void {
    this.busquedaProfesores.set((evento.target as HTMLInputElement).value);
    this.paginaProfesores.set(1);
    this.cargarProfesores();
  }

  protected alternarProfesor(profesorUuid: string, seleccionado: boolean): void {
    this.profesoresSeleccionados.update((profesores) =>
      seleccionado
        ? [...new Set([...profesores, profesorUuid])]
        : profesores.filter((uuid) => uuid !== profesorUuid),
    );
  }

  protected verInscriptos(fila: FilaActividad): void {
    this.cancelarFormulario();
    this.cancelarInscripcion();
    this.actividadDetalleUuid.set(null);
    this.actividadDetalle.set(null);
    this.profesorDetalle.set(null);
    this.inscriptos.set([]);
    this.paginaInscriptosDetalle.set(1);
    this.error.set('');
    this.cargandoDetalleUuid.set(fila.actividadUuid);
    this.actividadesApi
      .obtenerDetalle(fila.actividadUuid)
      .pipe(finalize(() => this.cargandoDetalleUuid.set(null)))
      .subscribe({
        next: (actividad) => {
          this.actividadDetalle.set(actividad);
          this.actividadDetalleUuid.set(actividad.actividadUuid);
          this.inscriptos.set(actividad.inscriptos);
        },
        error: () => this.error.set('No se pudo cargar el detalle de la actividad.'),
      });
  }

  protected cerrarDetalle(): void {
    this.actividadDetalleUuid.set(null);
    this.actividadDetalle.set(null);
    this.profesorDetalle.set(null);
    this.inscriptos.set([]);
    this.paginaInscriptosDetalle.set(1);
    this.error.set('');
  }

  protected abrirDetalleProfesor(profesor: ProfesorActividadDto): void {
    this.profesorDetalle.set(profesor);
  }

  protected cerrarDetalleProfesor(): void {
    this.profesorDetalle.set(null);
  }

  protected cambiarPaginaInscriptosDetalle(pagina: number): void {
    this.paginaInscriptosDetalle.set(pagina);
  }

  protected manejarAccionInscripto(evento: EventoAccionTabla<InscriptoDetalleFila>): void {
    if (evento.accion === 'registrar-consentimiento') {
      void this.registrarConsentimiento(evento.fila);
      return;
    }

    if (evento.accion === 'dar-baja-inscripto') {
      void this.darDeBajaInscripto(evento.fila);
    }
  }

  private async registrarConsentimiento(inscripto: ActividadInscriptoDto): Promise<void> {
    const actividadUuid = this.actividadDetalleUuid();
    const memberUuid = inscripto.memberUuid?.trim();
    const responsableMemberUuid = inscripto.titularMemberUuid;
    if (
      !actividadUuid ||
      !memberUuid ||
      !responsableMemberUuid ||
      !this.requiereConsentimiento(inscripto) ||
      this.registrandoConsentimientoMemberUuid()
    ) {
      return;
    }

    const confirmado = await this.toast.confirm(
      `Confirmá que el titular autorizó la participación de ${inscripto.nombre} ${inscripto.apellido}.`,
      { titulo: 'Registrar consentimiento', textoConfirmar: 'Registrar' },
    );
    if (!confirmado) return;

    this.registrandoConsentimientoMemberUuid.set(memberUuid);
    this.actividadesApi
      .registrarConsentimiento(actividadUuid, {
        memberUuid,
        responsableMemberUuid,
        aceptado: true,
      })
      .pipe(finalize(() => this.registrandoConsentimientoMemberUuid.set(null)))
      .subscribe({
        error: () => this.error.set('No se pudo registrar el consentimiento del menor.'),
      });
  }

  private async darDeBajaInscripto(inscripto: ActividadInscriptoDto): Promise<void> {
    const actividadUuid = this.actividadDetalleUuid();
    if (!actividadUuid || this.bajandoInscriptoDni()) return;

    const confirmado = await this.toast.confirmDanger(
      `Se dará de baja la inscripción de ${inscripto.nombre} ${inscripto.apellido}. Esta acción no se puede revertir.`,
      { titulo: 'Baja de inscripción', textoConfirmar: 'Dar de baja' },
    );
    if (!confirmado) return;

    this.bajandoInscriptoDni.set(inscripto.dni);
    this.sociosApi.paginar({ page: 1, size: 50, search: inscripto.dni, estados: [] }).subscribe({
      next: (respuesta) => {
        const socio = respuesta.content.find((item) => item.dni === inscripto.dni);
        if (!socio) {
          this.bajandoInscriptoDni.set(null);
          this.error.set('No se pudo identificar al socio para dar de baja la inscripción.');
          return;
        }

        this.actividadesApi
          .darDeBajaInscripcion(actividadUuid, { memberUuid: socio.memberUuid })
          .pipe(finalize(() => this.bajandoInscriptoDni.set(null)))
          .subscribe({
            next: () => this.recargarDetalleActividad(actividadUuid),
            error: () => this.error.set('No se pudo dar de baja la inscripción.'),
          });
      },
      error: () => {
        this.bajandoInscriptoDni.set(null);
        this.error.set('No se pudo identificar al socio para dar de baja la inscripción.');
      },
    });
  }

  protected formatearHorario(valor: unknown): string {
    return formatearHoraTabla(valor);
  }

  protected formatearRangoEdad(
    edadMinima: number | null | undefined,
    edadMaxima: number | null | undefined,
  ): string {
    if (
      edadMinima === null ||
      edadMinima === undefined ||
      edadMaxima === null ||
      edadMaxima === undefined
    ) {
      return 'Sin rango de edad';
    }

    return `De ${edadMinima} años a ${edadMaxima} años`;
  }

  private obtenerResumenCategoriasTabla(
    actividad: ActividadPaginateDto,
  ): Pick<FilaActividad, 'categoria' | 'categoriaPrimera' | 'cantidadCategorias'> {
    const nombresDelPaginado = actividad.categoriaNombres
      ?.map((nombre) => nombre.trim())
      .filter(Boolean) ?? [];
    const categorias = actividad.categorias?.length
      ? actividad.categorias
      : actividad.categoria ?? [];
    const nombresDeCategorias = categorias
      .map((categoria) =>
        typeof categoria === 'string' ? categoria.trim() : categoria.nombre.trim(),
      )
      .filter(Boolean);
    const nombresPorUuid = actividad.categoriaUuids?.map((uuid) =>
      this.categoriasDisponibles().find((categoria) => categoria.categoriaUuid === uuid)?.nombre
        ?? 'Categoría no disponible',
    ) ?? [];
    const nombresResueltos = nombresDelPaginado.length
      ? nombresDelPaginado
      : nombresDeCategorias.length
        ? nombresDeCategorias
      : nombresPorUuid.length
        ? nombresPorUuid
        : actividad.categoriaNombre?.trim()
          ? [actividad.categoriaNombre.trim()]
          : [];
    const categoriaPrimera = nombresResueltos[0] ?? '—';

    return {
      categoria: nombresResueltos.length ? nombresResueltos.join(', ') : '—',
      categoriaPrimera,
      cantidadCategorias: nombresResueltos.length,
    };
  }

  protected categoriasDeActividad(actividad: ActividadDto): readonly CategoriaDto[] {
    if (actividad.categorias) return actividad.categorias;
    if (actividad.categoriaUuids) {
      const catalogo = new Map(
        this.categoriasDisponibles().map((categoria) => [categoria.categoriaUuid, categoria] as const),
      );
      return actividad.categoriaUuids.map((categoriaUuid) =>
        catalogo.get(categoriaUuid) ?? { categoriaUuid, nombre: 'Categoría no disponible' },
      );
    }
    return actividad.categoria ? [actividad.categoria] : [];
  }

  protected formatearDniProfesor(valor: string | null | undefined): string {
    return valor ? formatearDni(valor) : '—';
  }

  protected formatearTelefonoProfesor(valor: string | null | undefined): string {
    return valor ? formatearTelefono(valor) : '—';
  }

  protected inicialesProfesor(profesor: ProfesorActividadDto): string {
    return `${profesor.nombre.charAt(0)}${profesor.apellido.charAt(0)}`.toUpperCase() || 'PR';
  }

  protected requiereConsentimiento(inscripto: ActividadInscriptoDto): boolean {
    return Boolean(
      inscripto.memberUuid &&
        inscripto.titularMemberUuid &&
        this.esMenorDe14(inscripto.fechaNacimiento),
    );
  }

  private esMenorDe14(fechaNacimiento: string | null | undefined): boolean {
    const fecha = this.parsearFecha(fechaNacimiento);
    if (!fecha) return false;

    const hoy = new Date();
    let edad = hoy.getFullYear() - fecha.getFullYear();
    const cumpleEsteAnio = new Date(hoy.getFullYear(), fecha.getMonth(), fecha.getDate());
    if (hoy < cumpleEsteAnio) edad -= 1;

    return edad < 14;
  }

  private parsearFecha(valor: string | null | undefined): Date | null {
    if (!valor) return null;

    const [fecha] = valor.trim().split(/[T ]/);
    const partes = fecha.includes('/') ? fecha.split('/') : fecha.split('-');
    if (partes.length !== 3) return null;

    const [primera, segunda, tercera] = partes.map(Number);
    const anio = fecha.includes('/') ? tercera : primera;
    const mes = segunda;
    const dia = fecha.includes('/') ? primera : tercera;
    const resultado = new Date(anio, mes - 1, dia);

    return resultado.getFullYear() === anio && resultado.getMonth() === mes - 1 && resultado.getDate() === dia
      ? resultado
      : null;
  }

  protected valorOGuion(valor: string | number | null | undefined): string | number {
    return valor === null || valor === undefined || valor === '' ? '—' : valor;
  }

  /** Etiqueta corta de un horario, ej. "Lun 12:00–13:30". */
  private etiquetaHorario(horario: ActividadHorarioDto): string {
    const dia = normalizarDiasSemana(horario.diaSemana)[0]?.slice(0, 3) ?? horario.diaSemana;
    return `${dia} ${this.formatearHorario(horario.horaInicio)}–${this.formatearHorario(horario.horaFin)}`;
  }

  /** Un chip por horario con sus lugares libres, ej. "Lun 12:00–13:30 · 2 libres". */
  private formatearHorariosTabla(horarios: readonly ActividadHorarioDto[]): readonly string[] {
    return horarios.map((horario) => {
      const dia = normalizarDiasSemana(horario.diaSemana)[0]?.slice(0, 3) ?? horario.diaSemana;
      const libres =
        horario.disponibles <= 0
          ? 'lleno'
          : `${horario.disponibles} ${horario.disponibles === 1 ? 'libre' : 'libres'}`;
      return `${dia} ${this.formatearHorario(horario.horaInicio)}–${this.formatearHorario(horario.horaFin)} · ${libres}`;
    });
  }

  private formatearDiasTabla(diasSemana: string): readonly string[] {
    return normalizarDiasSemana(diasSemana).map((dia) =>
      dia === 'Todos los días' ? dia : dia.slice(0, 3),
    );
  }

  private recargarDetalleActividad(actividadUuid: string): void {
    this.actividadesApi.obtenerDetalle(actividadUuid).subscribe({
      next: (actividad) => {
        this.actividadDetalle.set(actividad);
        this.inscriptos.set(actividad.inscriptos);
      },
      error: () => this.error.set('La baja fue registrada, pero no se pudo actualizar el detalle.'),
    });
  }

  private async desactivarActividad(fila: FilaActividad): Promise<void> {
    const confirmado = await this.toast.confirmDanger(
      'La actividad se dará de baja. El backend definirá el tratamiento de inscripciones activas.',
      { titulo: 'Desactivar actividad', textoConfirmar: 'Desactivar' },
    );
    if (!confirmado) return;
    this.actividadesApi.eliminar(fila.actividadUuid).subscribe({
      next: () => this.cargarActividades(),
    });
  }

  protected confirmarInscripcion(
    memberUuid: string,
    descuentos: readonly AsignarDescuentoPayload[] = [],
  ): void {
    const actividadUuid = this.actividadInscripcionUuid();
    if (!actividadUuid || !memberUuid || this.inscribiendoMemberUuid()) {
      this.error.set('Seleccioná una actividad y un socio.');
      return;
    }
    const horarioUuids = this.horariosInscripcionSeleccionados();
    if (!horarioUuids.length) {
      this.error.set('Elegí al menos un horario.');
      return;
    }
    this.inscribiendoMemberUuid.set(memberUuid);
    this.error.set('');
    const payload =
      descuentos.length > 0 ? { memberUuid, descuentos, horarioUuids } : { memberUuid, horarioUuids };
    this.actividadesApi
      .inscribir(actividadUuid, payload)
      .pipe(finalize(() => this.inscribiendoMemberUuid.set(null)))
      .subscribe({
        next: (respuesta) => {
          this.cancelarInscripcion();
          this.cargarActividades();
          // Sin cuota nueva (día de corte, pase que la cubre, ya tenía la del período): se explica el motivo.
          if (!respuesta.cuotaGenerada && respuesta.cuotaAdvertencia) {
            // Reemplaza el "Operación realizada correctamente": este aviso dice más y no debe perderse.
            this.toast.info(respuesta.cuotaAdvertencia, { titulo: 'Inscripción registrada' });
          }
        },
        error: () => undefined,
      });
  }

  private cargarCatalogoDescuentos(
    pagina = 1,
    acumulados: readonly DescuentoDto[] = [],
  ): void {
    if (pagina === 1) this.cargandoCatalogoDescuentos.set(true);
    this.descuentosApi
      .paginarCatalogo({ page: pagina, size: 100, search: '' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (respuesta) => {
          const catalogo = [...acumulados, ...respuesta.content];
          if (pagina < respuesta.totalPages) {
            this.cargarCatalogoDescuentos(pagina + 1, catalogo);
            return;
          }
          this.catalogoDescuentos.set(catalogo);
          this.cargandoCatalogoDescuentos.set(false);
        },
        error: () => {
          this.cargandoCatalogoDescuentos.set(false);
          this.error.set(
            'No se pudieron cargar los descuentos. Podés continuar con la inscripción sin descuento.',
          );
        },
      });
  }

  private cargarInicial(): void {
    this.cargarActividades();
    this.categoriasApi.listar().subscribe({
      next: (categorias) => this.categoriasDisponibles.set(categorias),
      error: () => this.errorCatalogos.set('No se pudieron cargar las categorías.'),
    });
  }

  private cargarActividades(): void {
    this.cargando.set(true);
    this.error.set('');
    this.actividadesApi
      .paginar({
        page: this.paginaActual(),
        size: 10,
        search: this.busqueda().trim(),
        completa: this.filtroCompleta() === '' ? null : this.filtroCompleta() === 'true',
      })
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (respuesta) => {
          this.actividades.set(respuesta.content);
          this.totalPaginas.set(Math.max(1, respuesta.totalPages));
        },
        error: () => this.error.set('No se pudieron cargar las actividades.'),
      });
  }

  private cargarProfesores(): void {
    this.cargandoProfesores.set(true);
    this.profesoresApi
      .paginar({
        page: this.paginaProfesores(),
        size: 50,
        search: this.busquedaProfesores().trim(),
        estados: ['ACTIVO'],
      })
      .pipe(finalize(() => this.cargandoProfesores.set(false)))
      .subscribe({
        next: (respuesta) => {
          this.profesoresDisponibles.set(respuesta.content);
          this.totalPaginasProfesores.set(Math.max(1, respuesta.totalPages));
          this.totalProfesores.set(respuesta.totalElements);
        },
        error: () => this.errorCatalogos.set('No se pudieron cargar los profesores.'),
      });
  }

  private cargarSociosInscripcion(): void {
    if (!this.actividadInscripcionUuid()) return;

    this.cargandoSociosInscripcion.set(true);
    this.sociosApi
      .paginar({
        page: this.paginaSociosInscripcion(),
        size: TAMANIO_PAGINA_SOCIOS_INSCRIPCION,
        search: this.busquedaSociosInscripcion().trim(),
        estados: ['ACTIVO'],
      })
      .pipe(finalize(() => this.cargandoSociosInscripcion.set(false)))
      .subscribe({
        next: (respuesta) => {
          this.sociosInscripcion.set(respuesta.content);
          this.totalPaginasSociosInscripcion.set(Math.max(1, respuesta.totalPages));
          this.totalSociosInscripcion.set(respuesta.totalElements);
        },
        error: () => this.error.set('No se pudieron cargar los socios para inscribir.'),
      });
  }

  private limpiarFormulario(): void {
    this.editandoUuid.set(null);
    this.actividadFormulario.set(null);
    this.profesoresDisponibles.set([]);
    this.profesoresSeleccionados.set([]);
    this.paginaProfesores.set(1);
    this.totalPaginasProfesores.set(1);
    this.totalProfesores.set(0);
    this.busquedaProfesores.set('');
  }
}
