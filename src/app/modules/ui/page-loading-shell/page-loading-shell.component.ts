import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { LoadSpinnerComponent } from '../load-spinner/load-spinner.component';
import { PerformanceModeService } from '../performance-mode.service';

@Component({
  selector: 'app-page-loading-shell',
  standalone: true,
  imports: [LoadSpinnerComponent],
  templateUrl: './page-loading-shell.component.html',
  styleUrl: './page-loading-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageLoadingShellComponent {
  private readonly performanceModeService = inject(PerformanceModeService);

  readonly cargando = input(false);
  readonly altoRendimiento = input<boolean | undefined>(undefined);
  readonly minHeight = input('calc(100dvh - 10rem)');
  protected readonly altoRendimientoEfectivo = computed(() => {
    const altoRendimiento = this.altoRendimiento();

    if (altoRendimiento === undefined) {
      return !this.performanceModeService.desactivado();
    }

    return altoRendimiento && !this.performanceModeService.desactivado();
  });
}
