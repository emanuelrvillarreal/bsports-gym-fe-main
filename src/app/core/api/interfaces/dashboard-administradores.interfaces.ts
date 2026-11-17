export interface DashboardAdministradoresResumenDto {
  readonly socios: {
    readonly activos: number;
    readonly morosos: number;
    readonly inhabilitados: number;
  };
  readonly actividades: {
    readonly activas: number;
    readonly cuposDisponibles: number;
    readonly inscripciones: number;
    readonly proximosEventos: number;
  };
  readonly financiero?: {
    readonly ingresos: number;
    readonly egresos: number;
    readonly balance: number;
    readonly deudaVencida: number;
  } | null;
  readonly accesos: {
    readonly presentes: number;
  };
  readonly reservas: {
    readonly proximas: number;
  };
}
