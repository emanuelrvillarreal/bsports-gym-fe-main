import { PageResponse } from './paginate.interface';

/** Semáforo de asistencia según los umbrales del club. */
export type NivelAsistencia = 'VERDE' | 'AMARILLO' | 'ROJO' | 'SIN_DATOS';

export type EstadoInscripcionFiltro = 'ACTIVAS' | 'TODAS';

export type OrdenSeguimiento = 'NOMBRE' | 'ASISTENCIA_ASC' | 'ASISTENCIA_DESC';

/** Filtros del seguimiento. Fechas `yyyy-MM-dd`; sin fechas el cálculo va desde cada inscripción hasta hoy. */
export interface SeguimientoAsistenciaRequest {
  readonly desde?: string | null;
  readonly hasta?: string | null;
  readonly actividadUuid?: string | null;
  /** Solo backoffice. */
  readonly profesorUuid?: string | null;
  readonly categoriaUuid?: string | null;
  readonly memberUuid?: string | null;
  readonly search?: string | null;
  readonly estadoInscripcion?: EstadoInscripcionFiltro;
  readonly nivel?: NivelAsistencia | null;
  readonly soloAlertas?: boolean;
  readonly orden?: OrdenSeguimiento;
  readonly page?: number;
  readonly size?: number;
}

export interface AsistenciaUmbralesDto {
  readonly verde: number;
  readonly amarillo: number;
  readonly porcentajeAlerta: number;
  readonly diasSinAsistencia: number;
  readonly ausenciasConsecutivas: number;
}

export interface AsistenciaAlumnoFilaDto {
  readonly inscripcionUuid: string;
  readonly memberUuid: string;
  readonly nombre: string | null;
  readonly apellido: string | null;
  readonly dni: string | null;
  readonly imageUrl: string | null;
  readonly categoria: string | null;
  readonly actividadUuid: string;
  readonly actividadNombre: string;
  readonly profesores: readonly string[];
  readonly fechaInscripcion: string;
  readonly fechaBaja: string | null;
  readonly motivoBaja: string | null;
  readonly activa: boolean;
  readonly antiguedadDias: number;
  readonly antiguedad: string;
  readonly clases: number;
  readonly presentes: number;
  readonly ausentes: number;
  readonly justificadas: number;
  readonly porcentaje: number | null;
  readonly nivel: NivelAsistencia;
  readonly ultimaAsistencia: string | null;
  readonly ausenciasConsecutivas: number;
  readonly alertas: readonly string[];
}

export interface AsistenciaMesDto {
  /** `yyyy-MM`. */
  readonly periodo: string;
  readonly clases: number;
  readonly presentes: number;
  readonly ausentes: number;
  readonly justificadas: number;
  readonly porcentaje: number | null;
}

export interface ResumenAsistenciaDto {
  readonly sociosInscriptos: number;
  readonly alumnosActivos: number;
  readonly clasesRealizadas: number;
  readonly presentes: number;
  readonly ausentes: number;
  readonly justificadas: number;
  readonly promedioAsistencia: number | null;
  readonly bajaAsistencia: number;
  readonly dejaronDeAsistir: number;
  readonly conAlertas: number;
}

export interface ActividadAsistenciaResumenDto {
  readonly actividadUuid: string;
  readonly nombre: string;
  readonly profesores: readonly string[];
  readonly inscriptos: number;
  readonly clases: number;
  readonly promedioAsistencia: number | null;
}

export interface ProfesorAsistenciaResumenDto {
  readonly profesorUuid: string;
  readonly nombre: string;
  readonly actividades: number;
  readonly alumnos: number;
  readonly promedioAsistencia: number | null;
}

export interface SeguimientoAsistenciaDto {
  readonly resumen: ResumenAsistenciaDto;
  readonly umbrales: AsistenciaUmbralesDto;
  readonly actividades: readonly ActividadAsistenciaResumenDto[];
  readonly profesores: readonly ProfesorAsistenciaResumenDto[];
  readonly evolucionMensual: readonly AsistenciaMesDto[];
  readonly alertas: readonly AsistenciaAlumnoFilaDto[];
  readonly alumnos: PageResponse<AsistenciaAlumnoFilaDto>;
}

export interface AsistenciaClaseDto {
  readonly inicio: string;
  readonly estado: 'PRESENTE' | 'AUSENTE' | 'AUSENTE_JUSTIFICADO';
}

export interface AsistenciaAlumnoDetalleDto {
  readonly alumno: AsistenciaAlumnoFilaDto;
  readonly evolucionMensual: readonly AsistenciaMesDto[];
  readonly clases: readonly AsistenciaClaseDto[];
}

export interface TrayectoriaPeriodoDto {
  readonly inscripcionUuid: string;
  readonly desde: string;
  readonly hasta: string | null;
  readonly activa: boolean;
  readonly motivoBaja: string | null;
  readonly duracion: string;
}

export interface TrayectoriaActividadDto {
  readonly actividadUuid: string;
  readonly nombre: string;
  readonly activa: boolean;
  readonly primeraInscripcion: string;
  readonly ultimaBaja: string | null;
  readonly antiguedad: string;
  readonly diasActivos: number;
  readonly tiempoActivo: string;
  readonly reinscripciones: number;
  readonly interrupciones: number;
  readonly profesores: readonly string[];
  readonly categorias: readonly string[];
  readonly clases: number;
  readonly presentes: number;
  readonly ausentes: number;
  readonly justificadas: number;
  readonly porcentaje: number | null;
  readonly nivel: NivelAsistencia;
  readonly periodos: readonly TrayectoriaPeriodoDto[];
}

export interface TrayectoriaHitoDto {
  readonly fecha: string;
  readonly tipo: 'INSCRIPCION' | 'REINCORPORACION' | 'BAJA';
  readonly actividad: string;
  readonly detalle: string;
}

export interface TrayectoriaDeportivaDto {
  readonly memberUuid: string;
  readonly nombre: string | null;
  readonly apellido: string | null;
  readonly categoriaActual: string | null;
  readonly fechaAltaClub: string | null;
  readonly antiguedadClub: string | null;
  readonly actividadesActuales: number;
  readonly actividadesAnteriores: number;
  readonly actividades: readonly TrayectoriaActividadDto[];
  readonly hitos: readonly TrayectoriaHitoDto[];
}

/** Quién consulta: define endpoints y alcance (el backend vuelve a validar). */
export type AlcanceSeguimiento = 'admin' | 'profesor' | 'socio';
