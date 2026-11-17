import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import {
  ActividadHorarioDto,
  DiaSemana,
} from '../../../../core/api/interfaces/actividades.interfaces';
import { formatearHoraTabla } from '../../../../helpers/tabla-hora-fin.helpers';

const ORDEN_DIAS: readonly DiaSemana[] = [
  'LUNES',
  'MARTES',
  'MIERCOLES',
  'JUEVES',
  'VIERNES',
  'SABADO',
  'DOMINGO',
];

const ETIQUETAS_DIA: Readonly<Record<DiaSemana, string>> = {
  LUNES: 'Lunes',
  MARTES: 'Martes',
  MIERCOLES: 'Miércoles',
  JUEVES: 'Jueves',
  VIERNES: 'Viernes',
  SABADO: 'Sábado',
  DOMINGO: 'Domingo',
};

interface GrupoDia {
  readonly dia: DiaSemana;
  readonly etiqueta: string;
  readonly horarios: readonly ActividadHorarioDto[];
}

/**
 * Lista los horarios de una actividad agrupados por día para que el socio (o el admin por él)
 * elija a cuáles asiste. Un horario lleno se muestra deshabilitado, salvo que ya esté elegido
 * (al cambiar horarios, el lugar propio no cuenta como ocupado por otro).
 */
@Component({
  selector: 'app-selector-horarios-actividad',
  templateUrl: './selector-horarios-actividad.component.html',
  styleUrl: './selector-horarios-actividad.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectorHorariosActividadComponent {
  readonly horarios = input.required<readonly ActividadHorarioDto[]>();
  readonly seleccionados = input<readonly string[]>([]);
  /** Horarios que el socio ya tenía antes de editar: ocupan su propio lugar. */
  readonly horariosPropios = input<readonly string[]>([]);
  readonly deshabilitado = input(false);
  readonly titulo = input('¿A qué horarios vas?');
  readonly seleccionCambiada = output<readonly string[]>();

  protected readonly grupos = computed<readonly GrupoDia[]>(() =>
    ORDEN_DIAS.map((dia) => ({
      dia,
      etiqueta: ETIQUETAS_DIA[dia],
      horarios: this.horarios()
        .filter((horario) => horario.diaSemana === dia)
        .sort((a, b) => formatearHoraTabla(a.horaInicio).localeCompare(formatearHoraTabla(b.horaInicio))),
    })).filter((grupo) => grupo.horarios.length > 0),
  );

  protected estaSeleccionado(horario: ActividadHorarioDto): boolean {
    return this.seleccionados().includes(horario.uuid);
  }

  protected estaLleno(horario: ActividadHorarioDto): boolean {
    return horario.disponibles <= 0 && !this.horariosPropios().includes(horario.uuid);
  }

  protected textoDisponibles(horario: ActividadHorarioDto): string {
    if (this.horariosPropios().includes(horario.uuid)) return 'Tu horario actual';
    if (horario.disponibles <= 0) return 'Sin lugares';
    return horario.disponibles === 1 ? 'Queda 1 lugar' : `Quedan ${horario.disponibles} lugares`;
  }

  protected franja(horario: ActividadHorarioDto): string {
    // Acepta "HH:mm:ss" o el arreglo [hh, mm] que serializa el backend.
    return `${formatearHoraTabla(horario.horaInicio)} a ${formatearHoraTabla(horario.horaFin)}`;
  }

  protected alternar(horario: ActividadHorarioDto, marcado: boolean): void {
    const actuales = this.seleccionados();
    this.seleccionCambiada.emit(
      marcado
        ? [...new Set([...actuales, horario.uuid])]
        : actuales.filter((uuid) => uuid !== horario.uuid),
    );
  }
}
