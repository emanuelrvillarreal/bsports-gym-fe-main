import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { CardComponent } from '../card/card.component';
import { PerformanceModeService } from '../performance-mode.service';
import { BotonComponent } from '../boton/boton.component';

@Component({
  selector: 'app-alto-rendimiento',
  standalone: true,
  imports: [BotonComponent, CardComponent],
  templateUrl: './alto-rendimiento.component.html',
  styleUrl: './alto-rendimiento.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AltoRendimientoComponent {
  private readonly performanceModeService = inject(PerformanceModeService);

  protected readonly altoRendimiento = computed(() => !this.performanceModeService.desactivado());
  protected readonly efectosVisualesActivos = computed(() =>
    this.performanceModeService.desactivado(),
  );

  protected alternarDesactivado(): void {
    this.performanceModeService.establecerDesactivado(!this.performanceModeService.desactivado());
  }
}
