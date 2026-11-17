export interface EvaluacionesConfigDto {
  readonly habilitado: boolean;
  readonly profesoresPuedenRegistrar: boolean;
}

export interface EvaluacionesAccesoDto {
  readonly habilitado: boolean;
  readonly puedeRegistrar: boolean;
  readonly esAdmin: boolean;
  readonly config: EvaluacionesConfigDto | null;
}

/** Mediciones de una evaluación. Todas opcionales salvo la fecha; el IMC lo calcula el backend. */
export interface EvaluacionPayload {
  readonly fecha: string;
  readonly profesional?: string | null;
  readonly pesoKg?: number | null;
  readonly alturaCm?: number | null;
  readonly grasaCorporalPct?: number | null;
  readonly masaMuscularKg?: number | null;
  readonly cinturaCm?: number | null;
  readonly caderaCm?: number | null;
  readonly pechoCm?: number | null;
  readonly brazoCm?: number | null;
  readonly musloCm?: number | null;
  readonly pantorrillaCm?: number | null;
  readonly observaciones?: string | null;
  readonly recomendaciones?: string | null;
  readonly proximaEvaluacion?: string | null;
}

export interface EvaluacionDto extends EvaluacionPayload {
  readonly uuid: string;
  readonly registradaPor: string | null;
  readonly imc: number | null;
  readonly editable: boolean;
}

export interface HistorialEvaluacionesDto {
  readonly memberUuid: string;
  readonly nombre: string | null;
  readonly apellido: string | null;
  readonly dni: string | null;
  readonly puedeRegistrar: boolean;
  readonly evaluaciones: readonly EvaluacionDto[];
}

export interface SocioEvaluableDto {
  readonly memberUuid: string;
  readonly nombre: string | null;
  readonly apellido: string | null;
  readonly dni: string | null;
  readonly actividades: string | null;
  readonly cantidad: number;
  readonly ultimaEvaluacion: string | null;
  readonly proximaEvaluacion: string | null;
  readonly vencida: boolean;
}
