import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { RutinaPortalDto } from '../../../../core/api/interfaces/entrenamiento.interfaces';
import { EntrenamientoApiService } from '../../../../core/api/services/entrenamiento-api.service';
import { PortalSocioApiService } from '../../../../core/api/services/portal-socio-api.service';
import { prescripcion, textoTipo } from '../../../_compartido-perfiles/components/entrenamiento/entrenamiento.helpers';
import { formatearFechaAsistencia } from '../../../_compartido-perfiles/components/seguimiento-asistencia/seguimiento-asistencia.helpers';
import { ReproductorVideoComponent } from '../../../_compartido-perfiles/components/entrenamiento/reproductor-video/reproductor-video.component';
import { BotonComponent } from '../../../ui/boton/boton.component';
import { SelectComponent, SelectOption } from '../../../ui/select/select.component';

/**
 * Portal del socio: rutinas asignadas (activas con todo el plan, y el historial). El titular puede
 * ver las de un familiar de su grupo; el backend valida que sea de su grupo. Solo lectura.
 */
@Component({
  selector: 'app-mis-entrenamientos-portal',
  standalone: true,
  imports: [BotonComponent, ReproductorVideoComponent, SelectComponent],
  templateUrl: './mis-entrenamientos-portal.component.html',
  styleUrl: './mis-entrenamientos-portal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MisEntrenamientosPortalComponent {
  private readonly api = inject(EntrenamientoApiService);
  private readonly portalApi = inject(PortalSocioApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly esTitular = inject(Router).url.startsWith('/socio-titular');

  protected readonly memberUuid = signal('');
  protected readonly opcionesSocios = signal<readonly SelectOption[]>([]);
  protected readonly rutinas = signal<readonly RutinaPortalDto[]>([]);
  protected readonly cargando = signal(false);
  protected readonly error = signal('');
  /** Rutina del historial que se está mirando. */
  protected readonly abierta = signal<string | null>(null);

  protected readonly activas = computed(() => this.rutinas().filter((r) => r.asignacion.estado === 'ACTIVA'));
  protected readonly anteriores = computed(() => this.rutinas().filter((r) => r.asignacion.estado !== 'ACTIVA'));

  protected readonly fecha = formatearFechaAsistencia;
  protected readonly prescripcion = prescripcion;
  protected readonly tipo = textoTipo;

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

  protected alternar(uuid: string): void {
    this.abierta.update((actual) => (actual === uuid ? null : uuid));
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.api
      .misRutinas(this.memberUuid() || null)
      .pipe(
        finalize(() => this.cargando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (rutinas) => this.rutinas.set(rutinas),
        error: () => this.error.set('No se pudieron cargar tus entrenamientos.'),
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
