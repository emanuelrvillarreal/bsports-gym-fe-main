import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { HistorialEvaluacionesDto } from '../../../../core/api/interfaces/evaluaciones.interfaces';
import { EvaluacionesApiService } from '../../../../core/api/services/evaluaciones-api.service';
import { PortalSocioApiService } from '../../../../core/api/services/portal-socio-api.service';
import { HistorialEvaluacionesComponent } from '../../../_compartido-perfiles/components/evaluaciones/historial-evaluaciones/historial-evaluaciones.component';
import { BotonComponent } from '../../../ui/boton/boton.component';
import { SelectComponent, SelectOption } from '../../../ui/select/select.component';

/**
 * Portal del socio: sus evaluaciones físicas (o las de un familiar, si es titular), con la evolución.
 * Solo lectura; si el club no tiene el módulo activo la lista llega vacía.
 */
@Component({
  selector: 'app-mis-evaluaciones-portal',
  standalone: true,
  imports: [BotonComponent, HistorialEvaluacionesComponent, SelectComponent],
  template: `
    <section class="mis-evaluaciones">
      @if (opcionesSocios().length) {
        <app-select class="mis-evaluaciones__socio" etiqueta="Ver de" [opciones]="opcionesSocios()" [value]="memberUuid()" (valueChange)="elegirSocio($event)" />
      }
      @if (error()) {
        <div class="mis-evaluaciones__error" role="alert">{{ error() }} <app-boton apariencia="texto" (accion)="cargar()">Reintentar</app-boton></div>
      } @else if (cargando() && !historial()) {
        <p class="mis-evaluaciones__vacio">Cargando evaluaciones…</p>
      } @else if (historial(); as h) {
        <app-historial-evaluaciones [evaluaciones]="h.evaluaciones" />
      }
    </section>
  `,
  styles: [
    `
      :host { display: block; }
      .mis-evaluaciones { display: grid; gap: 1rem; padding: 1rem; border: 1px solid var(--app-surface-border); border-radius: .9rem; background: var(--app-surface); }
      .mis-evaluaciones__socio { max-width: 18rem; }
      .mis-evaluaciones__vacio { margin: 0; color: var(--app-text-soft); }
      .mis-evaluaciones__error { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; color: var(--semantic-danger); }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MisEvaluacionesPortalComponent {
  private readonly api = inject(EvaluacionesApiService);
  private readonly portalApi = inject(PortalSocioApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly esTitular = inject(Router).url.startsWith('/socio-titular');

  protected readonly memberUuid = signal('');
  protected readonly opcionesSocios = signal<readonly SelectOption[]>([]);
  protected readonly historial = signal<HistorialEvaluacionesDto | null>(null);
  protected readonly cargando = signal(false);
  protected readonly error = signal('');

  constructor() {
    queueMicrotask(() => {
      this.cargar();
      if (this.esTitular) this.cargarGrupo();
    });
  }

  protected elegirSocio(memberUuid: string): void {
    if ((memberUuid ?? '') === this.memberUuid()) return;
    this.memberUuid.set(memberUuid);
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.api
      .misEvaluaciones(this.memberUuid() || null)
      .pipe(
        finalize(() => this.cargando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (historial) => this.historial.set(historial),
        error: () => this.error.set('No se pudieron cargar tus evaluaciones.'),
      });
  }

  private cargarGrupo(): void {
    this.portalApi
      .obtenerGrupoFamiliar()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (grupo) => {
          const familiares = grupo.integrantes.map((i) => i.member).filter((m) => !m.titular);
          if (!familiares.length) return;
          this.opcionesSocios.set([
            { value: '', label: 'Yo' },
            ...familiares.map((m) => ({ value: m.memberUuid, label: `${m.nombre ?? ''} ${m.apellido ?? ''}`.trim() })),
          ]);
        },
      });
  }
}
