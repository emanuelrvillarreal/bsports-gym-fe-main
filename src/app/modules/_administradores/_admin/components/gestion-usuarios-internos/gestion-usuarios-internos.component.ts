import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Observable, finalize } from 'rxjs';

import {
  ActualizarUsuarioInternoPayload,
  CrearUsuarioInternoPayload,
  EstadoUsuarioInterno,
  PaginaUsuariosInternosResponse,
  ProfesorDto,
  RecepcionistaDto,
  UsuarioInternoDto,
} from '../../../../../core/api/interfaces/usuarios-internos.interfaces';
import { ProfesoresApiService } from '../../../../../core/api/services/profesores-api.service';
import { RecepcionistasApiService } from '../../../../../core/api/services/recepcionistas-api.service';
import { formatearFechaCorta } from '../../../../../helpers/fecha-formato';
import { BotonComponent } from '../../../../ui/boton/boton.component';
import { CardComponent } from '../../../../ui/card/card.component';
import { PaginacionComponent } from '../../../../ui/paginacion/paginacion.component';
import { PopupComponent } from '../../../../ui/popup/popup.component';
import { SelectComponent, SelectOption } from '../../../../ui/select/select.component';
import { TituloHeroComponent } from '../../../../ui/titulo-hero/titulo-hero.component';
import {
  AccionTabla,
  ColumnaTabla,
  EventoAccionTabla,
  TablaResponsiveComponent,
} from '../../../../ui/tabla-responsive/tabla-responsive.component';
import { ToastAlertService } from '../../../../ui/toast-alert/services/toast-alert.service';
import {
  FormularioUsuarioInternoComponent,
  ModoFormularioUsuarioInterno,
  ResultadoFormularioUsuarioInterno,
} from '../../forms/formulario-usuario-interno/formulario-usuario-interno.component';

export type TipoUsuarioInterno = 'recepcionista' | 'profesor';

interface FilaUsuarioInterno {
  readonly uuid: string;
  readonly nombre: string;
  readonly apellido: string;
  readonly email: string;
  readonly imageUrl?: string | null;
  readonly dni?: string | null;
  readonly fechaNacimiento: string;
  readonly telefono?: string | null;
  readonly estado?: EstadoUsuarioInterno;
}

@Component({
  selector: 'app-gestion-usuarios-internos',
  imports: [
    BotonComponent,
    CardComponent,
    FormularioUsuarioInternoComponent,
    PaginacionComponent,
    PopupComponent,
    SelectComponent,
    TablaResponsiveComponent,
    TituloHeroComponent,
  ],
  templateUrl: './gestion-usuarios-internos.component.html',
  styleUrl: './gestion-usuarios-internos.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GestionUsuariosInternosComponent {
  private readonly recepcionistasApi = inject(RecepcionistasApiService);
  private readonly profesoresApi = inject(ProfesoresApiService);
  private readonly toast = inject(ToastAlertService);

  readonly tipo = input.required<TipoUsuarioInterno>();

  protected readonly titulo = computed(() =>
    this.tipo() === 'profesor' ? 'Profesores' : 'Usuarios de recepción',
  );
  protected readonly singular = computed(() =>
    this.tipo() === 'profesor' ? 'profesor' : 'usuario de recepción',
  );
  protected readonly textoNuevo = computed(() => `Nuevo ${this.singular()}`);
  protected readonly filas = signal<readonly FilaUsuarioInterno[]>([]);
  protected readonly paginaActual = signal(1);
  protected readonly totalPaginas = signal(1);
  protected readonly busqueda = signal('');
  protected readonly estados = signal<readonly EstadoUsuarioInterno[]>(['ACTIVO']);
  protected readonly estadoSelect = computed(() => this.estados()[0] || '');
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly procesandoUuid = signal<string | null>(null);
  protected readonly error = signal('');
  protected readonly formularioVisible = signal(false);
  protected readonly modoFormulario = signal<ModoFormularioUsuarioInterno>('crear');
  protected readonly usuarioEditando = signal<FilaUsuarioInterno | null>(null);
  protected readonly tituloFormulario = computed(() =>
    this.modoFormulario() === 'editar'
      ? `Editar ${this.singular()}`
      : `Nuevo ${this.singular()}`,
  );
  protected readonly descripcionFormulario = computed(() =>
    this.modoFormulario() === 'editar'
      ? `Modificá los datos del ${this.singular()} seleccionado.`
      : `Completá los datos para dar de alta el ${this.singular()}.`,
  );
  protected readonly textoGuardar = computed(() =>
    this.modoFormulario() === 'editar'
      ? 'Guardar cambios'
      : `Crear ${this.singular()}`,
  );

  protected readonly opcionesEstado: readonly SelectOption[] = [
    { value: '', label: 'Todos los estados' },
    { value: 'ACTIVO', label: 'Activos' },
    { value: 'INACTIVO', label: 'Inactivos' },
  ];
  protected readonly columnas: readonly ColumnaTabla<FilaUsuarioInterno>[] = [
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
    { id: 'fechaNacimiento', titulo: 'Fecha de nacimiento', ancho: '10rem' },
    { id: 'email', titulo: 'Email', ancho: 'minmax(12rem, 1.4fr)' },
    { id: 'telefono', titulo: 'Teléfono', ancho: '10rem' },
    { id: 'estado', titulo: 'Estado', tipo: 'estado', ancho: '8rem' },
  ];
  protected readonly acciones: readonly AccionTabla<FilaUsuarioInterno>[] = [
    {
      predefinida: 'editar',
      deshabilitada: () => this.guardando() || !!this.procesandoUuid(),
    },
    {
      id: 'dar-baja',
      texto: 'Dar de baja',
      icono: 'heroTrash',
      color: 'var(--semantic-danger)',
      deshabilitada: (fila) =>
        (!!this.procesandoUuid() && this.procesandoUuid() !== fila.uuid) ||
        fila.estado === 'INACTIVO',
      cargando: (fila) => this.procesandoUuid() === fila.uuid,
    },
  ];

  constructor() {
    queueMicrotask(() => this.cargar());
  }

  protected actualizarBusqueda(evento: Event): void {
    this.busqueda.set((evento.target as HTMLInputElement).value);
  }

  protected cambiarEstado(valor: string): void {
    this.estados.set(valor ? [valor as EstadoUsuarioInterno] : []);
    this.paginaActual.set(1);
    this.cargar();
  }

  protected buscar(): void {
    this.paginaActual.set(1);
    this.cargar();
  }

  protected cambiarPagina(pagina: number): void {
    this.paginaActual.set(pagina);
    this.cargar();
  }

  protected abrirFormulario(): void {
    this.error.set('');
    this.modoFormulario.set('crear');
    this.usuarioEditando.set(null);
    this.formularioVisible.set(true);
  }

  protected abrirEdicion(fila: FilaUsuarioInterno): void {
    this.error.set('');
    this.modoFormulario.set('editar');
    this.usuarioEditando.set(fila);
    this.formularioVisible.set(true);
  }

  protected cerrarFormulario(): void {
    if (this.guardando()) return;

    this.formularioVisible.set(false);
    this.usuarioEditando.set(null);
    this.modoFormulario.set('crear');
    this.error.set('');
  }

  protected manejarAccion(evento: EventoAccionTabla<FilaUsuarioInterno>): void {
    if (evento.accion === 'editar') {
      this.abrirEdicion(evento.fila);
      return;
    }
    if (evento.accion === 'dar-baja') {
      this.darDeBaja(evento.fila);
    }
  }

  protected guardar(resultado: ResultadoFormularioUsuarioInterno): void {
    if (resultado.modo === 'editar') {
      this.actualizar(resultado.datos);
      return;
    }

    this.crear(resultado.datos);
  }

  private crear(payload: CrearUsuarioInternoPayload): void {
    if (this.guardando()) return;

    this.guardando.set(true);
    this.error.set('');
    const payloadCreacion: CrearUsuarioInternoPayload = {
      ...payload,
      fechaAlta: this.obtenerFechaLocalActual(),
    };
    const request: Observable<UsuarioInternoDto> =
      this.tipo() === 'profesor'
        ? this.profesoresApi.crear(payloadCreacion)
        : this.recepcionistasApi.crear(payloadCreacion);

    request.pipe(finalize(() => this.guardando.set(false))).subscribe({
      next: () => {
        this.cerrarFormularioExitoso();
        this.paginaActual.set(1);
        this.cargar();
      },
      error: () => {
        this.error.set(`No se pudo crear el ${this.singular()}.`);
      },
    });
  }

  private actualizar(payload: ActualizarUsuarioInternoPayload): void {
    const usuario = this.usuarioEditando();
    if (!usuario || this.guardando()) return;

    this.guardando.set(true);
    this.error.set('');
    const request: Observable<UsuarioInternoDto> =
      this.tipo() === 'profesor'
        ? this.profesoresApi.actualizar(usuario.uuid, payload)
        : this.recepcionistasApi.actualizar(usuario.uuid, payload);

    request.pipe(finalize(() => this.guardando.set(false))).subscribe({
      next: () => {
        this.cerrarFormularioExitoso();
        this.cargar();
      },
      error: () => this.error.set(`No se pudo actualizar el ${this.singular()}.`),
    });
  }

  protected async darDeBaja(fila: FilaUsuarioInterno): Promise<void> {
    if (this.procesandoUuid()) return;

    const confirmado = await this.toast.confirmDanger(
      `¿Dar de baja a ${fila.nombre} ${fila.apellido}? Esta acción no se puede deshacer desde la aplicación.`,
      {
        titulo: `Baja de ${this.singular()}`,
        textoConfirmar: 'Dar de baja',
      },
    );
    if (!confirmado) return;

    this.procesandoUuid.set(fila.uuid);
    const request: Observable<void> =
      this.tipo() === 'profesor'
        ? this.profesoresApi.darDeBaja(fila.uuid)
        : this.recepcionistasApi.darDeBaja(fila.uuid);

    request.pipe(finalize(() => this.procesandoUuid.set(null))).subscribe({
      next: () => this.cargar(),
      error: () => this.error.set(`No se pudo dar de baja el ${this.singular()}.`),
    });
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    const payloadBase = {
      page: this.paginaActual(),
      size: 10,
      search: this.busqueda().trim(),
    } as const;
    const request: Observable<PaginaUsuariosInternosResponse<UsuarioInternoDto>> =
      this.tipo() === 'profesor'
        ? this.profesoresApi.paginar({ ...payloadBase, estados: this.estados() })
        : this.recepcionistasApi.paginar(payloadBase);

    request.pipe(finalize(() => this.cargando.set(false))).subscribe({
      next: (respuesta) => {
        this.filas.set(respuesta.content.map((item) => this.mapearFila(item)));
        this.totalPaginas.set(Math.max(1, respuesta.totalPages));
      },
      error: () => this.error.set(`No se pudieron cargar los ${this.titulo().toLowerCase()}.`),
    });
  }

  private cerrarFormularioExitoso(): void {
    this.formularioVisible.set(false);
    this.usuarioEditando.set(null);
    this.modoFormulario.set('crear');
    this.error.set('');
  }

  private mapearFila(item: UsuarioInternoDto): FilaUsuarioInterno {
    return {
      uuid: this.esProfesor(item) ? item.profesorUuid : item.recepcionistaUuid,
      nombre: item.nombre,
      apellido: item.apellido,
      email: item.email,
      imageUrl: item.imageUrl,
      dni: item.dni,
      fechaNacimiento: formatearFechaCorta(item.fechaNacimiento),
      telefono: item.telefono,
      estado: item.estado,
    };
  }

  private esProfesor(item: UsuarioInternoDto): item is ProfesorDto {
    return 'profesorUuid' in item;
  }

  private obtenerFechaLocalActual(): string {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  }
}
