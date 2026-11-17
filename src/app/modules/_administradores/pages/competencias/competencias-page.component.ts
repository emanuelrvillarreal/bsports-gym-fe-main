import { ChangeDetectionStrategy, Component } from '@angular/core';

import { GestionCompetenciasComponent } from '../../_admin/components/gestion-competencias/gestion-competencias.component';

/** Sección Competencias: equipos, planteles y torneos (solo ADMIN). */
@Component({
  selector: 'app-competencias-page',
  standalone: true,
  imports: [GestionCompetenciasComponent],
  template: `<app-gestion-competencias />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompetenciasPageComponent {}
