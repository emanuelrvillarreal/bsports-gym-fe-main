import { ActivatedRoute } from '@angular/router';
import { FichaSocioComponent } from '../ficha-socio/ficha-socio.component';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  PLATFORM_ID,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroArrowDownTray, heroDocumentText, heroTicket } from '@ng-icons/heroicons/outline';
import { MembresiasSocioComponent } from '../membresias-socio/membresias-socio.component';
import { Subscription, finalize } from 'rxjs';

import { obtenerColorTextoContrasteGradiente } from '../../../../helpers/color-texto-contraste';
import { formatearEdadDesdeFechaNacimiento } from '../../../../helpers/edad-formato';
import { formatearSexo } from '../../../../helpers/sexo-formato';
import {
  EstadoSocio,
  EventoSeguimientoImportacionSociosDto,
  ProgresoImportacionSociosDto,
  ResultadoImportacionSociosDetalleDto,
  ResultadoFilaImportacionSociosDto,
  SocioDto,
} from '../../../../core/api/interfaces/socios.interfaces';
import { CertificadoMedicoDto } from '../../../../core/api/interfaces/certificados-medicos.interfaces';
import { DescuentoDto } from '../../../../core/api/interfaces/descuentos.interfaces';
import { AuthSessionService } from '../../../../core/global-services/services/auth-session.service';
import { DescuentosApiService } from '../../../../core/api/services/descuentos-api.service';
import { SociosApiService } from '../../../../core/api/services/socios-api.service';
import { extraerMensajeErrorApi } from '../../../../core/api/error-api';
import { GrupoFamiliarSocioComponent } from '../grupo-familiar-socio/grupo-familiar-socio.component';
import { CardComponent } from '../../../ui/card/card.component';
import { PaginacionComponent } from '../../../ui/paginacion/paginacion.component';
import {
  AccionCabeceraTabla,
  AccionTabla,
  ColumnaTabla,
  EventoAccionTabla,
  EventoFiltroCabeceraTabla,
  FiltroCabeceraTabla,
  TablaResponsiveComponent,
} from '../../../ui/tabla-responsive/tabla-responsive.component';
import { BotonComponent } from '../../../ui/boton/boton.component';
import { PopupComponent } from '../../../ui/popup/popup.component';
import { SelectComponent, SelectOption } from '../../../ui/select/select.component';
import { TituloHeroComponent } from '../../../ui/titulo-hero/titulo-hero.component';
import { ToastAlertService } from '../../../ui/toast-alert/services/toast-alert.service';
import { ColorThemeService } from '../../../ui/color-mod/color-theme.service';
import {
  FiltroSociosPayload,
  FormularioFiltroSociosComponent,
} from '../../forms/formulario-filtro-socios/formulario-filtro-socios.component';
import {
  FormularioGestionSocioComponent,
  GestionSocioPayload,
  ModoFormularioSocio,
} from '../../forms/formulario-gestion-socio/formulario-gestion-socio.component';

type EstadoImportacion =
  | 'seleccionando'
  | 'iniciando'
  | 'procesando'
  | 'reconectando'
  | 'completada'
  | 'error';

interface ImportacionSociosPendiente {
  readonly companyUuid: string;
  readonly importId: string;
  readonly filasTotales: number;
}

interface FilaSocio extends SocioDto {
  readonly edad: string;
  readonly sexoTexto: string;
}

const FILAS_POR_PAGINA = 20;
const CLAVE_IMPORTACION_PENDIENTE = 'socios.importacion.pendiente';
const RUTA_PLANTILLA_IMPORTACION = 'assets/plantillas/plantilla-importacion-socios.xlsx';
const NOMBRE_PLANTILLA_IMPORTACION = 'plantilla-importacion-socios.xlsx';
const DURACION_MINIMA_CONTADOR_MS = 250;
const DURACION_MAXIMA_CONTADOR_MS = 700;
const DURACION_POR_PUNTO_PORCENTUAL_MS = 35;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Component({
  selector: 'app-gestion-socios',
  imports: [
    BotonComponent,
    FichaSocioComponent,
    CardComponent,
    FormularioFiltroSociosComponent,
    FormularioGestionSocioComponent,
    GrupoFamiliarSocioComponent,
    MembresiasSocioComponent,
    NgIcon,
    PaginacionComponent,
    PopupComponent,
    SelectComponent,
    TablaResponsiveComponent,
    TituloHeroComponent,
  ],
  providers: [provideIcons({ heroArrowDownTray, heroDocumentText, heroTicket })],
  templateUrl: './gestion-socios.component.html',
  styleUrl: './gestion-socios.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GestionSociosComponent implements OnDestroy {
  private readonly sociosApi = inject(SociosApiService);
  private readonly descuentosApi = inject(DescuentosApiService);
  private readonly authSessionService = inject(AuthSessionService);
  private readonly colorThemeService = inject(ColorThemeService);
  private readonly toastAlertService = inject(ToastAlertService);
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly esNavegador = isPlatformBrowser(this.platformId);

  readonly duracionErrorMs = input(5000);
  readonly filasVisiblesTabla = input(FILAS_POR_PAGINA);

  protected readonly socios = signal<readonly SocioDto[]>([]);
  protected readonly filas = computed<readonly FilaSocio[]>(() =>
    this.socios().map((socio) => ({
      ...socio,
      edad: formatearEdadDesdeFechaNacimiento(socio.fechaNacimiento),
      sexoTexto: formatearSexo(socio.sexo),
    })),
  );
  protected readonly paginaActual = signal(1);
  protected readonly filasPorPagina = FILAS_POR_PAGINA;
  protected readonly totalPaginas = signal(1);
  protected readonly busqueda = signal('');
  protected readonly estados = signal<readonly EstadoSocio[]>([]);
  protected readonly agruparFamiliares = signal(true);
  protected readonly cargando = signal(false);
  protected readonly procesandoUuid = signal<string | null>(null);
  protected readonly fondoBotonPlantilla = computed(
    () =>
      `linear-gradient(135deg, ${this.colorThemeService.colorPrimario()}, ${this.colorThemeService.colorSecundario()})`,
  );
  protected readonly colorTextoBotonPlantilla = computed(() =>
    obtenerColorTextoContrasteGradiente(
      this.colorThemeService.colorPrimario(),
      this.colorThemeService.colorSecundario(),
    ),
  );
  protected readonly colorSecundario = this.colorThemeService.colorSecundario;

  protected readonly modoFormulario = signal<ModoFormularioSocio | null>(null);
  protected readonly siguienteNumeroSocio = signal<string | null>(null);
  protected readonly socioEditando = signal<SocioDto | null>(null);
  protected readonly socioCambioEstado = signal<SocioDto | null>(null);
  protected readonly estadoSeleccionado = signal<EstadoSocio>('ACTIVO');
  protected readonly titularFamiliar = signal<SocioDto | null>(null);
  protected readonly titularGrupoFamiliar = signal<SocioDto | null>(null);
  protected readonly versionGrupoFamiliar = signal(0);
  protected readonly socioCertificados = signal<SocioDto | null>(null);
  /** Socio cuyo legajo de membresías está abierto. */
  protected readonly socioMembresias = signal<SocioDto | null>(null);
  /** Ficha (solo lectura) que se abre tocando la fila. */
  protected readonly socioFicha = signal<SocioDto | null>(null);
  protected readonly certificados = signal<readonly CertificadoMedicoDto[]>([]);
  protected readonly cargandoCertificados = signal(false);
  protected readonly socioCertificadosCargandoUuid = signal<string | null>(null);
  protected readonly procesandoCertificadoUuid = signal<string | null>(null);
  protected readonly enviandoFormulario = signal(false);
  protected readonly descuentosDisponibles = signal<readonly DescuentoDto[]>([]);
  protected readonly cargandoDescuentos = signal(false);
  private readonly catalogoDescuentosCargado = signal(false);

  protected readonly archivoImportacion = signal<File | null>(null);
  protected readonly arrastrandoArchivo = signal(false);
  protected readonly importacionAbierta = signal(false);
  protected readonly estadoImportacion = signal<EstadoImportacion>('seleccionando');
  protected readonly importando = computed(() =>
    ['iniciando', 'procesando', 'reconectando'].includes(this.estadoImportacion()),
  );
  protected readonly progresoImportacion = signal<ProgresoImportacionSociosDto | null>(null);
  protected readonly resultadoImportacion = signal<ResultadoImportacionSociosDetalleDto | null>(
    null,
  );
  protected readonly cargandoResultadoImportacion = signal(false);
  protected readonly errorResultadoImportacion = signal('');
  protected readonly porcentajeImportacionMostrado = signal(0);
  protected readonly mensajeErrorImportacion = signal('');
  protected readonly errorImportacionVisible = signal(false);

  protected readonly tituloFormulario = computed(() => {
    if (this.modoFormulario() === 'titular') return 'Nuevo socio titular';
    if (this.modoFormulario() === 'familiar') return 'Nuevo familiar';
    return 'Editar socio';
  });
  protected readonly opcionesEstadoSocio: readonly SelectOption[] = [
    { value: 'INACTIVO', label: 'Inactivo' },
    { value: 'MOROSO', label: 'Moroso' },
    { value: 'INHABILITADO', label: 'Inhabilitado' },
    { value: 'SUSPENDIDO', label: 'Suspendido' },
  ];

  protected readonly accionesCabecera: readonly AccionCabeceraTabla[] = [
    { id: 'importar-socios', texto: 'Importar socios', abreDialogo: true },
  ];
  protected readonly filtrosCabecera = computed<readonly FiltroCabeceraTabla[]>(() => [
    {
      id: 'agrupar-familiares',
      texto: 'Agrupar familiares',
      activo: this.agruparFamiliares(),
      deshabilitado: this.cargando(),
    },
  ]);
  protected readonly claseFilaSocio = (socio: FilaSocio): string | null =>
    socio.estado === 'INACTIVO' ? 'tabla-responsive__fila--peligro' : null;
  protected readonly columnas: readonly ColumnaTabla<FilaSocio>[] = [
    {
      id: 'imageUrl',
      titulo: 'Foto',
      tipo: 'avatar',
      avatarMostrarNombre: false,
      ancho: '5rem',
    },
    { id: 'nombre', titulo: 'Nombre', ancho: 'minmax(8rem, 1fr)' },
    { id: 'apellido', titulo: 'Apellido', ancho: 'minmax(8rem, 1fr)' },
    { id: 'dni', titulo: 'DNI', ancho: '8rem' },
    { id: 'email', titulo: 'Email', ancho: 'minmax(12rem, 1.4fr)' },
    { id: 'telefono', titulo: 'Teléfono', ancho: '10rem' },
    { id: 'edad', titulo: 'Edad', ancho: '9rem' },
    { id: 'sexoTexto', titulo: 'Sexo', ancho: '8rem' },
    { id: 'numeroSocio', titulo: 'N.º socio', ancho: '8rem' },
    { id: 'fechaAlta', titulo: 'Fecha de alta', tipo: 'fecha', ancho: '9rem' },
    {
      id: 'estado',
      titulo: 'Estado',
      tipo: 'estado',
      ancho: '9rem',
      estadoTexto: (valor) => String(valor ?? ''),
    },
  ];
  protected readonly columnasCertificados: readonly ColumnaTabla<CertificadoMedicoDto>[] = [
    {
      id: 'estado',
      titulo: 'Estado',
      tipo: 'estado',
      ancho: '12rem',
      estadoTexto: (valor) => String(valor ?? ''),
      estadoClase: (valor) => {
        const estado = String(valor).toUpperCase();
        if (estado === 'CONFIRMADO') return 'tabla-responsive__estado--presente';
        if (estado === 'DENEGADO') return 'tabla-responsive__estado--denegado';
        return 'tabla-responsive__estado--debe';
      },
    },
    { id: 'nombreArchivo', titulo: 'Informe', ancho: 'minmax(14rem, 1.4fr)' },
    { id: 'fechaCarga', titulo: 'Carga', tipo: 'fecha', ancho: '9rem' },
    { id: 'fechaExpiracion', titulo: 'Vencimiento', tipo: 'fecha', ancho: '10rem' },
  ];
  protected readonly accionesCertificados: readonly AccionTabla<CertificadoMedicoDto>[] = [
    {
      id: 'ver-informe',
      texto: 'Ver informe',
      icono: 'heroDocumentText',
      color: 'var(--gestion-socios-certificados)',
      deshabilitada: (certificado) => !certificado.urlArchivo,
      descripcionDeshabilitada: 'El informe no está disponible.',
    },
    {
      id: 'confirmar-certificado',
      texto: 'Confirmar',
      icono: 'heroCheckCircle',
      color: 'var(--semantic-warning)',
      visible: (certificado) => certificado.estado === 'PENDIENTE_VALIDACION',
      deshabilitada: () => !!this.procesandoCertificadoUuid(),
      cargando: (certificado) => this.procesandoCertificadoUuid() === certificado.certificadoUuid,
    },
    {
      id: 'denegar-certificado',
      texto: 'Denegar',
      icono: 'heroXMark',
      color: 'var(--semantic-danger)',
      visible: (certificado) => certificado.estado === 'PENDIENTE_VALIDACION',
      deshabilitada: () => !!this.procesandoCertificadoUuid(),
      cargando: (certificado) => this.procesandoCertificadoUuid() === certificado.certificadoUuid,
    },
    {
      id: 'certificado-confirmado',
      texto: 'Confirmado',
      icono: 'heroCheckCircle',
      color: 'var(--semantic-success)',
      visible: (certificado) => certificado.estado === 'CONFIRMADO',
      deshabilitada: () => true,
      descripcionDeshabilitada: 'El certificado ya fue confirmado.',
    },
    {
      id: 'certificado-denegado',
      texto: 'Denegado',
      icono: 'heroXMark',
      color: 'var(--semantic-danger)',
      visible: (certificado) => certificado.estado === 'DENEGADO',
      deshabilitada: () => true,
      descripcionDeshabilitada: 'El certificado ya fue denegado.',
    },
  ];
  protected readonly accionesSocios: readonly AccionTabla<FilaSocio>[] = [
    {
      predefinida: 'editar',
      deshabilitada: () => !!this.procesandoUuid(),
    },
    {
      id: 'agregar-familiar',
      texto: 'Agregar familiar',
      icono: 'heroUserPlus',
      color: 'var(--semantic-success)',
      visible: (socio) => this.esTitular(socio),
      deshabilitada: () => !!this.procesandoUuid(),
    },
    {
      id: 'ver-familiares',
      texto: 'Ver familiares',
      icono: 'heroUsers',
      color: (socio) =>
        socio.tieneFamiliares === true
          ? 'var(--gestion-socios-familiares-activo)'
          : 'var(--gestion-socios-familiares-inactivo)',
      visible: (socio) => this.esTitular(socio),
      deshabilitada: (socio) => socio.tieneFamiliares !== true || !!this.procesandoUuid(),
    },
    {
      id: 'ver-certificados',
      texto: 'Ver certificados',
      icono: 'heroDocumentText',
      color: 'color-mix(in srgb, #c44bd1 74%, #7c3aed)',
      deshabilitada: () => !!this.procesandoUuid() || this.cargandoCertificados(),
      cargando: (socio) => this.socioCertificadosCargandoUuid() === socio.memberUuid,
    },
    {
      id: 'membresias',
      texto: 'Membresías',
      icono: 'heroTicket',
      color: 'var(--app-accent)',
      deshabilitada: () => !!this.procesandoUuid(),
    },
    {
      id: 'dar-de-baja',
      texto: 'Dar de baja',
      icono: 'heroTrash',
      color: 'var(--semantic-danger)',
      visible: (socio) => socio.estado === 'ACTIVO',
      deshabilitada: (socio) =>
        !!this.procesandoUuid() && this.procesandoUuid() !== socio.memberUuid,
      cargando: (socio) => this.procesandoUuid() === socio.memberUuid,
    },
    {
      id: 'reactivar',
      texto: 'Activo',
      icono: 'heroArrowUp',
      color: 'var(--semantic-success)',
      visible: (socio) => socio.estado !== 'ACTIVO',
      deshabilitada: (socio) =>
        !!this.procesandoUuid() && this.procesandoUuid() !== socio.memberUuid,
      cargando: (socio) => this.procesandoUuid() === socio.memberUuid,
    },
  ];

  private timeoutErrorImportacion: ReturnType<typeof setTimeout> | null = null;
  private seguimientoImportacion: Subscription | null = null;
  private animacionPorcentajeId: number | null = null;

  constructor() {
    this.cargar();
    this.restaurarImportacionPendiente();
    // Atajo del inicio: ?accion=nuevo abre el alta de titular.
    if (inject(ActivatedRoute, { optional: true })?.snapshot.queryParamMap.get('accion') === 'nuevo') {
      queueMicrotask(() => this.abrirAltaTitular());
    }
  }

  ngOnDestroy(): void {
    this.seguimientoImportacion?.unsubscribe();
    this.limpiarTimeoutImportacion();
    this.cancelarAnimacionPorcentaje();
  }

  protected aplicarFiltros(payload: FiltroSociosPayload): void {
    this.busqueda.set(payload.busqueda);
    this.estados.set(payload.estados);
    this.paginaActual.set(1);
    this.cargar();
  }

  protected cambiarPagina(pagina: number): void {
    this.paginaActual.set(pagina);
    this.cargar();
  }

  protected manejarFiltroCabecera(evento: EventoFiltroCabeceraTabla): void {
    if (evento.id !== 'agrupar-familiares') return;

    this.agruparFamiliares.set(evento.activo);
    this.paginaActual.set(1);
    this.cargar();
  }

  protected abrirAltaTitular(): void {
    this.limpiarFormulario();
    this.cargarCatalogoDescuentos();
    this.modoFormulario.set('titular');
    this.cargarSiguienteNumeroSocio();
  }

  /** Solo informativo: si falla, el alta sigue funcionando y el backend asigna el número. */
  /** Refresca el listado (por ejemplo, después de cambiar la foto desde la ficha). */
  protected recargarListado(): void {
    this.cargar();
  }

  private cargarSiguienteNumeroSocio(): void {
    this.siguienteNumeroSocio.set(null);
    this.sociosApi.obtenerSiguienteNumeroSocio().subscribe({
      next: (numero) => this.siguienteNumeroSocio.set(numero),
      error: () => this.siguienteNumeroSocio.set(null),
    });
  }

  protected abrirAltaFamiliar(titular: SocioDto): void {
    this.limpiarFormulario();
    this.cargarCatalogoDescuentos();
    this.titularFamiliar.set(titular);
    this.modoFormulario.set('familiar');
  }

  protected abrirEdicion(socio: SocioDto): void {
    this.limpiarFormulario();
    this.socioEditando.set(socio);
    this.modoFormulario.set('editar');
  }

  protected abrirCambioEstado(socio: SocioDto): void {
    if (this.procesandoUuid()) return;
    if (socio.estado !== 'ACTIVO') {
      this.actualizarEstadoSocio(socio, 'ACTIVO');
      return;
    }

    this.socioCambioEstado.set(socio);
    this.estadoSeleccionado.set('INACTIVO');
  }

  protected cerrarCambioEstado(): void {
    if (!this.procesandoUuid()) this.socioCambioEstado.set(null);
  }

  protected seleccionarEstado(estado: string): void {
    if (this.esEstadoSocio(estado)) this.estadoSeleccionado.set(estado);
  }

  protected abrirGrupoFamiliar(titular: SocioDto): void {
    this.titularGrupoFamiliar.set(titular);
  }

  protected cerrarGrupoFamiliar(): void {
    this.titularGrupoFamiliar.set(null);
  }

  protected abrirCertificados(socio: SocioDto): void {
    if (this.cargandoCertificados()) return;

    this.certificados.set([]);
    this.cargandoCertificados.set(true);
    this.socioCertificadosCargandoUuid.set(socio.memberUuid);
    this.sociosApi
      .listarCertificados(socio.memberUuid)
      .pipe(
        finalize(() => {
          this.cargandoCertificados.set(false);
          this.socioCertificadosCargandoUuid.set(null);
        }),
      )
      .subscribe({
        next: (certificados) => {
          this.certificados.set(certificados);
          this.socioCertificados.set(socio);
        },
        error: () => void 0,
      });
  }

  protected cerrarCertificados(): void {
    if (!this.procesandoCertificadoUuid()) {
      this.socioCertificados.set(null);
      this.certificados.set([]);
    }
  }

  protected async manejarAccionCertificado(
    evento: EventoAccionTabla<CertificadoMedicoDto>,
  ): Promise<void> {
    if (evento.accion === 'ver-informe') {
      this.abrirInformeCertificado(evento.fila.urlArchivo);
      return;
    }

    if (
      (evento.accion !== 'confirmar-certificado' && evento.accion !== 'denegar-certificado') ||
      this.procesandoCertificadoUuid()
    ) {
      return;
    }

    const estado = evento.accion === 'confirmar-certificado' ? 'CONFIRMADO' : 'DENEGADO';
    const confirmado =
      estado === 'CONFIRMADO'
        ? await this.toastAlertService.confirm(
            'El certificado quedará validado y no podrá volver a estado pendiente desde esta pantalla.',
            {
              titulo: 'Confirmar certificado médico',
              textoConfirmar: 'Confirmar',
            },
          )
        : await this.toastAlertService.confirmDanger(
            'El certificado quedará denegado y no podrá volver a estado pendiente desde esta pantalla.',
            {
              titulo: 'Denegar certificado médico',
              textoConfirmar: 'Denegar',
            },
          );

    if (!confirmado || this.procesandoCertificadoUuid()) return;

    this.procesandoCertificadoUuid.set(evento.fila.certificadoUuid);
    this.sociosApi
      .actualizarEstadoCertificado(evento.fila.certificadoUuid, { estado })
      .pipe(finalize(() => this.procesandoCertificadoUuid.set(null)))
      .subscribe({
        next: (certificadoActualizado) =>
          this.certificados.update((certificados) =>
            certificados.map((certificado) =>
              certificado.certificadoUuid === certificadoActualizado.certificadoUuid
                ? certificadoActualizado
                : certificado,
            ),
          ),
        error: () => void 0,
      });
  }

  protected editarFamiliarDesdeGrupo(familiar: SocioDto): void {
    this.cerrarGrupoFamiliar();
    this.abrirEdicion(familiar);
  }

  protected cerrarFormulario(): void {
    this.modoFormulario.set(null);
    this.limpiarFormulario();
  }

  protected manejarAccionSocio(evento: EventoAccionTabla<FilaSocio>): void {
    switch (evento.accion) {
      case 'editar':
        this.abrirEdicion(evento.fila);
        break;
      case 'agregar-familiar':
        this.abrirAltaFamiliar(evento.fila);
        break;
      case 'ver-familiares':
        if (evento.fila.tieneFamiliares === true) {
          this.abrirGrupoFamiliar(evento.fila);
        }
        break;
      case 'ver-certificados':
        this.abrirCertificados(evento.fila);
        break;
      case 'membresias':
        this.socioMembresias.set(evento.fila);
        break;
      case 'dar-de-baja':
      case 'reactivar':
        this.abrirCambioEstado(evento.fila);
        break;
    }
  }

  protected guardar(resultado: GestionSocioPayload): void {
    if (this.enviandoFormulario()) return;
    const modo = this.modoFormulario();
    if (!modo || resultado.modo !== modo) return;
    this.enviandoFormulario.set(true);

    const solicitud =
      resultado.modo === 'titular'
        ? this.sociosApi.crearTitular(resultado.datos)
        : resultado.modo === 'familiar'
          ? this.sociosApi.crearFamiliar({
              titularMemberUuid: this.titularFamiliar()!.memberUuid,
              ...resultado.datos,
            })
          : this.sociosApi.actualizar(this.socioEditando()!.memberUuid, resultado.datos);

    solicitud.pipe(finalize(() => this.enviandoFormulario.set(false))).subscribe({
      next: () => {
        this.cerrarFormulario();
        this.cargar();
      },
      error: (error: unknown) => {
        // Número de socio repetido: se deja el formulario abierto para elegir otro sin perder lo cargado.
        if (error instanceof HttpErrorResponse && error.status === 409) {
          if (resultado.modo === 'titular') this.cargarSiguienteNumeroSocio();
          return;
        }
        this.cerrarFormulario();
      },
    });
  }

  private cargarCatalogoDescuentos(): void {
    if (this.catalogoDescuentosCargado() || this.cargandoDescuentos()) return;
    this.cargandoDescuentos.set(true);
    this.cargarPaginaCatalogoDescuentos(1, []);
  }

  private cargarPaginaCatalogoDescuentos(
    pagina: number,
    acumulados: readonly DescuentoDto[],
  ): void {
    this.descuentosApi.paginarCatalogo({ page: pagina, size: 100, search: '' }).subscribe({
      next: (respuesta) => {
        const catalogo = [...acumulados, ...respuesta.content];
        if (pagina < respuesta.totalPages) {
          this.cargarPaginaCatalogoDescuentos(pagina + 1, catalogo);
          return;
        }
        this.descuentosDisponibles.set(catalogo);
        this.catalogoDescuentosCargado.set(true);
        this.cargandoDescuentos.set(false);
      },
      error: () => this.cargandoDescuentos.set(false),
    });
  }

  protected cambiarEstadoSocio(): void {
    const socio = this.socioCambioEstado();
    const estado = this.estadoSeleccionado();
    if (!socio || this.procesandoUuid() || socio.estado === estado) return;
    this.actualizarEstadoSocio(socio, estado);
  }

  private actualizarEstadoSocio(socio: SocioDto, estado: EstadoSocio): void {
    this.procesandoUuid.set(socio.memberUuid);
    this.sociosApi
      .actualizarEstado(socio.memberUuid, { estado })
      .pipe(finalize(() => this.procesandoUuid.set(null)))
      .subscribe({
        next: (socioActualizado) => {
          this.socios.update((socios) =>
            socios.map((socioListado) =>
              socioListado.memberUuid === socioActualizado.memberUuid
                ? { ...socioListado, ...socioActualizado }
                : socioListado,
            ),
          );
          if (this.titularGrupoFamiliar()) {
            this.versionGrupoFamiliar.update((version) => version + 1);
          }
          this.socioCambioEstado.set(null);
        },
        error: () => void 0,
      });
  }

  protected seleccionarArchivo(evento: Event): void {
    const inputArchivo = evento.target as HTMLInputElement;
    const archivo = inputArchivo.files?.[0] ?? null;
    this.asignarArchivoImportacion(archivo);
  }

  protected iniciarArrastreArchivo(evento: DragEvent): void {
    evento.preventDefault();
    if (!this.importando()) this.arrastrandoArchivo.set(true);
  }

  protected finalizarArrastreArchivo(evento: DragEvent): void {
    evento.preventDefault();
    const contenedor = evento.currentTarget as HTMLElement;
    const siguienteElemento = evento.relatedTarget as Node | null;

    if (!siguienteElemento || !contenedor.contains(siguienteElemento)) {
      this.arrastrandoArchivo.set(false);
    }
  }

  protected soltarArchivo(evento: DragEvent): void {
    evento.preventDefault();
    this.arrastrandoArchivo.set(false);
    if (this.importando()) return;

    this.asignarArchivoImportacion(evento.dataTransfer?.files?.[0] ?? null);
  }

  private asignarArchivoImportacion(archivo: File | null): void {
    this.archivoImportacion.set(archivo);
    this.estadoImportacion.set('seleccionando');
    this.progresoImportacion.set(null);
    this.limpiarResultadoImportacion();
    this.reiniciarPorcentajeImportacion();
    this.mensajeErrorImportacion.set('');
    this.errorImportacionVisible.set(false);
  }

  protected manejarAccionCabecera(accion: string): void {
    if (accion === 'importar-socios') {
      this.abrirImportacion();
    }
  }

  protected abrirImportacion(): void {
    this.archivoImportacion.set(null);
    this.arrastrandoArchivo.set(false);
    this.estadoImportacion.set('seleccionando');
    this.progresoImportacion.set(null);
    this.limpiarResultadoImportacion();
    this.reiniciarPorcentajeImportacion();
    this.mensajeErrorImportacion.set('');
    this.errorImportacionVisible.set(false);
    this.importacionAbierta.set(true);
  }

  protected cerrarImportacion(): void {
    if (!this.importando()) {
      this.importacionAbierta.set(false);
    }
  }

  protected descargarPlantillaImportacion(): void {
    if (!this.esNavegador) return;

    const enlace = this.document.createElement('a');
    enlace.href = RUTA_PLANTILLA_IMPORTACION;
    enlace.download = NOMBRE_PLANTILLA_IMPORTACION;
    enlace.click();
  }

  protected importar(): void {
    const archivo = this.archivoImportacion();
    if (!archivo) {
      this.mostrarErrorImportacion('Selecciona un archivo Excel.');
      return;
    }
    if (!/\.(xls|xlsx)$/i.test(archivo.name)) {
      this.mostrarErrorImportacion('El archivo debe tener extensión .xls o .xlsx.');
      return;
    }
    if (this.importando()) return;

    this.estadoImportacion.set('iniciando');
    this.progresoImportacion.set(null);
    this.limpiarResultadoImportacion();
    this.reiniciarPorcentajeImportacion();
    this.mensajeErrorImportacion.set('');
    this.errorImportacionVisible.set(false);
    this.sociosApi.iniciarImportacion(archivo).subscribe({
      next: (inicio) => {
        this.progresoImportacion.set({
          filasProcesadas: 0,
          filasTotales: inicio.filasTotales,
          porcentajeCompletado: 0,
        });
        this.estadoImportacion.set('procesando');
        this.persistirImportacionPendiente(inicio.importId, inicio.filasTotales);
        this.seguirImportacion(inicio.importId);
      },
      error: (error: unknown) => {
        this.estadoImportacion.set('seleccionando');
        this.mostrarErrorImportacion(
          this.obtenerMensajeError(error, 'No se pudo importar el archivo.'),
          true,
        );
      },
    });
  }

  protected manejarAccionImportacion(): void {
    if (['completada', 'error'].includes(this.estadoImportacion())) {
      this.cerrarImportacion();
      return;
    }

    if (this.estadoImportacion() === 'seleccionando') this.importar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.sociosApi
      .paginar({
        page: this.paginaActual(),
        size: this.filasPorPagina,
        search: this.busqueda().trim(),
        estados: this.estados(),
        ...(this.agruparFamiliares() ? { titular: true } : {}),
      })
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (respuesta) => {
          this.socios.set(respuesta.content);
          this.totalPaginas.set(Math.max(1, respuesta.totalPages));
        },
        // Ante un error se conservan las filas actuales; el interceptor informa mediante toast.
        error: () => void 0,
      });
  }

  private limpiarFormulario(): void {
    this.socioEditando.set(null);
    this.titularFamiliar.set(null);
  }

  private seguirImportacion(importId: string): void {
    this.seguimientoImportacion?.unsubscribe();
    this.seguimientoImportacion = this.sociosApi.observarProgresoImportacion(importId).subscribe({
      next: (evento) => this.procesarEventoImportacion(evento, importId),
      error: (error: unknown) => {
        this.estadoImportacion.set('error');
        this.limpiarImportacionPendiente();
        this.mostrarErrorImportacion(
          this.obtenerMensajeError(
            error,
            'No se pudo recuperar el seguimiento. La importación puede continuar en el servidor.',
          ),
          true,
        );
        this.seguimientoImportacion = null;
      },
      complete: () => {
        this.seguimientoImportacion = null;
      },
    });
  }

  private procesarEventoImportacion(
    evento: EventoSeguimientoImportacionSociosDto,
    importId: string,
  ): void {
    if (evento.tipo === 'conectado') {
      if (this.estadoImportacion() === 'reconectando') this.estadoImportacion.set('procesando');
      return;
    }

    if (evento.tipo === 'reconectando') {
      this.estadoImportacion.set('reconectando');
      return;
    }

    this.progresoImportacion.set(evento.datos);
    if (evento.tipo === 'progreso') {
      this.animarPorcentajeImportacion(evento.datos.porcentajeCompletado);
      this.estadoImportacion.set('procesando');
      return;
    }

    this.limpiarImportacionPendiente();
    this.cargar();
    if (evento.tipo === 'completada') {
      this.estadoImportacion.set('procesando');
      this.cargarResultadoImportacion(importId);
      this.animarPorcentajeImportacion(evento.datos.porcentajeCompletado, () => {
        this.estadoImportacion.set('completada');
      });
      return;
    }

    this.estadoImportacion.set('error');
    this.mostrarErrorImportacion(evento.datos.errorMessage, true);
  }

  protected etiquetaEstadoFila(fila: ResultadoFilaImportacionSociosDto): string {
    return fila.status === 'SUCCESS' ? 'Correcta' : 'Con error';
  }

  protected etiquetaTipoFila(fila: ResultadoFilaImportacionSociosDto): string {
    if (fila.tipo === 'TITULAR') return 'Titular';
    if (fila.tipo === 'FAMILIAR') return 'Familiar';
    return 'Sin tipo';
  }

  protected formatearFechaResultado(fecha: string): string {
    const valor = new Date(fecha);
    return Number.isNaN(valor.getTime())
      ? fecha
      : new Intl.DateTimeFormat('es-AR', {
          dateStyle: 'short',
          timeStyle: 'short',
        }).format(valor);
  }

  private cargarResultadoImportacion(importId: string): void {
    this.cargandoResultadoImportacion.set(true);
    this.errorResultadoImportacion.set('');
    this.sociosApi
      .obtenerResultadoImportacion(importId)
      .pipe(finalize(() => this.cargandoResultadoImportacion.set(false)))
      .subscribe({
        next: (resultado) => this.resultadoImportacion.set(resultado),
        error: () =>
          this.errorResultadoImportacion.set(
            'La importación finalizó, pero no se pudo cargar el detalle de las filas.',
          ),
      });
  }

  private limpiarResultadoImportacion(): void {
    this.resultadoImportacion.set(null);
    this.cargandoResultadoImportacion.set(false);
    this.errorResultadoImportacion.set('');
  }

  private persistirImportacionPendiente(importId: string, filasTotales: number): void {
    const companyUuid = this.authSessionService.obtenerCompanyUuid();
    if (!this.esNavegador || !companyUuid) return;

    const pendiente: ImportacionSociosPendiente = { companyUuid, importId, filasTotales };
    try {
      sessionStorage.setItem(this.obtenerClaveImportacion(companyUuid), JSON.stringify(pendiente));
    } catch {
      // El seguimiento actual continúa aunque el navegador no permita persistirlo.
    }
  }

  private restaurarImportacionPendiente(): void {
    const companyUuid = this.authSessionService.obtenerCompanyUuid();
    if (!this.esNavegador || !companyUuid) return;

    const clave = this.obtenerClaveImportacion(companyUuid);
    try {
      const serializado = sessionStorage.getItem(clave);
      if (!serializado) return;

      const pendiente = JSON.parse(serializado) as unknown;
      if (!this.esImportacionPendienteValida(pendiente, companyUuid)) {
        this.eliminarRegistroPersistido(clave);
        return;
      }

      this.progresoImportacion.set({
        filasProcesadas: 0,
        filasTotales: pendiente.filasTotales,
        porcentajeCompletado: 0,
      });
      this.reiniciarPorcentajeImportacion();
      this.estadoImportacion.set('procesando');
      this.importacionAbierta.set(true);
      this.seguirImportacion(pendiente.importId);
    } catch {
      this.eliminarRegistroPersistido(clave);
    }
  }

  private limpiarImportacionPendiente(): void {
    const companyUuid = this.authSessionService.obtenerCompanyUuid();
    if (!this.esNavegador || !companyUuid) return;

    this.eliminarRegistroPersistido(this.obtenerClaveImportacion(companyUuid));
  }

  private animarPorcentajeImportacion(destinoSolicitado: number, alFinalizar?: () => void): void {
    const vista = this.document.defaultView;
    const origen = this.porcentajeImportacionMostrado();
    const destinoNormalizado = Math.round(Math.min(100, Math.max(0, destinoSolicitado)));
    const destino = Math.max(origen, destinoNormalizado);

    this.cancelarAnimacionPorcentaje();
    if (destino === origen) {
      alFinalizar?.();
      return;
    }

    const reducirMovimiento =
      vista && typeof vista.matchMedia === 'function'
        ? vista.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false;
    if (
      !this.esNavegador ||
      !vista ||
      typeof vista.requestAnimationFrame !== 'function' ||
      reducirMovimiento
    ) {
      this.porcentajeImportacionMostrado.set(destino);
      alFinalizar?.();
      return;
    }

    const diferencia = destino - origen;
    const duracion = Math.min(
      DURACION_MAXIMA_CONTADOR_MS,
      Math.max(DURACION_MINIMA_CONTADOR_MS, diferencia * DURACION_POR_PUNTO_PORCENTUAL_MS),
    );
    const inicio = vista.performance.now();

    const actualizar = (ahora: number): void => {
      const avance = Math.min((ahora - inicio) / duracion, 1);
      const avanceSuavizado = 1 - (1 - avance) ** 3;
      this.porcentajeImportacionMostrado.set(Math.round(origen + diferencia * avanceSuavizado));

      if (avance < 1) {
        this.animacionPorcentajeId = vista.requestAnimationFrame(actualizar);
      } else {
        this.animacionPorcentajeId = null;
        alFinalizar?.();
      }
    };

    this.animacionPorcentajeId = vista.requestAnimationFrame(actualizar);
  }

  private reiniciarPorcentajeImportacion(): void {
    this.cancelarAnimacionPorcentaje();
    this.porcentajeImportacionMostrado.set(0);
  }

  private cancelarAnimacionPorcentaje(): void {
    const vista = this.document.defaultView;
    if (
      this.animacionPorcentajeId !== null &&
      vista &&
      typeof vista.cancelAnimationFrame === 'function'
    ) {
      vista.cancelAnimationFrame(this.animacionPorcentajeId);
    }
    this.animacionPorcentajeId = null;
  }

  private obtenerClaveImportacion(companyUuid: string): string {
    return `${CLAVE_IMPORTACION_PENDIENTE}.${companyUuid}`;
  }

  private eliminarRegistroPersistido(clave: string): void {
    try {
      sessionStorage.removeItem(clave);
    } catch {
      // La limpieza no debe ocultar el estado actual de la importación.
    }
  }

  private esImportacionPendienteValida(
    valor: unknown,
    companyUuid: string,
  ): valor is ImportacionSociosPendiente {
    if (!valor || typeof valor !== 'object') return false;
    const pendiente = valor as Record<string, unknown>;
    return (
      pendiente['companyUuid'] === companyUuid &&
      typeof pendiente['importId'] === 'string' &&
      UUID_PATTERN.test(pendiente['importId']) &&
      typeof pendiente['filasTotales'] === 'number' &&
      Number.isInteger(pendiente['filasTotales']) &&
      pendiente['filasTotales'] >= 0
    );
  }

  private mostrarErrorImportacion(mensaje: string, persistente = false): void {
    this.limpiarTimeoutImportacion();
    this.mensajeErrorImportacion.set(mensaje);
    this.errorImportacionVisible.set(true);
    if (persistente) return;

    this.timeoutErrorImportacion = setTimeout(
      () => this.errorImportacionVisible.set(false),
      this.duracionErrorMs(),
    );
  }

  private limpiarTimeoutImportacion(): void {
    if (this.timeoutErrorImportacion !== null) clearTimeout(this.timeoutErrorImportacion);
    this.timeoutErrorImportacion = null;
  }

  private obtenerMensajeError(error: unknown, fallback: string): string {
    return extraerMensajeErrorApi(error, fallback);
  }

  private esEstadoSocio(estado: string): estado is EstadoSocio {
    return this.opcionesEstadoSocio.some((opcion) => opcion.value === estado);
  }

  private esTitular(socio: SocioDto): boolean {
    return socio.titular ?? !socio.parentesco;
  }

  private abrirInformeCertificado(urlArchivo: string | null | undefined): void {
    if (!urlArchivo) return;

    try {
      const destino = new URL(urlArchivo, window.location.origin);
      if (destino.protocol === 'http:' || destino.protocol === 'https:') {
        window.open(destino.toString(), '_blank', 'noopener,noreferrer');
      }
    } catch {
      // La URL del informe es inválida: no se intenta abrir contenido no confiable.
    }
  }
}
