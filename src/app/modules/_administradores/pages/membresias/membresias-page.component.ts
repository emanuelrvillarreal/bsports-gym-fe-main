import { ChangeDetectionStrategy, Component } from '@angular/core';

import { GestionMembresiasComponent } from '../../_admin/components/gestion-membresias/gestion-membresias.component';

/** Sección Membresías › Membresías: indicadores, listado y Excel (solo ADMIN). */
@Component({
  selector: 'app-membresias-page',
  standalone: true,
  imports: [GestionMembresiasComponent],
  template: `<app-gestion-membresias />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MembresiasPageComponent {}
