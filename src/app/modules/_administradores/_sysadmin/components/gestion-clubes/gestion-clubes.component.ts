import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import {
  ActualizarAdministradorClubPayload,
  AdministradorClubDto,
  CrearAdministradorClubPayload,
} from '../../../../../core/api/interfaces/administradores-club.interfaces';
import {
  EmpresaDto,
  PerfilEmpresaDto,
  PerfilEmpresaPayload,
} from '../../../../../core/api/interfaces/empresa.interfaces';
import { AdministradoresClubApiService } from '../../../../../core/api/services/administradores-club-api.service';
import { EmpresaApiService } from '../../../../../core/api/services/empresa-api.service';
import { extraerMensajeErrorApi } from '../../../../../core/api/error-api';
import { AuthService } from '../../../../../core/global-services/services/auth.service';
import { BotonComponent } from '../../../../ui/boton/boton.component';
import { CardComponent } from '../../../../ui/card/card.component';
import { LoadSpinnerBlueComponent } from '../../../../ui/load-spinner-blue/load-spinner-blue.component';
import { PaginacionComponent } from '../../../../ui/paginacion/paginacion.component';
import { PopupComponent } from '../../../../ui/popup/popup.component';
import { ToastAlertService } from '../../../../ui/toast-alert/services/toast-alert.service';
import { TituloHeroComponent } from '../../../../ui/titulo-hero/titulo-hero.component';
import {
  AccionTabla,
  ColumnaTabla,
  EventoAccionTabla,
  TablaResponsiveComponent,
} from '../../../../ui/tabla-responsive/tabla-responsive.component';
import {
  FormularioAdministradorClubComponent,
  ModoFormularioAdministradorClub,
  ResultadoFormularioAdministradorClub,
} from '../../forms/formulario-administrador-club/formulario-administrador-club.component';
import { FormularioPerfilClubComponent } from '../../forms/formulario-perfil-club/formulario-perfil-club.component';

const TAMANO_PAGINA = 15;
const FILAS_VISIBLES = 7;

interface FilaClub extends EmpresaDto {
  readonly nombreClub: string;
  readonly estadoClub: string;
}

interface FilaAdministrador extends AdministradorClubDto {}

@Component({
  selector: 'app-gestion-clubes',
  standalone: true,
  imports: [
    BotonComponent,
    CardComponent,
    FormularioAdministradorClubComponent,
    FormularioPerfilClubComponent,
    FormsModule,
    LoadSpinnerBlueComponent,
    PaginacionComponent,
    PopupComponent,
    TablaResponsiveComponent,
    TituloHeroComponent,
  ],
  templateUrl: './gestion-clubes.component.html',
  styleUrl: './gestion-clubes.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GestionClubesComponent {
  private readonly empresaApi = inject(EmpresaApiService);
  private readonly administradoresApi = inject(AdministradoresClubApiService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toastAlert = inject(ToastAlertService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly tamanoPagina = TAMANO_PAGINA;
  protected readonly filasVisibles = FILAS_VISIBLES;
  protected readonly clubes = signal<readonly EmpresaDto[]>([]);
  protected readonly filas = computed<readonly FilaClub[]>(() =>
    this.clubes().map((club) => ({
      ...club,
      nombreClub: club.nombreComercial?.trim() || club.razonSocial?.trim() || 'Gimnasio sin nombre',
      estadoClub: club.status === 0 ? 'Activo' : 'Desactivado',
    })),
  );
  protected readonly pagina = signal(1);
  protected readonly totalPaginas = signal(1);
  protected readonly busqueda = signal('');
  protected readonly cargando = signal(false);
  protected readonly errorListado = signal('');

  protected readonly columnas: readonly ColumnaTabla<FilaClub>[] = [
    {
      id: 'logoUrl',
      titulo: 'Club',
      tipo: 'avatar',
      ancho: 'minmax(14rem, 1.6fr)',
      avatarIniciales: (fila) => this.obtenerIniciales(fila.nombreClub),
      avatarNombre: (fila) => fila.nombreClub,
    },
    { id: 'razonSocial', titulo: 'Razón social', ancho: 'minmax(14rem, 1.5fr)' },
    { id: 'cuit', titulo: 'CUIT', ancho: '10rem', formatearTexto: (valor) => String(valor ?? '—') },
    { id: 'estadoClub', titulo: 'Estado', tipo: 'estado', ancho: '9rem' },
  ];
  protected readonly acciones: readonly AccionTabla<FilaClub>[] = [
    {
      id: 'editar-empresa',
      texto: 'Editar empresa',
      icono: 'heroPencilSquare',
      color: 'var(--semantic-warning)',
      deshabilitada: () => this.procesando(),
    },
    {
      id: 'administradores',
      texto: 'Administradores',
      icono: 'heroUsers',
      color: 'var(--app-accent)',
      deshabilitada: () => this.procesando(),
    },
    {
      id: 'entrar-al-club',
      texto: 'Entrar al gimnasio',
      icono: 'heroArrowRightOnRectangle',
      color: 'var(--semantic-success)',
      deshabilitada: () => this.procesando(),
    },
  ];

  protected readonly popupEmpresaAbierto = signal(false);
  protected readonly popupAdministradoresAbierto = signal(false);
  protected readonly clubSeleccionado = signal<EmpresaDto | null>(null);
  protected readonly perfil = signal<PerfilEmpresaDto | null>(null);
  protected readonly cargandoPerfil = signal(false);
  protected readonly errorPerfil = signal('');
  protected readonly guardandoPerfil = signal(false);

  protected readonly administradores = signal<readonly AdministradorClubDto[]>([]);
  protected readonly filasAdministradores = computed<readonly FilaAdministrador[]>(() =>
    this.administradores(),
  );
  protected readonly paginaAdministradores = signal(1);
  protected readonly totalPaginasAdministradores = signal(1);
  protected readonly busquedaAdministradores = signal('');
  protected readonly cargandoAdministradores = signal(false);
  protected readonly errorAdministradores = signal('');
  protected readonly modoAdministrador = signal<ModoFormularioAdministradorClub>('crear');
  protected readonly administradorEditando = signal<AdministradorClubDto | null>(null);
  protected readonly formularioAdministradorVisible = signal(false);
  protected readonly guardandoAdministrador = signal(false);
  protected readonly errorOperacion = signal('');
  protected readonly confirmandoIngreso = signal(false);

  protected readonly columnasAdministradores: readonly ColumnaTabla<FilaAdministrador>[] = [
    { id: 'nombre', titulo: 'Nombre', ancho: 'minmax(9rem, 1fr)' },
    { id: 'apellido', titulo: 'Apellido', ancho: 'minmax(9rem, 1fr)' },
    { id: 'dni', titulo: 'DNI', ancho: '8rem', formatearTexto: (valor) => String(valor ?? '—') },
    { id: 'email', titulo: 'Email', ancho: 'minmax(13rem, 1.4fr)' },
    {
      id: 'telefono',
      titulo: 'Teléfono',
      ancho: '10rem',
      formatearTexto: (valor) => String(valor ?? '—'),
    },
  ];
  protected readonly accionesAdministradores: readonly AccionTabla<FilaAdministrador>[] = [
    {
      predefinida: 'editar',
      deshabilitada: () => this.procesando(),
    },
  ];

  protected readonly procesando = computed(
    () => this.confirmandoIngreso() || this.guardandoPerfil() || this.guardandoAdministrador(),
  );
  protected readonly nombreClubSeleccionado = computed(() => {
    const club = this.clubSeleccionado();
    return club?.nombreComercial?.trim() || club?.razonSocial?.trim() || club?.uuid || 'Club';
  });
  protected readonly tituloAdministrador = computed(() =>
    this.modoAdministrador() === 'crear' ? 'Nuevo administrador' : 'Editar administrador',
  );

  constructor() {
    if (this.authService.esAdminDelegadoDesdeSysadmin()) {
      this.authService.volverAlContextoSysadmin();
    }
    queueMicrotask(() => this.cargarClubes());
  }

  protected buscarClubes(): void {
    this.pagina.set(1);
    this.cargarClubes();
  }

  protected cambiarPagina(pagina: number): void {
    this.pagina.set(pagina);
    this.cargarClubes();
  }

  protected manejarAccionFila(evento: EventoAccionTabla<FilaClub>): void {
    if (evento.accion === 'editar-empresa') this.abrirEdicionEmpresa(evento.fila);
    if (evento.accion === 'administradores') this.abrirAdministradores(evento.fila);
    if (evento.accion === 'entrar-al-club') void this.entrarAlClub(evento.fila);
  }

  protected async entrarAlClub(club: FilaClub): Promise<void> {
    if (this.procesando()) return;
    this.confirmandoIngreso.set(true);

    try {
      if (!this.authService.tieneRolGlobal('SYSADMIN')) {
        this.errorListado.set('Solo un usuario SYSADMIN puede entrar al gimnasio como ADMIN.');
        return;
      }

      const confirmado = await this.toastAlert.confirmDanger(
        'Cualquier cambio que realices va a impactar en la empresa de manera permanente.',
        { titulo: 'Atención', textoConfirmar: 'Ingresar', textoCancelar: 'Cancelar' },
      );
      if (!confirmado) return;

      if (!this.authService.entrarComoAdminDesdeSysadmin(club.uuid)) {
        this.errorListado.set('Solo un usuario SYSADMIN puede entrar al gimnasio como ADMIN.');
        return;
      }

      void this.router.navigateByUrl('/admin/dashboard');
    } finally {
      this.confirmandoIngreso.set(false);
    }
  }

  protected cerrarPopupEmpresa(): void {
    if (this.procesando()) return;
    this.popupEmpresaAbierto.set(false);
    this.clubSeleccionado.set(null);
    this.perfil.set(null);
    this.errorPerfil.set('');
  }

  protected cerrarPopupAdministradores(): void {
    if (this.procesando()) return;
    this.popupAdministradoresAbierto.set(false);
    this.clubSeleccionado.set(null);
    this.administradores.set([]);
    this.formularioAdministradorVisible.set(false);
    this.errorOperacion.set('');
  }

  protected guardarPerfil(cambios: PerfilEmpresaPayload): void {
    const club = this.clubSeleccionado();
    const perfil = this.perfil();
    if (!club || !perfil || this.guardandoPerfil()) return;

    this.guardandoPerfil.set(true);
    this.errorPerfil.set('');
    this.empresaApi
      .actualizarPerfil(club.uuid, cambios)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.guardandoPerfil.set(false)),
      )
      .subscribe({
        next: () => {
          this.perfil.set({ ...perfil, ...cambios });
          this.clubSeleccionado.set({
            ...club,
            nombreComercial: cambios.nombreComercial,
            razonSocial: cambios.razonSocial,
            cuit: cambios.cuit,
          });
          this.cargarClubes();
        },
        error: (error: unknown) =>
          this.errorPerfil.set(
            extraerMensajeErrorApi(error, 'No se pudo actualizar el perfil del gimnasio.'),
          ),
      });
  }

  protected buscarAdministradores(): void {
    this.paginaAdministradores.set(1);
    this.cargarAdministradores();
  }

  protected cambiarPaginaAdministradores(pagina: number): void {
    this.paginaAdministradores.set(pagina);
    this.cargarAdministradores();
  }

  protected abrirNuevoAdministrador(): void {
    if (this.procesando()) return;
    this.modoAdministrador.set('crear');
    this.administradorEditando.set(null);
    this.errorOperacion.set('');
    this.formularioAdministradorVisible.set(true);
  }

  protected manejarAccionAdministrador(evento: EventoAccionTabla<FilaAdministrador>): void {
    if (evento.accion !== 'editar' || this.procesando()) return;
    this.modoAdministrador.set('editar');
    this.administradorEditando.set(evento.fila);
    this.errorOperacion.set('');
    this.formularioAdministradorVisible.set(true);
  }

  protected volverAlListadoAdministradores(): void {
    if (this.guardandoAdministrador()) return;
    this.formularioAdministradorVisible.set(false);
    this.administradorEditando.set(null);
    this.errorOperacion.set('');
  }

  protected guardarAdministrador(resultado: ResultadoFormularioAdministradorClub): void {
    const club = this.clubSeleccionado();
    if (!club || this.guardandoAdministrador()) return;

    this.guardandoAdministrador.set(true);
    this.errorOperacion.set('');
    const solicitud =
      resultado.modo === 'crear'
        ? this.administradoresApi.crear(club.uuid, resultado.datos as CrearAdministradorClubPayload)
        : this.administradoresApi.actualizar(
            club.uuid,
            this.administradorEditando()?.userUuid ?? '',
            resultado.datos as ActualizarAdministradorClubPayload,
          );

    solicitud
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.guardandoAdministrador.set(false)),
      )
      .subscribe({
        next: () => {
          this.formularioAdministradorVisible.set(false);
          this.administradorEditando.set(null);
          this.cargarAdministradores();
        },
        error: (error: unknown) =>
          this.errorOperacion.set(
            extraerMensajeErrorApi(error, 'No se pudo guardar el administrador.'),
          ),
      });
  }

  private abrirEdicionEmpresa(club: FilaClub): void {
    if (this.procesando()) return;
    this.clubSeleccionado.set(club);
    this.perfil.set(null);
    this.errorPerfil.set('');
    this.popupEmpresaAbierto.set(true);
    this.cargarPerfil(club.uuid);
  }

  private abrirAdministradores(club: FilaClub): void {
    if (this.procesando()) return;
    this.clubSeleccionado.set(club);
    this.administradores.set([]);
    this.paginaAdministradores.set(1);
    this.busquedaAdministradores.set('');
    this.formularioAdministradorVisible.set(false);
    this.errorAdministradores.set('');
    this.errorOperacion.set('');
    this.popupAdministradoresAbierto.set(true);
    this.cargarAdministradores(club.uuid);
  }

  private cargarClubes(): void {
    this.cargando.set(true);
    this.errorListado.set('');
    this.empresaApi
      .paginarClubes({ page: this.pagina(), size: TAMANO_PAGINA, search: this.busqueda().trim() })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cargando.set(false)),
      )
      .subscribe({
        next: (respuesta) => {
          this.clubes.set(respuesta.content);
          this.totalPaginas.set(Math.max(1, respuesta.totalPages));
        },
        error: (error: unknown) =>
          this.errorListado.set(extraerMensajeErrorApi(error, 'No se pudieron cargar los gimnasios.')),
      });
  }

  protected cargarPerfil(companyUuid = this.clubSeleccionado()?.uuid ?? ''): void {
    if (!companyUuid) return;
    this.cargandoPerfil.set(true);
    this.errorPerfil.set('');
    this.empresaApi
      .obtenerPerfil(companyUuid)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cargandoPerfil.set(false)),
      )
      .subscribe({
        next: (perfil) => this.perfil.set(perfil),
        error: (error: unknown) =>
          this.errorPerfil.set(
            extraerMensajeErrorApi(error, 'No se pudo cargar el perfil del gimnasio.'),
          ),
      });
  }

  private cargarAdministradores(companyUuid = this.clubSeleccionado()?.uuid ?? ''): void {
    if (!companyUuid) return;
    this.cargandoAdministradores.set(true);
    this.errorAdministradores.set('');
    this.administradoresApi
      .paginar(companyUuid, {
        page: this.paginaAdministradores(),
        size: TAMANO_PAGINA,
        search: this.busquedaAdministradores().trim(),
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cargandoAdministradores.set(false)),
      )
      .subscribe({
        next: (respuesta) => {
          this.administradores.set(respuesta.content);
          this.totalPaginasAdministradores.set(Math.max(1, respuesta.totalPages));
        },
        error: (error: unknown) =>
          this.errorAdministradores.set(
            extraerMensajeErrorApi(error, 'No se pudieron cargar los administradores.'),
          ),
      });
  }

  private obtenerIniciales(nombre: string): string {
    return (
      nombre
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((parte) => parte.charAt(0))
        .join('')
        .toUpperCase() || 'C'
    );
  }
}
