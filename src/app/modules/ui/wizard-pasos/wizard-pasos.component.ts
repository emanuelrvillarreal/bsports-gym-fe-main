import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export interface PasoWizard {
  readonly id: string;
  readonly etiqueta: string;
}

@Component({
  selector: 'app-wizard-pasos',
  standalone: true,
  templateUrl: './wizard-pasos.component.html',
  styleUrl: './wizard-pasos.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WizardPasosComponent {
  readonly pasos = input.required<readonly PasoWizard[]>();
  readonly pasoActual = input.required<string>();
  readonly etiquetaProgreso = input('Progreso');

  protected readonly indiceActual = computed(() =>
    this.pasos().findIndex((paso) => paso.id === this.pasoActual()),
  );
  protected readonly etiquetaActual = computed(() =>
    this.pasos()[this.indiceActual()]?.etiqueta ?? '',
  );
}
