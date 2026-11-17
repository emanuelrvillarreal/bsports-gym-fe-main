import { PageResponse } from './paginate.interface';

export type TipoEjercicio =
  | 'FUERZA'
  | 'RESISTENCIA'
  | 'CARDIO'
  | 'VELOCIDAD'
  | 'TECNICA'
  | 'TACTICA'
  | 'FLEXIBILIDAD'
  | 'COORDINACION'
  | 'OTRO';
export type DificultadEjercicio = 'INICIAL' | 'INTERMEDIO' | 'AVANZADO';
export type EstadoRutina = 'ACTIVA' | 'ARCHIVADA' | 'REEMPLAZADA';
export type EstadoAsignacionRutina = 'ACTIVA' | 'FINALIZADA';

export interface EjercicioPayload {
  readonly nombre: string;
  readonly descripcion?: string | null;
  readonly disciplina?: string | null;
  readonly grupoMuscular?: string | null;
  readonly tipo: TipoEjercicio;
  readonly dificultad: DificultadEjercicio;
  readonly imagenUrl?: string | null;
  readonly videoUrl?: string | null;
  readonly indicaciones?: string | null;
}

export interface EjercicioDto extends EjercicioPayload {
  readonly uuid: string;
  readonly creadoPor: string | null;
  readonly editable: boolean;
}

export interface FiltrosEjercicios {
  readonly search?: string;
  readonly disciplina?: string;
  readonly tipo?: TipoEjercicio | '';
  readonly dificultad?: DificultadEjercicio | '';
  readonly page?: number;
  readonly size?: number;
}

export interface ItemRutinaPayload {
  readonly ejercicioUuid: string;
  readonly series?: number | null;
  readonly repeticiones?: string | null;
  readonly carga?: string | null;
  readonly descansoSegundos?: number | null;
  readonly observaciones?: string | null;
}

export interface DiaRutinaPayload {
  readonly nombre: string;
  readonly items: readonly ItemRutinaPayload[];
}

export interface RutinaPayload {
  readonly nombre: string;
  readonly objetivo?: string | null;
  readonly disciplina?: string | null;
  readonly actividadUuid?: string | null;
  readonly profesorUuid?: string | null;
  readonly fechaInicio?: string | null;
  readonly fechaFin?: string | null;
  readonly observaciones?: string | null;
  readonly dias: readonly DiaRutinaPayload[];
  readonly memberUuids?: readonly string[];
}

export interface AsignarRutinaPayload {
  readonly memberUuids: readonly string[];
  readonly fechaInicio?: string | null;
  readonly fechaFin?: string | null;
  readonly observaciones?: string | null;
}

export interface SeguimientoRutinaPayload {
  readonly fecha: string;
  readonly itemUuids: readonly string[];
  readonly esfuerzo?: number | null;
  readonly observaciones?: string | null;
}

export interface FilaRutinaDto {
  readonly uuid: string;
  readonly nombre: string;
  readonly disciplina: string | null;
  readonly actividad: string | null;
  readonly profesor: string | null;
  readonly estado: EstadoRutina;
  readonly fechaInicio: string | null;
  readonly fechaFin: string | null;
  readonly dias: number;
  readonly ejercicios: number;
  readonly asignacionesActivas: number;
  readonly actualizada: string | null;
}

export interface EjercicioResumenDto {
  readonly uuid: string;
  readonly nombre: string;
  readonly tipo: TipoEjercicio;
  readonly dificultad: DificultadEjercicio;
  readonly grupoMuscular: string | null;
  readonly imagenUrl: string | null;
  readonly videoUrl: string | null;
  readonly indicaciones: string | null;
}

export interface ItemRutinaDto {
  readonly uuid: string;
  readonly orden: number;
  readonly ejercicio: EjercicioResumenDto;
  readonly series: number | null;
  readonly repeticiones: string | null;
  readonly carga: string | null;
  readonly descansoSegundos: number | null;
  readonly observaciones: string | null;
}

export interface DiaRutinaDto {
  readonly uuid: string;
  readonly orden: number;
  readonly nombre: string;
  readonly items: readonly ItemRutinaDto[];
}

export interface SeguimientoRutinaDto {
  readonly uuid: string;
  readonly fecha: string;
  readonly esfuerzo: number | null;
  readonly observaciones: string | null;
  readonly registradoPor: string | null;
  readonly itemUuids: readonly string[];
}

export interface AsignacionRutinaDto {
  readonly uuid: string;
  readonly rutinaUuid: string;
  readonly rutinaNombre: string;
  readonly memberUuid: string;
  readonly socio: string | null;
  readonly dni: string | null;
  readonly estado: EstadoAsignacionRutina;
  readonly fechaAsignacion: string;
  readonly fechaInicio: string | null;
  readonly fechaFin: string | null;
  readonly fechaFinalizacion: string | null;
  readonly observaciones: string | null;
  readonly asignadaPor: string | null;
  readonly sesiones: number;
  readonly ultimaSesion: string | null;
  readonly seguimientos: readonly SeguimientoRutinaDto[];
}

export interface HistorialRutinaDto {
  readonly fecha: string;
  readonly accion: string;
  readonly detalle: string | null;
  readonly usuario: string | null;
}

export interface RutinaDetalleDto {
  readonly uuid: string;
  readonly nombre: string;
  readonly objetivo: string | null;
  readonly disciplina: string | null;
  readonly actividadUuid: string | null;
  readonly actividad: string | null;
  readonly profesorUuid: string | null;
  readonly profesor: string | null;
  readonly estado: EstadoRutina;
  readonly fechaInicio: string | null;
  readonly fechaFin: string | null;
  readonly observaciones: string | null;
  readonly reemplazaAUuid: string | null;
  readonly reemplazaANombre: string | null;
  readonly editable: boolean;
  readonly dias: readonly DiaRutinaDto[];
  readonly asignaciones: readonly AsignacionRutinaDto[];
  readonly historial: readonly HistorialRutinaDto[];
}

export interface AlumnoAsignableDto {
  readonly memberUuid: string;
  readonly nombre: string | null;
  readonly apellido: string | null;
  readonly dni: string | null;
  readonly actividades: string | null;
}

export interface RutinaPortalDto {
  readonly asignacion: AsignacionRutinaDto;
  readonly rutina: RutinaDetalleDto;
}

export type PaginaEjercicios = PageResponse<EjercicioDto>;
export type PaginaRutinas = PageResponse<FilaRutinaDto>;
