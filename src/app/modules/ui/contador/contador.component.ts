import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { catchError, map, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgIcon } from '@ng-icons/core';

import { AccesosClubApiService } from '../../../core/api/services/accesos-club-api.service';
import { AuthService } from '../../../core/global-services/services/auth.service';
import { PresenciasClubActualizacionService } from '../../../core/global-services/services/presencias-club-actualizacion.service';

type EstadoContador = 'sin-presentes' | 'bajo' | 'medio' | 'alto';

const ROLES_PERMITIDOS = new Set(['ADMIN', 'ADM_RECEPCION']);

/**
 * Muestra la cantidad de personas actualmente presentes en el club.
 * Solo consulta el endpoint dentro de los contextos ADMIN y ADM_RECEPCION.
 */
@Component({
  selector: 'app-contador',
  imports: [NgIcon],
  templateUrl: './contador.component.html',
  styleUrl: './contador.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContadorComponent {
  private readonly accesosApi = inject(AccesosClubApiService);
  private readonly authService = inject(AuthService);
  private readonly actualizacionesPresentes = inject(PresenciasClubActualizacionService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly cantidad = signal(0);
  protected readonly visible = computed(() =>
    ROLES_PERMITIDOS.has(this.authService.obtenerRolUsuario() ?? ''),
  );
  protected readonly estado = computed<EstadoContador>(() => {
    const cantidad = this.cantidad();
    if (cantidad === 0) return 'sin-presentes';
    if (cantidad <= 5) return 'bajo';
    if (cantidad <= 9) return 'medio';
    return 'alto';
  });

  constructor() {
    if (!this.visible()) return;

    this.actualizacionesPresentes.actualizaciones$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.actualizarDesdeSnapshot());

    this.accesosApi
      .observarEnVivo()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ presenteCount }) => this.cantidad.set(this.normalizarCantidad(presenteCount)),
        // El snapshot inicial y la invalidacion local mantienen el contador operativo.
        error: () => undefined,
      });

    this.actualizarDesdeSnapshot();
  }

  private actualizarDesdeSnapshot(): void {
    this.obtenerCantidadPresentes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((cantidad) => this.cantidad.set(cantidad));
  }

  private obtenerCantidadPresentes() {
    return this.accesosApi.listarPresentes().pipe(
      // El contador es informativo: ante un fallo conserva el último valor conocido.
      catchError(() => of({ presentes: [], count: this.cantidad() })),
      map((respuesta) => this.normalizarCantidad(respuesta.count)),
    );
  }

  private normalizarCantidad(valor: number): number {
    return typeof valor === 'number' && Number.isFinite(valor) && valor >= 0
      ? Math.floor(valor)
      : 0;
  }
}
