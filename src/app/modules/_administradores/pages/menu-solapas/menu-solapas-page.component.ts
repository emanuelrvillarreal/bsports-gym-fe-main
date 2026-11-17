import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import { MenuSolapasService } from '../../../../core/global-services/services/menu-solapas.service';
import { BotonComponent } from '../../../ui/boton/boton.component';
import { TituloHeroComponent } from '../../../ui/titulo-hero/titulo-hero.component';
import { SelectorSolapasComponent } from '../../components/selector-solapas/selector-solapas.component';

/**
 * Permite al ADMIN elegir qué solapas del panel se muestran en su club. Lo que se oculta
 * desaparece del menú y de las secciones para el ADMIN y para recepción.
 */
@Component({
  selector: 'app-menu-solapas-page',
  imports: [BotonComponent, SelectorSolapasComponent, TituloHeroComponent],
  templateUrl: './menu-solapas-page.component.html',
  styleUrl: './menu-solapas-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuSolapasPageComponent {
  private readonly menuSolapas = inject(MenuSolapasService);

  protected readonly ocultas = signal<ReadonlySet<string>>(new Set());
  protected readonly cargando = signal(true);
  protected readonly guardando = signal(false);
  private readonly guardadas = signal<ReadonlySet<string>>(new Set());

  protected readonly hayCambios = computed(() => {
    const actuales = this.ocultas();
    const guardadas = this.guardadas();
    return actuales.size !== guardadas.size || [...actuales].some((id) => !guardadas.has(id));
  });

  constructor() {
    this.menuSolapas
      .asegurarCargado()
      .pipe(takeUntilDestroyed())
      .subscribe((ocultas) => {
        this.ocultas.set(new Set(ocultas));
        this.guardadas.set(ocultas);
        this.cargando.set(false);
      });
  }

  protected mostrarTodo(): void {
    this.ocultas.set(new Set());
  }

  protected guardar(): void {
    this.guardando.set(true);
    this.menuSolapas
      .guardar([...this.ocultas()])
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe((guardadas) => {
        this.ocultas.set(new Set(guardadas));
        this.guardadas.set(guardadas);
      });
  }
}
