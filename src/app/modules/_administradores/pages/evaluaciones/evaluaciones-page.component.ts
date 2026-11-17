import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EvaluacionesFisicasComponent } from '../../../_compartido-perfiles/components/evaluaciones/evaluaciones-fisicas.component';

/** Solapa Socios › Evaluaciones físicas (solo ADMIN): activación del módulo y registro. */
@Component({
  selector: 'app-evaluaciones-admin-page',
  standalone: true,
  imports: [EvaluacionesFisicasComponent],
  template: `<app-evaluaciones-fisicas />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EvaluacionesAdminPageComponent {}
