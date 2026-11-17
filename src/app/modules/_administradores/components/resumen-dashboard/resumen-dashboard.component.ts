import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { DashboardAdministradoresResumenDto } from '../../../../core/api/interfaces/dashboard-administradores.interfaces';
import { DashboardAdministradoresApiService } from '../../../../core/api/services/dashboard-administradores-api.service';
import { BotonComponent } from '../../../ui/boton/boton.component';
import { CardComponent } from '../../../ui/card/card.component';

@Component({
  selector: 'app-resumen-dashboard',
  imports: [BotonComponent, CardComponent, RouterLink],
  templateUrl: './resumen-dashboard.component.html',
  styleUrl: './resumen-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResumenDashboardComponent {
  private readonly api = inject(DashboardAdministradoresApiService);

  readonly mostrarFinanzas = input(false);
  readonly prefijoRuta = input.required<'/admin' | '/adm-recepcion'>();
  protected readonly resumen = signal<DashboardAdministradoresResumenDto | null>(null);
  protected readonly cargando = signal(false);
  protected readonly error = signal('');

  constructor() {
    queueMicrotask(() => this.cargar());
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.api
      .obtenerResumen()
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (resumen) => this.resumen.set(resumen),
        error: () =>
          this.error.set(
            'El resumen consolidado todavía no está disponible. Los accesos rápidos siguen operativos.',
          ),
      });
  }
}
