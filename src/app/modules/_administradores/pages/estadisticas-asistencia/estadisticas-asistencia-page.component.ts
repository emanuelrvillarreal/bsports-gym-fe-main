import { ChangeDetectionStrategy, Component } from '@angular/core';

import { SeguimientoAsistenciaComponent } from '../../../_compartido-perfiles/components/seguimiento-asistencia/seguimiento-asistencia.component';

/** Solapa Actividades › Asistencia: estadísticas institucionales de asistencia (solo ADMIN). */
@Component({
  selector: 'app-estadisticas-asistencia-page',
  standalone: true,
  imports: [SeguimientoAsistenciaComponent],
  template: `<app-seguimiento-asistencia alcance="admin" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EstadisticasAsistenciaPageComponent {}
