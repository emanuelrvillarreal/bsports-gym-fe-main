import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription, finalize } from 'rxjs';

import {
  DificultadEjercicio,
  EjercicioDto,
  EjercicioPayload,
  TipoEjercicio,
} from '../../../../../core/api/interfaces/entrenamiento.interfaces';
import { EntrenamientoApiService } from '../../../../../core/api/services/entrenamiento-api.service';
import { ReproductorVideoComponent } from '../reproductor-video/reproductor-video.component';
import { BotonComponent } from '../../../../ui/boton/boton.component';
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
import { OPCIONES_DIFICULTAD, OPCIONES_TIPO, textoDificultad, textoTipo } from '../entrenamiento.helpers';

type FilaEjercicio = EjercicioDto & { readonly tipoTexto: string; readonly dificultadTexto: string };

const VACIO: EjercicioPayload = {
  nombre: '',
  descripcion: '',
  disciplina: '',
  grupoMuscular: '',
  tipo: 'FUERZA',
  dificultad: 'INICIAL',
  imagenUrl: '',
  videoUrl: '',
  indicaciones: '',
};

/**
 * Biblioteca de ejercicios del club: búsqueda, filtros y alta/edición. La comparten todos los
 * profesores; cada ejercicio lo edita quien lo cargó o un ADMIN (lo valida el backend).
 */
@Component({
  selector: 'app-biblioteca-ejercicios',
  standalone: true,
  imports: [BotonComponent, PaginacionComponent, PopupComponent, ReproductorVideoComponent, SelectComponent, TablaResponsiveComponent],
  templateUrl: './biblioteca-ejercicios.component.html',
  styleUrl: './biblioteca-ejercicios.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BibliotecaEjerciciosComponent {
  private readonly api = inject(EntrenamientoApiService);
  private readonly toast = inject(ToastAlertService);
  private readonly destroyRef = inject(DestroyRef);

  /** Avisa que la biblioteca cambió (el editor de rutinas recarga sus opciones). */
  readonly cambio = output<void>();

  protected readonly busqueda = signal('');
  protected readonly tipo = signal<TipoEjercicio | ''>('');
  protected readonly dificultad = signal<DificultadEjercicio | ''>('');
  protected readonly pagina = signal(1);
  protected readonly datos = signal<readonly EjercicioDto[]>([]);
  protected readonly totalPaginas = signal(1);
  protected readonly total = signal(0);
  protected readonly cargando = signal(false);

  protected readonly formularioAbierto = signal(false);
  protected readonly editandoUuid = signal<string | null>(null);
  protected readonly borrador = signal<EjercicioPayload>(VACIO);
  protected readonly guardando = signal(false);
  protected readonly errorFormulario = signal('');
  protected readonly detalle = signal<EjercicioDto | null>(null);

  protected readonly opcionesTipoFiltro: readonly SelectOption[] = [{ value: '', label: 'Todos los tipos' }, ...OPCIONES_TIPO];
  protected readonly opcionesDificultadFiltro: readonly SelectOption[] = [
    { value: '', label: 'Todas las dificultades' },
    ...OPCIONES_DIFICULTAD,
  ];
  protected readonly opcionesTipo = OPCIONES_TIPO;
  protected readonly opcionesDificultad = OPCIONES_DIFICULTAD;
  protected readonly tipoTexto = textoTipo;
  protected readonly dificultadTexto = textoDificultad;

  protected readonly filas = computed((): readonly FilaEjercicio[] =>
    this.datos().map((e) => ({ ...e, tipoTexto: textoTipo(e.tipo), dificultadTexto: textoDificultad(e.dificultad) })),
  );
  protected readonly columnas: readonly ColumnaTabla<FilaEjercicio>[] = [
    { id: 'nombre', titulo: 'Ejercicio', ancho: 'minmax(11rem, 1.4fr)', prioridadMobile: true },
    { id: 'disciplina', titulo: 'Disciplina', ancho: 'minmax(7rem, .8fr)' },
    { id: 'grupoMuscular', titulo: 'Trabaja', ancho: 'minmax(8rem, 1fr)' },
    { id: 'tipoTexto', titulo: 'Tipo', ancho: '8rem', prioridadMobile: true },
    { id: 'dificultadTexto', titulo: 'Dificultad', ancho: '7rem' },
  ];
  protected readonly acciones: readonly AccionTabla<FilaEjercicio>[] = [
    { predefinida: 'ver', principal: true },
    { predefinida: 'editar', visible: (f) => f.editable },
    { predefinida: 'borrar', visible: (f) => f.editable, destructiva: true },
  ];

  private consulta?: Subscription;
  private temporizador?: ReturnType<typeof setTimeout>;

  constructor() {
    queueMicrotask(() => this.consultar());
    this.destroyRef.onDestroy(() => clearTimeout(this.temporizador));
  }

  protected buscar(valor: string): void {
    this.busqueda.set(valor);
    clearTimeout(this.temporizador);
    this.temporizador = setTimeout(() => this.aplicar(), 350);
  }

  protected filtrar(campo: 'tipo' | 'dificultad', valor: string): void {
    const actual = campo === 'tipo' ? this.tipo() : this.dificultad();
    if ((valor ?? '') === actual) return;
    if (campo === 'tipo') this.tipo.set(valor as TipoEjercicio | '');
    else this.dificultad.set(valor as DificultadEjercicio | '');
    this.aplicar();
  }

  protected cambiarPagina(pagina: number): void {
    this.pagina.set(pagina);
    this.consultar();
  }

  protected manejarAccion({ accion, fila }: EventoAccionTabla<FilaEjercicio>): void {
    if (accion === 'ver') this.detalle.set(fila);
    if (accion === 'editar') this.abrirFormulario(fila);
    if (accion === 'borrar') void this.borrar(fila);
  }

  protected abrirFormulario(ejercicio?: EjercicioDto): void {
    this.detalle.set(null);
    this.editandoUuid.set(ejercicio?.uuid ?? null);
    this.borrador.set(
      ejercicio
        ? {
            nombre: ejercicio.nombre,
            descripcion: ejercicio.descripcion ?? '',
            disciplina: ejercicio.disciplina ?? '',
            grupoMuscular: ejercicio.grupoMuscular ?? '',
            tipo: ejercicio.tipo,
            dificultad: ejercicio.dificultad,
            imagenUrl: ejercicio.imagenUrl ?? '',
            videoUrl: ejercicio.videoUrl ?? '',
            indicaciones: ejercicio.indicaciones ?? '',
          }
        : VACIO,
    );
    this.errorFormulario.set('');
    this.formularioAbierto.set(true);
  }

  protected cambiar(campo: keyof EjercicioPayload, valor: string): void {
    this.borrador.update((actual) => ({ ...actual, [campo]: valor }));
  }

  protected guardar(): void {
    const datos = this.borrador();
    if (!datos.nombre.trim()) {
      this.errorFormulario.set('El nombre es obligatorio.');
      return;
    }
    const enlaceInvalido = [datos.imagenUrl, datos.videoUrl].some((url) => !!url && !/^https?:\/\//i.test(url));
    if (enlaceInvalido) {
      this.errorFormulario.set('La imagen y el video tienen que ser enlaces que empiecen con http:// o https://.');
      return;
    }
    this.guardando.set(true);
    const uuid = this.editandoUuid();
    const pedido = uuid ? this.api.editarEjercicio(uuid, datos) : this.api.crearEjercicio(datos);
    pedido.pipe(finalize(() => this.guardando.set(false))).subscribe({
      next: () => {
        this.formularioAbierto.set(false);
        this.consultar();
        this.cambio.emit();
      },
      error: () => this.errorFormulario.set('No se pudo guardar el ejercicio.'),
    });
  }

  private async borrar(ejercicio: EjercicioDto): Promise<void> {
    const confirmado = await this.toast.confirmDanger(
      `¿Eliminar "${ejercicio.nombre}" de la biblioteca? Las rutinas que ya lo usan lo conservan.`,
      { titulo: 'Eliminar ejercicio' },
    );
    if (!confirmado) return;
    this.api.borrarEjercicio(ejercicio.uuid).subscribe({
      next: () => {
        this.consultar();
        this.cambio.emit();
      },
    });
  }

  private aplicar(): void {
    this.pagina.set(1);
    this.consultar();
  }

  private consultar(): void {
    this.consulta?.unsubscribe();
    this.cargando.set(true);
    this.consulta = this.api
      .listarEjercicios({
        search: this.busqueda().trim(),
        tipo: this.tipo(),
        dificultad: this.dificultad(),
        page: this.pagina(),
        size: 20,
      })
      .pipe(
        finalize(() => this.cargando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (pagina) => {
          this.datos.set(pagina.content);
          this.total.set(pagina.totalElements);
          this.totalPaginas.set(Math.max(1, pagina.totalPages));
        },
      });
  }
}
