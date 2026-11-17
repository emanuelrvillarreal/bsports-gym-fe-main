import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import { EvaluacionDto } from '../../../../../core/api/interfaces/evaluaciones.interfaces';
import { BotonComponent } from '../../../../ui/boton/boton.component';
import { GraficoBarrasComponent } from '../../../../ui/grafico-barras/grafico-barras.component';
import { formatearFechaAsistencia } from '../../seguimiento-asistencia/seguimiento-asistencia.helpers';
import {
  AVISO_NO_CLINICO,
  ClaveMetrica,
  METRICAS,
  barrasMetrica,
  formatearMedida,
  metricasConEvolucion,
  variacion,
} from '../evaluaciones.helpers';

/**
 * Historial de evaluaciones físicas de un socio: gráfico de evolución por indicador y cada evaluación
 * con sus mediciones. Solo presenta; editar y eliminar los resuelve quien lo usa.
 */
@Component({
  selector: 'app-historial-evaluaciones',
  standalone: true,
  imports: [BotonComponent, GraficoBarrasComponent],
  templateUrl: './historial-evaluaciones.component.html',
  styleUrl: './historial-evaluaciones.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistorialEvaluacionesComponent {
  /** Del más nuevo al más viejo, como las manda el backend. */
  readonly evaluaciones = input.required<readonly EvaluacionDto[]>();
  readonly editar = output<EvaluacionDto>();
  readonly eliminar = output<EvaluacionDto>();

  protected readonly aviso = AVISO_NO_CLINICO;
  protected readonly metricaElegida = signal<ClaveMetrica>('pesoKg');
  protected readonly abierta = signal<string | null>(null);

  protected readonly metricas = computed(() => metricasConEvolucion(this.evaluaciones()));
  protected readonly metrica = computed(
    () => this.metricas().find((m) => m.clave === this.metricaElegida()) ?? this.metricas()[0] ?? METRICAS[0],
  );
  protected readonly barras = computed(() => barrasMetrica(this.evaluaciones(), this.metrica()));
  protected readonly cambio = computed(() => variacion(this.evaluaciones(), this.metrica()));
  protected readonly ultima = computed(() => this.evaluaciones()[0] ?? null);

  protected readonly fecha = formatearFechaAsistencia;
  protected readonly medida = formatearMedida;
  protected readonly todas = METRICAS;

  protected alternar(uuid: string): void {
    this.abierta.update((actual) => (actual === uuid ? null : uuid));
  }

  protected valor(evaluacion: EvaluacionDto, clave: ClaveMetrica): number | null {
    const dato = evaluacion[clave];
    return dato === null || dato === undefined ? null : Number(dato);
  }
}
