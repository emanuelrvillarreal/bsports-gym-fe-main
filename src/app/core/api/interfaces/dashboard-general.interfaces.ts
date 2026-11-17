export interface DashboardItemDto {
  readonly clave: string | null;
  readonly nombre: string;
  readonly valor: number;
  readonly extra: number;
}

export interface DashboardMesDto {
  /** yyyy-MM. */
  readonly periodo: string;
  readonly altas: number;
  readonly bajas: number;
  readonly inscripciones: number;
  readonly ingresos: number;
  readonly egresos: number;
  readonly asistencia: number | null;
}

/** Dashboard institucional (solo ADMIN): mismos cálculos que las pantallas de detalle. */
export interface DashboardGeneralDto {
  readonly sociosActivos: number;
  readonly sociosNuevosMes: number;
  readonly sociosBajasMes: number;
  readonly sociosMorosos: number;
  readonly sociosPorCategoria: readonly DashboardItemDto[];
  readonly actividades: number;
  readonly inscriptos: number;
  readonly profesoresActivos: number;
  readonly demandaActividades: readonly DashboardItemDto[];
  readonly asistenciaPromedio: number | null;
  readonly bajaAsistencia: number;
  readonly dejaronDeAsistir: number;
  readonly equiposActivos: number;
  readonly jugadoresEnPlanteles: number;
  readonly torneosEnCurso: number;
  readonly participacionPorDisciplina: readonly DashboardItemDto[];
  readonly ingresosMes: number;
  readonly egresosMes: number;
  readonly balanceMes: number;
  readonly ingresosAnio: number;
  readonly egresosAnio: number;
  readonly deudaVencida: number;
  readonly mantenimientosVencidos: number;
  readonly evaluacionesVencidas: number;
  readonly evolucion: readonly DashboardMesDto[];
}
