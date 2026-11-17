import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';

import {
  CategoriaDto,
  GuardarCategoriaCommand,
} from '../../../../core/api/interfaces/categorias.interfaces';
import { CategoriasApiService } from '../../../../core/api/services/categorias-api.service';
import { CardComponent } from '../../../ui/card/card.component';
import { BotonComponent } from '../../../ui/boton/boton.component';
import { PaginacionComponent } from '../../../ui/paginacion/paginacion.component';
import { PopupComponent } from '../../../ui/popup/popup.component';
import {
  AccionTabla,
  ColumnaTabla,
  EventoAccionTabla,
  TablaResponsiveComponent,
  ValorInputTabla,
} from '../../../ui/tabla-responsive/tabla-responsive.component';
import { ToastAlertService } from '../../../ui/toast-alert/services/toast-alert.service';

const FILAS_POR_PAGINA = 5;

@Component({
  selector: 'app-gestion-categorias',
  imports: [BotonComponent, CardComponent, PaginacionComponent, PopupComponent, TablaResponsiveComponent],
  templateUrl: './gestion-categorias.component.html',
  styleUrl: './gestion-categorias.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GestionCategoriasComponent {
  private readonly api = inject(CategoriasApiService);
  private readonly toast = inject(ToastAlertService);

  protected readonly categorias = signal<readonly CategoriaDto[]>([]);
  protected readonly paginaActual = signal(1);
  protected readonly totalPaginas = signal(1);
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly error = signal('');
  protected readonly categoriaEditandoUuid = signal<string | null>(null);
  /** Popup de alta / edición. */
  protected readonly popupAbierto = signal(false);
  protected readonly nombre = signal('');
  protected readonly descripcion = signal('');
  protected readonly edadMinima = signal('');
  protected readonly edadMaxima = signal('');
  protected readonly errorPopup = signal('');

  protected readonly columnas: readonly ColumnaTabla<CategoriaDto>[] = [
    { id: 'nombre', titulo: 'Categoría', ancho: 'minmax(10rem, 1fr)' },
    { id: 'descripcion', titulo: 'Descripción', ancho: 'minmax(14rem, 1.5fr)' },
    {
      id: 'edadMinima',
      titulo: 'Edad mínima',
      tipo: 'numero',
      inputType: 'number',
      inputMode: 'numeric',
      min: 0,
      ancho: '8rem',
    },
    {
      id: 'edadMaxima',
      titulo: 'Edad máxima',
      tipo: 'numero',
      inputType: 'number',
      inputMode: 'numeric',
      min: 0,
      ancho: '8rem',
    },
  ];
  protected readonly acciones: readonly AccionTabla<CategoriaDto>[] = [
    { predefinida: 'editar', deshabilitada: () => this.guardando() },
    { predefinida: 'borrar', deshabilitada: () => this.guardando() },
  ];

  constructor() {
    this.cargar();
  }

  protected cambiarPagina(pagina: number): void {
    this.paginaActual.set(pagina);
    this.cargar();
  }

  protected manejarAccion(evento: EventoAccionTabla<CategoriaDto>): void {
    if (evento.accion === 'editar') {
      this.editar(evento.fila);
      return;
    }
    if (evento.accion === 'borrar') {
      void this.eliminar(evento.fila);
    }
  }

  protected abrirNueva(): void {
    this.categoriaEditandoUuid.set(null);
    this.nombre.set('');
    this.descripcion.set('');
    this.edadMinima.set('');
    this.edadMaxima.set('');
    this.errorPopup.set('');
    this.popupAbierto.set(true);
  }

  protected cerrarPopup(): void {
    if (this.guardando()) return;
    this.popupAbierto.set(false);
    this.categoriaEditandoUuid.set(null);
  }

  protected valor(evento: Event): string {
    return (evento.target as HTMLInputElement).value;
  }

  protected guardarPopup(): void {
    if (this.guardando()) return;
    const command = this.construirCommand({
      nombre: this.nombre(),
      descripcion: this.descripcion(),
      edadMinima: this.edadMinima(),
      edadMaxima: this.edadMaxima(),
    });
    if (!command.nombre) return this.errorPopup.set('Escribí el nombre de la categoría.');
    if (!this.esCommandValido(command)) {
      return this.errorPopup.set('Revisá las edades: no pueden ser negativas y la mínima no puede ser mayor que la máxima.');
    }
    const categoriaUuid = this.categoriaEditandoUuid();
    const request = categoriaUuid ? this.api.actualizar(categoriaUuid, command) : this.api.crear(command);
    this.guardando.set(true);
    this.errorPopup.set('');
    request.pipe(finalize(() => this.guardando.set(false))).subscribe({
      next: () => {
        this.popupAbierto.set(false);
        this.categoriaEditandoUuid.set(null);
        this.cargar();
      },
      error: () => this.errorPopup.set('No se pudo guardar la categoría. Revisá los datos e intentá nuevamente.'),
    });
  }

  private cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.api
      .paginar({ page: this.paginaActual(), size: FILAS_POR_PAGINA, search: '' })
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (pagina) => {
          this.categorias.set(pagina.content);
          this.totalPaginas.set(Math.max(1, pagina.totalPages));
        },
        error: () => this.error.set('No se pudieron cargar las categorías.'),
      });
  }

  private editar(categoria: CategoriaDto): void {
    this.categoriaEditandoUuid.set(categoria.categoriaUuid);
    this.nombre.set(categoria.nombre);
    this.descripcion.set(categoria.descripcion ?? '');
    this.edadMinima.set(categoria.edadMinima != null ? String(categoria.edadMinima) : '');
    this.edadMaxima.set(categoria.edadMaxima != null ? String(categoria.edadMaxima) : '');
    this.errorPopup.set('');
    this.error.set('');
    this.popupAbierto.set(true);
  }

  private async eliminar(categoria: CategoriaDto): Promise<void> {
    const confirmado = await this.toast.confirmDanger(
      'La categoría se dará de baja. El backend rechazará la acción si está en uso.',
      { titulo: 'Dar de baja categoría', textoConfirmar: 'Dar de baja' },
    );
    if (!confirmado) return;

    this.api.eliminar(categoria.categoriaUuid).subscribe({
      next: () => this.cargar(),
      error: () => this.error.set('No se pudo dar de baja la categoría. Puede estar en uso.'),
    });
  }

  private construirCommand(
    valores: Partial<Record<string, ValorInputTabla>>,
  ): GuardarCategoriaCommand {
    const edadMinima = this.numeroOpcional(valores['edadMinima']);
    const edadMaxima = this.numeroOpcional(valores['edadMaxima']);
    return {
      nombre: String(valores['nombre'] ?? '').trim(),
      descripcion: String(valores['descripcion'] ?? '').trim() || null,
      edadMinima,
      edadMaxima,
    };
  }

  private numeroOpcional(valor: ValorInputTabla | undefined): number | null {
    const texto = String(valor ?? '').trim();
    return texto ? Number(texto) : null;
  }

  private esCommandValido(command: GuardarCategoriaCommand): boolean {
    return (
      !!command.nombre &&
      (command.edadMinima === null ||
        (Number.isFinite(command.edadMinima) && command.edadMinima >= 0)) &&
      (command.edadMaxima === null ||
        (Number.isFinite(command.edadMaxima) &&
          command.edadMaxima >= 0 &&
          (command.edadMinima === null || command.edadMaxima >= command.edadMinima)))
    );
  }
}
