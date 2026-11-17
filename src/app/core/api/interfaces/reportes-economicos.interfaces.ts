import { PageResponse } from './paginate.interface';

export type CategoriaMovimiento = 'CUOTA_SOCIAL' | 'CUOTA_ACTIVIDAD' | 'PASE' | 'AMENITY' | 'EVENTO' | 'MANUAL';
export type MedioPagoReporte = import('./tesoreria.interfaces').MedioPago;
export type TipoMovimientoReporte = 'INGRESO' | 'EGRESO';

/** Filtros del reporte (todos opcionales, se combinan). Fechas `yyyy-MM-dd`. El Excel usa los mismos. */
export interface ReporteEconomicoFiltros {
  readonly desde?: string | null;
  readonly hasta?: string | null;
  readonly tipo?: TipoMovimientoReporte | null;
  readonly categorias?: readonly CategoriaMovimiento[];
  readonly actividadUuid?: string | null;
  readonly socio?: string | null;
  readonly categoriaSocioUuid?: string | null;
  readonly mediosPago?: readonly MedioPagoReporte[];
  readonly estados?: readonly ('ACTIVO' | 'ANULADO')[];
  readonly concepto?: string | null;
  readonly importeMinimo?: number | null;
  readonly importeMaximo?: number | null;
  readonly page?: number;
  readonly size?: number;
}

export interface ReporteResumenDto {
  readonly totalIngresos: number;
  readonly totalEgresos: number;
  readonly balance: number;
  readonly operaciones: number;
  readonly cantidadIngresos: number;
  readonly cantidadEgresos: number;
  readonly promedioIngreso: number;
  readonly promedioEgreso: number;
  readonly cuotasSociales: number;
  readonly cuotasActividades: number;
  /** Cobros de pases y membresías. */
  readonly pases: number;
  readonly amenities: number;
  readonly eventos: number;
  readonly otrosIngresos: number;
}

export interface ReporteGrupoDto {
  readonly clave: string;
  readonly nombre: string;
  readonly ingresos: number;
  readonly egresos: number;
  readonly balance: number;
  readonly operaciones: number;
}

export interface ReporteMovimientoDto {
  readonly uuid: string;
  readonly operacion: string;
  readonly fecha: string;
  readonly tipo: string;
  readonly categoria: CategoriaMovimiento;
  readonly categoriaTexto: string;
  readonly concepto: string | null;
  readonly actividad: string | null;
  readonly socio: string | null;
  readonly dni: string | null;
  readonly categoriaSocio: string | null;
  readonly medioPago: string;
  readonly importe: number;
  readonly estado: string;
  readonly registradoPor: string | null;
  readonly observaciones: string | null;
}

export interface ReporteEconomicoDto {
  readonly resumen: ReporteResumenDto;
  readonly porCategoria: readonly ReporteGrupoDto[];
  readonly porActividad: readonly ReporteGrupoDto[];
  readonly porMedioPago: readonly ReporteGrupoDto[];
  readonly mensual: readonly ReporteGrupoDto[];
  readonly movimientos: PageResponse<ReporteMovimientoDto>;
}

export interface PeriodoComparacion {
  readonly desde: string;
  readonly hasta: string;
}

export interface TotalesComparacionDto {
  readonly desde: string;
  readonly hasta: string;
  readonly ingresos: number;
  readonly egresos: number;
  readonly balance: number;
  readonly operaciones: number;
}

export interface ComparacionPeriodosDto {
  readonly periodoA: TotalesComparacionDto;
  readonly periodoB: TotalesComparacionDto;
  readonly diferenciaIngresos: number;
  readonly diferenciaEgresos: number;
  readonly diferenciaBalance: number;
  readonly variacionIngresos: number | null;
  readonly variacionEgresos: number | null;
  readonly variacionBalance: number | null;
}

export interface ReporteCuotasFiltros {
  readonly desde?: string | null;
  readonly hasta?: string | null;
  readonly actividadUuid?: string | null;
  readonly tipo?: 'SOCIAL' | 'ACTIVIDAD' | 'PASE' | null;
}

export interface EstadoCuotasDto {
  readonly cantidad: number;
  readonly importe: number;
}

export interface ReporteCuotasDto {
  readonly generadas: EstadoCuotasDto;
  readonly pagadas: EstadoCuotasDto;
  readonly pendientes: EstadoCuotasDto;
  readonly vencidas: EstadoCuotasDto;
  readonly anuladas: EstadoCuotasDto;
  readonly descuentosAplicados: number;
  readonly recaudado: number;
  readonly cobros: number;
  readonly recaudacionMensual: readonly ReporteGrupoDto[];
  readonly recaudacionPorActividad: readonly ReporteGrupoDto[];
  readonly recaudacionPorCategoriaSocio: readonly ReporteGrupoDto[];
  readonly recaudacionPorMedioPago: readonly ReporteGrupoDto[];
}
