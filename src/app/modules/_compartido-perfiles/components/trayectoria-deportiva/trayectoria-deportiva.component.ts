import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import {
  NivelAsistencia,
  TrayectoriaDeportivaDto,
} from '../../../../core/api/interfaces/seguimiento-asistencia.interfaces';
import { formatearFechaAsistencia, formatearPorcentaje } from '../seguimiento-asistencia/seguimiento-asistencia.helpers';

/**
 * Trayectoria deportiva del socio: actividades actuales y anteriores con su antigüedad,
 * períodos, profesores, categorías y asistencia, más una línea de tiempo de altas y bajas.
 * Solo presenta datos; quien la usa decide de dónde salen (admin, profesor o portal).
 */
@Component({
  selector: 'app-trayectoria-deportiva',
  standalone: true,
  templateUrl: './trayectoria-deportiva.component.html',
  styleUrl: './trayectoria-deportiva.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrayectoriaDeportivaComponent {
  readonly trayectoria = input.required<TrayectoriaDeportivaDto>();
  /** Oculta el encabezado con los datos del socio (por ejemplo en el portal, donde ya se ve el nombre). */
  readonly mostrarSocio = input(true);

  protected readonly actuales = computed(() => this.trayectoria().actividades.filter((a) => a.activa));
  protected readonly anteriores = computed(() => this.trayectoria().actividades.filter((a) => !a.activa));

  protected readonly fecha = formatearFechaAsistencia;
  protected readonly porcentaje = formatearPorcentaje;

  protected claseNivel(nivel: NivelAsistencia): string {
    return `trayectoria__nivel--${nivel.toLowerCase()}`;
  }

  protected textoHito(tipo: string): string {
    return tipo === 'BAJA' ? 'Baja' : tipo === 'REINCORPORACION' ? 'Reincorporación' : 'Inscripción';
  }
}
