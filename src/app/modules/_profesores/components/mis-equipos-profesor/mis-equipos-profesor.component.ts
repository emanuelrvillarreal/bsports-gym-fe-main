import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import { EquipoDetalleDto, TorneoDetalleDto } from '../../../../core/api/interfaces/competencias.interfaces';
import { CompetenciasApiService } from '../../../../core/api/services/competencias-api.service';
import { VistaEquipoComponent } from '../../../_compartido-perfiles/components/competencias/vista-equipo/vista-equipo.component';
import { VistaTorneoComponent } from '../../../_compartido-perfiles/components/competencias/vista-torneo/vista-torneo.component';
import { PopupComponent } from '../../../ui/popup/popup.component';

/** Profesor: equipos donde es entrenador, con plantel, estadísticas y torneos. Solo consulta. */
@Component({
  selector: 'app-mis-equipos-profesor',
  standalone: true,
  imports: [PopupComponent, VistaEquipoComponent, VistaTorneoComponent],
  template: `
    <section class="mis-equipos">
      @if (cargando()) {
        <p class="mis-equipos__vacio">Cargando equipos…</p>
      } @else if (!equipos().length) {
        <p class="mis-equipos__vacio">No sos entrenador de ningún equipo. Si corresponde, pedile al administrador que te asigne en Competencias.</p>
      }
      @for (e of equipos(); track e.uuid) {
        <article class="mis-equipos__equipo">
          <h3>{{ e.nombre }}</h3>
          <app-vista-equipo [equipo]="e" (verTorneo)="abrirTorneo($event)" />
        </article>
      }
    </section>
    <app-popup [abierto]="!!torneo()" [titulo]="torneo()?.nombre ?? 'Torneo'" ancho="extraGrande" textoCancelar="Cerrar" (cancelar)="torneo.set(null)">
      @if (torneo(); as t) {
        <app-vista-torneo [torneo]="t" />
      }
    </app-popup>
  `,
  styles: [
    `
      :host { display: block; }
      .mis-equipos { display: grid; gap: 1rem; }
      .mis-equipos__vacio { margin: 0; color: var(--app-text-soft); }
      .mis-equipos__equipo { display: grid; gap: .75rem; padding: 1rem; border: 1px solid var(--app-surface-border); border-radius: .9rem; background: var(--app-surface); }
      .mis-equipos__equipo h3 { margin: 0; }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MisEquiposProfesorComponent {
  private readonly api = inject(CompetenciasApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly equipos = signal<readonly EquipoDetalleDto[]>([]);
  protected readonly torneo = signal<TorneoDetalleDto | null>(null);
  protected readonly cargando = signal(true);

  constructor() {
    queueMicrotask(() =>
      this.api
        .misEquipos()
        .pipe(finalize(() => this.cargando.set(false)), takeUntilDestroyed(this.destroyRef))
        .subscribe({ next: (equipos) => this.equipos.set(equipos) }),
    );
  }

  protected abrirTorneo(uuid: string): void {
    this.api.torneoProfesor(uuid).subscribe({ next: (t) => this.torneo.set(t) });
  }
}
