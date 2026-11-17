import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';

import { grupoDeUrl, solapasVisibles } from '../../../_socios/grupos-portal';
import { SolapaNavegable } from '../../../ui/solapas/solapas.component';
import { LayoutMainComponent } from '../layout-main/layout-main.component';

/**
 * Layout del portal del socio. Arriba de cada pantalla que pertenece a un grupo del menú (por ejemplo
 * "Mis pagos") muestra las solapas de ese grupo, así el menú lateral queda corto.
 */
@Component({
  selector: 'app-layout-socios',
  imports: [LayoutMainComponent],
  templateUrl: './layout-socios.component.html',
  styleUrl: './layout-socios.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayoutSociosComponent {
  private readonly router = inject(Router);
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((evento) => evento instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );

  protected readonly solapas = computed((): readonly SolapaNavegable[] => {
    const url = this.url();
    const base = url.startsWith('/socio-familiar') ? '/socio-familiar' : '/socio-titular';
    const grupo = grupoDeUrl(url);
    if (!grupo) return [];
    const visibles = solapasVisibles(grupo, base === '/socio-titular');
    return visibles.length > 1
      ? visibles.map((s) => ({ etiqueta: s.etiqueta, icono: s.icono, ruta: `${base}/${s.segmento}`, contador: null }))
      : [];
  });
}
