import { Component, HostListener, computed, input, output, signal } from '@angular/core';
import { construirPaginasConElipsis } from '../../../helpers/paginacion-elipsis.helpers';

type ItemPaginacion = number | 'ellipsis';

@Component({
  selector: 'app-paginacion',
  standalone: true,
  templateUrl: './paginacion.component.html',
  styleUrl: './paginacion.component.scss',
})
export class PaginacionComponent {
  /** P?gina actualmente seleccionada. */
  readonly paginaActual = input(1);

  /** Total de p?ginas disponibles. */
  readonly totalPaginas = input(1);

  /** Cantidad m?xima de botones num?ricos visibles. */
  readonly cantidadBotonesVisibles = input(5);

  /** Controla si se muestra el resumen de paginaci?n. */
  readonly mostrarResumen = input(true);

  /** Deshabilita la navegaci?n cuando el contenedor est? bloqueado. */
  readonly deshabilitado = input(false);
  readonly altoRendimiento = input(false);

  /** Ancho de viewport usado para adaptar la cantidad de páginas visibles. */
  private readonly anchoViewport = signal(typeof window === 'undefined' ? 1200 : window.innerWidth);

  @HostListener('window:resize')
  protected actualizarAnchoViewport(): void {
    this.anchoViewport.set(window.innerWidth);
  }

  /** Emite la p?gina seleccionada por el usuario. */
  readonly paginaCambiada = output<number>();

  /** Construye el arreglo de p?ginas con elipsis para el render. */
  protected readonly paginas = computed<readonly ItemPaginacion[]>(() =>
    construirPaginasConElipsis(
      this.totalPaginas(),
      this.paginaNormalizada(),
      (this.cantidadBotonesVisibles() === 5 || this.cantidadBotonesVisibles() === 7)
        ? this.anchoViewport() <= 540
          ? 3
          : this.anchoViewport() <= 860
            ? 4
            : this.anchoViewport() <= 1050
              ? 5
              : 7
        : this.cantidadBotonesVisibles(),
    ),
  );

  /** Determina si se puede retroceder una p?gina. */
  protected readonly puedeRetroceder = computed(() => !this.deshabilitado() && this.paginaNormalizada() > 1);

  /** Determina si se puede avanzar una p?gina. */
  protected readonly puedeAvanzar = computed(
    () => !this.deshabilitado() && this.paginaNormalizada() < Math.max(1, this.totalPaginas()),
  );

  /** Normaliza la p?gina actual al rango permitido. */
  protected paginaNormalizada(): number {
    const total = Math.max(1, this.totalPaginas());
    return Math.min(Math.max(1, this.paginaActual()), total);
  }

  /** Cambia de p?gina y notifica al componente padre. */
  protected irAPagina(pagina: number): void {
    const total = Math.max(1, this.totalPaginas());

    if (this.deshabilitado() || pagina < 1 || pagina > total || pagina === this.paginaNormalizada()) {
      return;
    }

    this.paginaCambiada.emit(pagina);
  }
}
