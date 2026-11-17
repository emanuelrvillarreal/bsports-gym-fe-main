import { ChangeDetectionStrategy, Component } from '@angular/core';

import { GestionEntrenamientoComponent } from '../../../_compartido-perfiles/components/entrenamiento/gestion-entrenamiento.component';

/** Solapa Actividades › Entrenamiento: rutinas y biblioteca de todo el club (solo ADMIN). */
@Component({
  selector: 'app-entrenamiento-admin-page',
  standalone: true,
  imports: [GestionEntrenamientoComponent],
  template: `<app-gestion-entrenamiento />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntrenamientoAdminPageComponent {}
