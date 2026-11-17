import { SituacionCertificado } from './certificados-medicos.interfaces';
import { RecargoTipo } from './empresa.interfaces';
import { PageResponse } from './paginate.interface';
import { CategoriaDto } from './categorias.interfaces';
import { AsignarDescuentoPayload } from './descuentos.interfaces';
import { PeriodicidadCuota } from './periodicidad-cuota.interfaces';

export type DiaSemana =
  | 'LUNES'
  | 'MARTES'
  | 'MIERCOLES'
  | 'JUEVES'
  | 'VIERNES'
  | 'SABADO'
  | 'DOMINGO';

/** Franja semanal de una actividad con su cupo; el socio elige uno o varios al inscribirse. */
export interface ActividadHorarioDto {
  readonly uuid: string;
  readonly diaSemana: DiaSemana;
  readonly horaInicio: string;
  readonly horaFin: string;
  readonly cupoMaximo: number;
  readonly inscriptos: number;
  readonly disponibles: number;
}

/** Horario enviado al guardar una actividad: sin `uuid` se crea; con `uuid` se actualiza. */
export interface ActividadHorarioPayload {
  readonly uuid?: string | null;
  readonly diaSemana: DiaSemana;
  readonly horaInicio: string;
  readonly horaFin: string;
  readonly cupoMaximo: number;
}

export interface ProfesorActividadDto {
  readonly profesorUuid: string;
  readonly estado?: string | null;
  readonly fechaAlta?: string | null;
  readonly nombre: string;
  readonly apellido: string;
  readonly dni?: string | null;
  readonly telefono?: string | null;
  readonly email?: string | null;
  readonly imageUrl?: string | null;
}

export interface ActividadBaseDto {
  readonly actividadUuid: string;
  readonly nombre: string;
  readonly ubicacion: string;
  readonly cupoMaximo: number;
  readonly diasSemana: string;
  readonly horaInicio: string;
  readonly horaFin: string;
  readonly importeCuota: number;
  /** Solo en la respuesta de una edición que pidió actualizar cuotas pendientes. */
  readonly cuotasPendientesActualizadas?: number;
  readonly cuotasPendientesOmitidas?: number;
  readonly periodicidadCuota?: PeriodicidadCuota;
  readonly diasVencimientoCuota?: number;
  /** Día del mes (1 a 28) en que vencen las cuotas; null si vencen N días después de generadas. */
  readonly diaVencimientoFijo?: number | null;
  /** Con día fijo: quien se inscribe después de este día no paga el mes en curso. */
  readonly diaCorteInscripcion?: number | null;
  /** La actividad exige certificado médico vigente para inscribirse y para tomar asistencia. */
  readonly requiereCertificado?: boolean;
  /** Recargo por pago fuera de término de las cuotas de esta actividad. */
  readonly recargoHabilitado?: boolean | null;
  readonly recargoTipo?: RecargoTipo | null;
  readonly recargoValor?: number | null;
  readonly recargoDiasGracia?: number | null;
  readonly completa: boolean;
  /**
   * Franjas de la actividad. `diasSemana`, `horaInicio`, `horaFin` y `cupoMaximo` quedan como
   * resumen (días, primera hora, última hora y cupo total).
   */
  readonly horarios?: readonly ActividadHorarioDto[] | null;
}

export interface ActividadInscriptoDto {
  readonly inscripcionUuid?: string | null;
  /** Horarios de la actividad que eligió el inscripto. */
  readonly horarioUuids?: readonly string[] | null;
  /** UUID de membresía usado por operaciones administrativas, cuando está disponible. */
  readonly memberUuid?: string | null;
  /** UUID del usuario asociado, presente en algunas respuestas de detalle. */
  readonly userUuid?: string | null;
  readonly nombre: string;
  readonly apellido: string;
  readonly imageUrl?: string | null;
  readonly email: string;
  readonly dni: string;
  /** UUID del titular responsable cuando el inscripto pertenece a un grupo familiar. */
  readonly titularMemberUuid?: string | null;
  /** Fecha de nacimiento provista por el detalle de la actividad. */
  readonly fechaNacimiento?: string | null;
  /** Solo si la actividad exige certificado médico. */
  readonly certificadoSituacion?: SituacionCertificado | null;
}

export interface ActividadDto extends ActividadBaseDto {
  readonly profesores: readonly ProfesorActividadDto[];
  readonly categoriaUuids?: readonly string[] | null;
  readonly categorias?: readonly CategoriaDto[] | null;
  /** Campo anterior, mantenido para respuestas que todavía entregan una sola categoría. */
  readonly categoria?: CategoriaDto | null;
  readonly inscriptos: readonly ActividadInscriptoDto[];
}

export interface ActividadPaginateDto extends ActividadBaseDto {
  readonly categoriaNombres?: readonly string[] | null;
  readonly categoriaUuids?: readonly string[] | null;
  readonly categoria?: readonly (CategoriaDto | string)[] | null;
  readonly categorias?: readonly (CategoriaDto | string)[] | null;
  /** Campo anterior de paginación, mantenido por compatibilidad. */
  readonly categoriaNombre?: string | null;
  readonly cantidadInscriptos: number;
}

export interface PaginarActividadesPayload {
  readonly page: number;
  readonly size: number;
  readonly search: string;
  readonly completa: boolean | null;
}

export interface GuardarActividadPayload {
  readonly nombre: string;
  readonly ubicacion: string;
  readonly horarios: readonly ActividadHorarioPayload[];
  readonly importeCuota: number;
  readonly periodicidadCuota?: PeriodicidadCuota;
  readonly diasVencimientoCuota?: number;
  /** Se envía siempre: un número fija el día del mes; null vuelve a "N días después de generada". */
  readonly diaVencimientoFijo: number | null;
  readonly diaCorteInscripcion: number | null;
  readonly requiereCertificado?: boolean;
  readonly recargoHabilitado?: boolean;
  readonly recargoTipo?: RecargoTipo;
  readonly recargoValor?: number;
  readonly recargoDiasGracia?: number;
  readonly profesorUuids?: readonly string[];
  readonly categoriaUuids: readonly string[];
  /** Solo al editar con importe distinto: true también actualiza las cuotas impagas ya generadas. */
  readonly aplicarImporteACuotasPendientes?: boolean;
}

export interface InscripcionActividadPayload {
  readonly memberUuid: string;
  /** Horarios elegidos; al menos uno al inscribir. */
  readonly horarioUuids?: readonly string[] | null;
  /** Asignaciones recurrentes opcionales que se guardan antes de generar la primera cuota. */
  readonly descuentos?: readonly AsignarDescuentoPayload[] | null;
}

export interface InscripcionActividadResponse {
  readonly inscripcionUuid: string;
  readonly actividadCompleta: boolean;
  readonly cuotaGenerada: boolean;
  readonly cuotaUuid?: string | null;
  readonly cuotaAdvertencia?: string | null;
}

/**
 * Inscripción self-service desde el portal del socio titular.
 * `memberUuid` nulo representa al titular de la sesión; un UUID, a un familiar de su grupo.
 */
export interface PortalInscripcionActividadPayload {
  readonly actividadUuid: string;
  readonly memberUuid: string | null;
  /** Horarios elegidos; obligatorio al inscribirse y al cambiar horarios. */
  readonly horarioUuids?: readonly string[] | null;
}

/** Respuesta de la inscripción self-service resuelta por la sesión del socio titular. */
export interface PortalInscripcionActividadResponse {
  readonly inscripcionUuid: string;
  readonly actividadUuid: string;
  readonly actividadNombre: string;
  readonly memberUuid: string;
  readonly memberNombre: string;
  readonly memberApellido: string;
  readonly fechaInscripcion: string;
  readonly actividadCompleta: boolean;
  readonly cuotaGenerada: boolean;
  readonly cuotaUuid: string | null;
  readonly cuotaAdvertencia: string | null;
  /** Horarios que eligió el socio en esta actividad. */
  readonly horarioUuids?: readonly string[] | null;
  /** Todos los horarios de la actividad con su cupo actual, para mostrar o cambiar la elección. */
  readonly horarios?: readonly ActividadHorarioDto[] | null;
}

/**
 * Listado GET de inscripciones vigentes del portal. Reutiliza la forma del alta;
 * `cuotaGenerada`, `cuotaUuid` y `cuotaAdvertencia` llegan vacíos y no se muestran.
 */
export type PortalInscripcionActividadDto = PortalInscripcionActividadResponse;

export type PaginaActividadesResponse = PageResponse<ActividadPaginateDto>;

export interface InscripcionActividadRowDto {
  readonly inscripcionUuid: string;
  readonly memberUuid: string;
  readonly nombre: string;
  readonly apellido: string;
  readonly estado: string;
  readonly categoria?: string | null;
  readonly fechaInscripcion?: string | null;
}

export interface PaginarInscripcionesActividadCommand {
  readonly page: number;
  readonly size: number;
  readonly search: string;
}

export type PaginaInscripcionesActividadDto = PageResponse<InscripcionActividadRowDto>;

export interface ConsentimientoMenorCommand {
  readonly memberUuid: string;
  readonly responsableMemberUuid: string;
  readonly aceptado: boolean;
  readonly observaciones?: string | null;
}

export interface EventoActividadCommand {
  readonly actividadUuid: string;
  readonly titulo: string;
  readonly descripcion: string;
  readonly ubicacion: string;
  readonly inicio: string;
  readonly fin: string;
}

export interface EventoActividadDto extends EventoActividadCommand {
  readonly uuid: string;
  readonly actividadNombre: string;
  readonly estado: 'CONFIRMADO' | 'PENDIENTE' | 'CANCELADO';
  readonly participantes?: number;
}

export interface PaginarEventosActividadPayload {
  readonly page: number;
  readonly size: number;
  readonly search: string;
  readonly actividadUuid: string | null;
}

export type PaginaEventosActividadDto = PageResponse<EventoActividadDto>;

export interface AsistenciaActividadRowDto {
  readonly asistenciaUuid?: string;
  readonly slotUuid: string;
  readonly actividadUuid: string;
  readonly actividadNombre?: string;
  readonly memberUuid: string;
  readonly memberNombre?: string;
  readonly fecha: string;
  /** Compatibilidad con la respuesta histórica del endpoint. */
  readonly presente?: boolean | null;
  /** Estado explícito devuelto por el portal cuando está disponible. */
  readonly estado?: EstadoAsistenciaProfesor | null;
}

export interface PaginarAsistenciasActividadCommand {
  readonly page: number;
  readonly size: number;
  readonly actividadUuid?: string | null;
  readonly memberUuid?: string | null;
  readonly fechaDesde?: string | null;
  readonly fechaHasta?: string | null;
}

/** Filtros del historial disponible para el profesor autenticado. */
export interface PaginarAsistenciasProfesorPayload {
  readonly page: number;
  readonly size: number;
  readonly actividadUuid: string;
  readonly memberUuid?: string | null;
  readonly fechaDesde?: string | null;
  readonly fechaHasta?: string | null;
}

export type PaginaAsistenciasActividadDto = PageResponse<AsistenciaActividadRowDto>;

export type EstadoAsistenciaProfesor = 'PRESENTE' | 'AUSENTE' | 'AUSENTE_JUSTIFICADO';

export interface AsistenciaProfesorItemDto {
  readonly memberUuid: string;
  readonly nombre: string;
  readonly apellido: string;
  readonly estado: EstadoAsistenciaProfesor | null;
}

export interface AlumnoPlanillaAsistenciaProfesorDto {
  readonly memberUuid: string;
  readonly memberNombre: string;
  readonly memberApellido: string;
  readonly fechaInscripcion: string;
  readonly estado: EstadoAsistenciaProfesor | null;
}

export interface PlanillaAsistenciaProfesorDto {
  readonly slotUuid: string;
  readonly actividadUuid: string;
  readonly actividadNombre: string;
  readonly fecha: string;
  readonly inicio: string;
  readonly fin: string;
  readonly alumnos: readonly AlumnoPlanillaAsistenciaProfesorDto[];
}

export interface GuardarAsistenciaProfesorItemPayload {
  readonly memberUuid: string;
  readonly estado: EstadoAsistenciaProfesor;
}

export interface GuardarAsistenciaProfesorPayload {
  readonly items: readonly GuardarAsistenciaProfesorItemPayload[];
}
