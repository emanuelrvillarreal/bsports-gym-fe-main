import { ChangeDetectionStrategy, Component } from '@angular/core';

import { GestionEquipamientoComponent } from '../../_admin/components/gestion-equipamiento/gestion-equipamiento.component';

/** Sección Equipamiento: inventario deportivo y mantenimientos (solo ADMIN). */
@Component({
  selector: 'app-equipamiento-page',
  standalone: true,
  imports: [GestionEquipamientoComponent],
  template: `<app-gestion-equipamiento />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipamientoPageComponent {}
