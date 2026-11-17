import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import { DescuentoAsignadoDto, MemberDescuentosDto } from '../../../../core/api/interfaces/descuentos.interfaces';
import { PortalSocioApiService } from '../../../../core/api/services/portal-socio-api.service';
import { aFechaIso } from '../../../../core/api/services/seguimiento-asistencia-api.service';
import { formatearMoneda } from '../../../../helpers/moneda-formato';
import { TituloHeroComponent } from '../../../ui/titulo-hero/titulo-hero.component';
import { formatearFechaAsistencia } from '../../../_compartido-perfiles/components/seguimiento-asistencia/seguimiento-asistencia.helpers';

/** Portal "Mis descuentos": qué rebajas tiene el socio (y su grupo, si es titular), en qué y hasta cuándo. */
@Component({
  selector: 'app-mis-descuentos-page',
  standalone: true,
  imports: [TituloHeroComponent],
  templateUrl: './mis-descuentos-page.component.html',
  styleUrl: './mis-descuentos-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MisDescuentosPageComponent {
  private readonly api = inject(PortalSocioApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly personas = signal<readonly MemberDescuentosDto[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal(false);

  constructor() {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(false);
    this.api
      .misDescuentos()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cargando.set(false)),
      )
      .subscribe({
        next: (personas) => this.personas.set(personas),
        error: () => this.error.set(true),
      });
  }

  protected tieneDescuentos(p: MemberDescuentosDto): boolean {
    return p.cuotaSocial.length > 0 || p.actividades.some((a) => a.descuentos.length > 0);
  }

  protected algunoTiene(): boolean {
    return this.personas().some((p) => this.tieneDescuentos(p));
  }

  protected valor(d: DescuentoAsignadoDto): string {
    return d.tipoValor === 'PORCENTAJE' ? `${d.porcentaje ?? 0}% menos` : `${formatearMoneda(d.montoFijo ?? 0)} menos`;
  }

  protected vigencia(d: DescuentoAsignadoDto): string {
    const desde = formatearFechaAsistencia(aFechaIso(d.fechaDesde));
    const hasta = d.fechaHasta ? formatearFechaAsistencia(aFechaIso(d.fechaHasta)) : null;
    if (!d.vigente) return `Empieza el ${desde}`;
    return hasta ? `Hasta el ${hasta}` : 'Sin fecha de fin';
  }
}
