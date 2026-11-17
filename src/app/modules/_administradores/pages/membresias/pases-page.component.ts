import { ChangeDetectionStrategy, Component } from '@angular/core';

import { GestionPasesComponent } from '../../_admin/components/gestion-pases/gestion-pases.component';

/** Sección Membresías › Pases: oferta de pases del club (solo ADMIN). */
@Component({
  selector: 'app-pases-page',
  standalone: true,
  imports: [GestionPasesComponent],
  template: `<app-gestion-pases />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasesPageComponent {}
