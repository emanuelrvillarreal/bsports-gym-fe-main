import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { ParticipanteDto, PartidoDto, TorneoDetalleDto } from '../../../../../core/api/interfaces/competencias.interfaces';
import { BotonComponent } from '../../../../ui/boton/boton.component';
import { formatearFechaAsistencia } from '../../seguimiento-asistencia/seguimiento-asistencia.helpers';
import { agruparPorRonda, formatearFechaHora, resultadoPropio, textoEstadoPartido, textoEstadoTorneo } from '../competencias.helpers';

/** Ficha de un torneo: tabla de posiciones, partidos por fecha, goleadores y participantes. */
@Component({
  selector: 'app-vista-torneo',
  standalone: true,
  imports: [BotonComponent],
  templateUrl: './vista-torneo.component.html',
  styleUrl: './vista-torneo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VistaTorneoComponent {
  readonly torneo = input.required<TorneoDetalleDto>();
  readonly editable = input(false);
  readonly editarPartido = output<PartidoDto>();
  readonly eliminarPartido = output<PartidoDto>();
  readonly estadisticasPartido = output<PartidoDto>();
  readonly quitarParticipante = output<ParticipanteDto>();

  protected readonly rondas = computed(() => agruparPorRonda(this.torneo().partidos));

  protected readonly fecha = formatearFechaAsistencia;
  protected readonly fechaHora = formatearFechaHora;
  protected readonly estadoPartido = textoEstadoPartido;
  protected readonly estadoTorneo = textoEstadoTorneo;
  protected readonly resultado = resultadoPropio;
}
