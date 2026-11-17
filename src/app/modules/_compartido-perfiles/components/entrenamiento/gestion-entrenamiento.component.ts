import { ChangeDetectionStrategy, Component, signal, viewChild } from '@angular/core';

import { BibliotecaEjerciciosComponent } from './biblioteca-ejercicios/biblioteca-ejercicios.component';
import { RutinasEntrenamientoComponent } from './rutinas-entrenamiento/rutinas-entrenamiento.component';

/**
 * Entrenamiento: rutinas y biblioteca de ejercicios. Lo usan el profesor (sus rutinas y alumnos) y
 * el ADMIN (todo el club); el backend aplica el alcance según quién consulta.
 */
@Component({
  selector: 'app-gestion-entrenamiento',
  standalone: true,
  imports: [BibliotecaEjerciciosComponent, RutinasEntrenamientoComponent],
  template: `
    <section class="entrenamiento">
      <div class="entrenamiento__vistas" role="tablist" aria-label="Entrenamiento">
        <button type="button" role="tab" [attr.aria-selected]="vista() === 'rutinas'" [class.entrenamiento__vista--activa]="vista() === 'rutinas'" (click)="vista.set('rutinas')">Rutinas</button>
        <button type="button" role="tab" [attr.aria-selected]="vista() === 'biblioteca'" [class.entrenamiento__vista--activa]="vista() === 'biblioteca'" (click)="vista.set('biblioteca')">Biblioteca de ejercicios</button>
      </div>
      <!-- Las dos vistas quedan montadas para no perder filtros al cambiar de solapa -->
      <app-rutinas-entrenamiento [hidden]="vista() !== 'rutinas'" />
      <app-biblioteca-ejercicios [hidden]="vista() !== 'biblioteca'" (cambio)="rutinas()?.recargar()" />
    </section>
  `,
  styles: [
    `
      :host { display: block; }
      .entrenamiento { display: grid; gap: 1rem; }
      .entrenamiento__vistas { display: flex; flex-wrap: wrap; gap: .25rem; border-bottom: 1px solid var(--app-surface-border); }
      .entrenamiento__vistas button {
        min-height: 2.75rem; padding: 0 1rem; border: 0; border-bottom: 3px solid transparent;
        background: transparent; color: var(--app-text-soft); font: inherit; font-weight: 600; cursor: pointer;
      }
      .entrenamiento__vistas button:focus-visible { outline: 2px solid var(--app-accent); outline-offset: -2px; }
      .entrenamiento__vista--activa { border-bottom-color: var(--app-accent) !important; color: var(--app-text) !important; }
      [hidden] { display: none !important; }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GestionEntrenamientoComponent {
  protected readonly vista = signal<'rutinas' | 'biblioteca'>('rutinas');
  protected readonly rutinas = viewChild(RutinasEntrenamientoComponent);
}
