import { PageResponse } from './paginate.interface';

export type MedioPago =
  | 'EFECTIVO'
  | 'TRANSFERENCIA'
  | 'MERCADO_PAGO'
  | 'OTRO'
  | 'DEBITO'
  | 'DEBITO_AUTOMATICO'
  | 'CREDITO'
  | 'CHEQUE'
  | 'NFC';
export type MedioPagoManual = Exclude<MedioPago, 'MERCADO_PAGO'>;
export type EstadoCuota = 'PENDIENTE' | 'PAGADA' | 'VENCIDA' | 'ANULADA';
export type TipoCuota = 'SOCIAL' | 'ACTIVIDAD' | 'PASE';
export type OrigenCuota = 'ALTA' | 'INSCRIPCION' | 'CICLO_MENSUAL';
export type OrdenCuota = 'VENCIMIENTO_ASC' | 'VENCIMIENTO_DESC' | 'PERSONA_APELLIDO';
export type TipoMovimiento = 'INGRESO' | 'EGRESO';
export type EstadoMovimiento = 'ACTIVO' | 'ANULADO';
export type OrigenMovimiento = 'COBRO_CUOTA' | 'COBRO_RESERVA' | 'MANUAL';

export interface BalanceActualDto {
  readonly periodo?: { readonly year?: number; readonly month?: number } | string;
  readonly mes: number;
  readonly anio: number;
  readonly ingresosTotales: number;
  readonly egresosTotales: number;
  readonly porCobrar: number;
  readonly ingresosNetos: number;
  readonly ingresosEstimados: number;
}

export type BalanceResumenMesDto = BalanceActualDto;
export interface BalancePaginateRequest { readonly page: number; readonly size: number }
export type BalancePaginateResponse = PageResponse<BalanceResumenMesDto>;

export interface CuotaPaginateRequest {
  readonly page: number;
  readonly size: number;
  readonly estados?: readonly EstadoCuota[];
  readonly tipos?: readonly TipoCuota[];
  readonly search?: string;
  readonly titularMemberUuid?: string;
  readonly personaMemberUuid?: string;
  readonly orden?: OrdenCuota;
}

/** Fecha opcional para la generación manual del ciclo diario (yyyy-MM-dd). */
export interface GenerarCuotasDiariasPayload {
  readonly fecha?: string;
}

/**
 * Resultado por tipo de cuota. El backend también puede sumar métricas sin
 * romper el cliente, por eso se preservan los campos adicionales.
 */
export interface ResultadoGeneracionCuotasDto {
  readonly yearMonth: string;
  readonly cuotasGeneradas?: number;
  readonly cuotasOmitidas?: number;
  readonly [campo: string]: unknown;
}

export interface GeneracionCuotasDiariaDto {
  readonly social: ResultadoGeneracionCuotasDto;
  readonly actividad: ResultadoGeneracionCuotasDto;
}

/** Límite de fecha para la generación manual, en formato dd/MM/yyyy. */
export interface GenerarCuotasHastaPayload {
  readonly hasta: string;
}

export interface ResultadoGeneracionCuotasHastaDto {
  /** Fecha límite utilizada por la generación, en formato dd/MM/yyyy. */
  readonly hasta: string;
  readonly companiesProcessed: number;
  readonly cuotasGeneradas: number;
  readonly cuotasOmitidas: number;
}

export type CuotaActividadGeneracionResultDto = ResultadoGeneracionCuotasHastaDto;
export type CuotaSocialGeneracionResultDto = ResultadoGeneracionCuotasHastaDto;

export interface CuotaRowDto {
  readonly cuotaUuid: string;
  readonly concepto: string;
  readonly tipo: TipoCuota;
  readonly origen: OrigenCuota;
  readonly monto: number;
  /** Importe final calculado para la cuota (incluye el recargo si lo tiene). */
  readonly montoFinal?: number | null;
  /** Recargo por pago fuera de término ya incluido en montoFinal; 0 o ausente si no tiene. */
  readonly recargo?: number | null;
  readonly vencimiento: string;
  readonly estado: EstadoCuota;
  readonly diasMora: number;
  readonly personaMemberUuid: string;
  readonly personaNombre: string;
  readonly personaApellido: string;
  readonly personaEstado: string;
  readonly titularMemberUuid: string;
  readonly titularNombre: string;
  readonly titularApellido: string;
  /** Datos de contacto del titular para recordatorios de mora. */
  readonly titularEmail?: string | null;
  readonly titularTelefono?: string | null;
}

export type CuotaPaginateResponse = PageResponse<CuotaRowDto>;
export interface CuotaDetalleDto extends CuotaRowDto {
  /** Fecha en que se generó la cuota, en formato dd/MM/yyyy. */
  readonly fechaGeneracion: string;
  readonly actividadId?: number;
  readonly parentesco?: string;
  readonly anuladaPorUuid?: string;
  readonly anuladaPorNombre?: string;
  readonly anuladaPorApellido?: string;
  readonly anuladaMotivo?: string;
  readonly anuladaAt?: string;
}

export interface CuotaResumenDto {
  readonly cuotaUuid: string;
  readonly concepto: string;
  readonly tipo: TipoCuota;
  readonly monto: number;
  /** Importe final calculado para la cuota (incluye el recargo si lo tiene). */
  readonly montoFinal?: number | null;
  /** Recargo por pago fuera de término ya incluido en montoFinal; 0 o ausente si no tiene. */
  readonly recargo?: number | null;
  readonly vencimiento: string;
  /** Fecha en que se generó la cuota, en formato dd/MM/yyyy. */
  readonly fechaGeneracion: string;
  readonly estado: EstadoCuota;
}

export interface CuotaPersonaDto {
  readonly personaMemberUuid: string;
  readonly nombre: string;
  readonly apellido: string;
  readonly parentesco?: string;
  readonly estadoMember: string;
  readonly titularMemberUuid: string;
  readonly cuotas: readonly CuotaResumenDto[];
  readonly subtotalPersona: number;
  readonly subtotalDeudaPersona: number;
  readonly totalPorPagar: number;
}

export interface FiltrosCuotas {
  readonly estados?: readonly EstadoCuota[];
  readonly tipos?: readonly TipoCuota[];
  readonly soloImpagas?: boolean;
}

export interface FiltrosCuotasPortal extends FiltrosCuotas {
  readonly ultimosMeses?: number;
}

export interface CuotaGrupoTitularDto {
  readonly titularMemberUuid: string;
  readonly titularNombre: string;
  readonly titularApellido: string;
  readonly montoTotalGrupo: number;
  readonly montoDeudaGrupo: number;
  readonly totalPorPagarGrupo: number;
  readonly personas: readonly CuotaPersonaDto[];
}

export interface CobrarCuotasManualPayload {
  readonly cuotaUuids: readonly string[];
  readonly canalCobro: 'MANUAL';
  readonly medioPago: MedioPagoManual;
  readonly fecha?: string;
  readonly observaciones?: string;
}

/** Inicia Checkout Pro para las cuotas del grupo del titular logueado. */
export interface CobrarCuotasMercadoPagoPayload {
  readonly cuotaUuids: readonly string[];
  readonly canalCobro: 'MERCADO_PAGO';
  readonly medioPago: 'MERCADO_PAGO';
}

export interface CobroCuotasMercadoPagoDto {
  readonly mercadoPagoInitPoint: string;
  readonly mercadoPagoSandboxInitPoint?: string | null;
  readonly mercadoPagoPreferenceId: string;
}

export interface CobroCuotaItemResultDto {
  readonly cuotaUuid: string;
  readonly exitoso: boolean;
  readonly movimientoUuid?: string;
  readonly mensajeError?: string;
}

export interface CobroCuotaResultDto {
  readonly items: readonly CobroCuotaItemResultDto[];
  readonly exitosas: number;
  readonly fallidas: number;
}

export interface MovimientoPaginateRequest {
  readonly page: number;
  readonly size: number;
  readonly tipo?: TipoMovimiento;
  readonly fechaDesde?: string;
  readonly fechaHasta?: string;
  readonly estados?: readonly EstadoMovimiento[];
}

export interface MovimientoRowDto {
  readonly movimientoUuid: string;
  readonly tipo: TipoMovimiento;
  readonly monto: number;
  readonly fecha: string;
  readonly concepto: string;
  readonly medioPago?: MedioPago;
  readonly observaciones?: string;
  readonly estado: EstadoMovimiento;
  readonly origen: OrigenMovimiento;
  readonly cuotaUuid?: string;
  readonly reservaUuid?: string;
  readonly personaMemberUuid?: string;
  readonly personaNombre?: string;
  readonly personaApellido?: string;
  readonly titularMemberUuid?: string;
  readonly registradoPorUuid?: string;
  readonly registradoPorNombre?: string;
  readonly registradoPorApellido?: string;
}
export interface MovimientoDetalleDto extends MovimientoRowDto {
  readonly anuladaPorUuid?: string;
  readonly anuladaMotivo?: string;
  readonly anuladaAt?: string;
}
export type MovimientoPaginateResponse = PageResponse<MovimientoRowDto>;

export interface MovimientoManualPayload {
  readonly tipo: TipoMovimiento;
  readonly monto: number;
  readonly fecha?: string;
  readonly concepto: string;
  readonly medioPago?: MedioPagoManual;
  readonly observaciones?: string;
}
export interface AnularMovimientoPayload { readonly motivo: string }
export interface AnularCuotaPayload {
  readonly motivo: string;
  /** Solo cuotas de actividad: también da de baja al socio de la actividad. */
  readonly darDeBajaActividad?: boolean;
}
