import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import { EquipoDetalleDto, JugadorDto } from '../../../../../core/api/interfaces/competencias.interfaces';
import { BotonComponent } from '../../../../ui/boton/boton.component';
import { formatearFechaAsistencia } from '../../seguimiento-asistencia/seguimiento-asistencia.helpers';
import { textoEstadoTorneo } from '../competencias.helpers';

/**
 * Ficha de un equipo: plantel actual con estadísticas, plantel histórico (bajas y pases) y torneos.
 * Si es editable muestra las acciones por jugador; quien la usa resuelve cada acción.
 */
@Component({
  selector: 'app-vista-equipo',
  standalone: true,
  imports: [BotonComponent],
  templateUrl: './vista-equipo.component.html',
  styleUrl: './vista-equipo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VistaEquipoComponent {
  readonly equipo = input.required<EquipoDetalleDto>();
  readonly editable = input(false);
  readonly editarJugador = output<JugadorDto>();
  readonly bajaJugador = output<JugadorDto>();
  readonly paseJugador = output<JugadorDto>();
  readonly verTorneo = output<string>();

  protected readonly verHistorial = signal(false);
  protected readonly entrenadores = computed(() => this.equipo().entrenadores.map((e) => e.nombre).join(', '));
  protected readonly fecha = formatearFechaAsistencia;
  protected readonly estadoTorneo = textoEstadoTorneo;
}
