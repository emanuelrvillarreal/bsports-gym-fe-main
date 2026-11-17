import { ChangeDetectionStrategy, Component } from '@angular/core';

import { ReportesEconomicosComponent } from '../../_admin/components/reportes-economicos/reportes-economicos.component';

/** Cobros › Reportes: reportes económicos y exportación a Excel (solo ADMIN). */
@Component({
  selector: 'app-reportes-economicos-page',
  standalone: true,
  imports: [ReportesEconomicosComponent],
  template: `<app-reportes-economicos />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportesEconomicosPageComponent {}
