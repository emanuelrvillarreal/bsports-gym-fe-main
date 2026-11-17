import { PageResponse } from './paginate.interface';

export type DiaSemana =
  | 'LUNES'
  | 'MARTES'
  | 'MIERCOLES'
  | 'JUEVES'
  | 'VIERNES'
  | 'SABADO'
  | 'DOMINGO';

export interface AmenityDto {
  readonly amenityUuid: string;
  readonly nombre: string;
  readonly montoHora: number;
  readonly porcentajeSena: number;
  readonly diasSemana: string;
  readonly horaInicio: string;
  readonly horaFin: string;
}

export interface GuardarAmenityCommand {
  readonly nombre: string;
  readonly montoHora: number;
  readonly porcentajeSena: number;
  readonly diasSemana: string;
  readonly horaInicio: string;
  readonly horaFin: string;
}

export type EstadoReservaAmenity =
  | 'PENDIENTE_SENA'
  | 'CONFIRMADA'
  | 'CANCELADA'
  | 'VENCIDA';

export interface ReservaAmenityDto {
  readonly reservaUuid: string;
  readonly amenityUuid: string;
  readonly amenityNombre?: string;
  readonly memberUuid: string;
  readonly memberNombre?: string;
  readonly memberApellido?: string;
  readonly inicio: string;
  readonly fin: string;
  readonly slotInicio?: string;
  readonly slotFin?: string;
  readonly slotEstado?: string;
  readonly venceSenaAt?: string;
  readonly canceladaAt?: string;
  readonly canceladaPorUuid?: string;
  readonly estado: EstadoReservaAmenity;
  readonly montoTotal: number;
  readonly montoSena: number;
  readonly saldoPendiente: number;
}

export interface CrearReservaAmenityCommand {
  readonly amenityUuid: string;
  readonly memberUuid: string;
  readonly inicio: string;
  readonly fin: string;
}

export interface PaginarReservasAmenityCommand {
  readonly page: number;
  readonly size: number;
  readonly search: string;
  readonly estados: readonly EstadoReservaAmenity[];
  readonly amenityUuid?: string | null;
  readonly memberUuid?: string | null;
  readonly slotDesde?: string | null;
  readonly slotHasta?: string | null;
}

/** Request acotado de las reservas del socio titular autenticado. */
export interface PaginarMisReservasAmenityCommand {
  readonly page: number;
  readonly size: number;
}

/** Reserva y genera el checkout de Mercado Pago para el titular autenticado. */
export interface ReservarAmenityPortalCommand {
  readonly fechaDesde: string;
  readonly fechaHasta: string;
  readonly tipoPago: 'SENA' | 'TOTAL';
}

export interface ReservaAmenityCobroResultDto {
  readonly reservaUuid: string;
  readonly tipoCobro: 'SENA' | 'TOTAL';
  readonly monto: number;
  readonly concepto: string;
  readonly movimientoUuid: string | null;
  readonly qr: string;
}

/** Genera un nuevo checkout de una reserva propia que continúa vigente. */
export interface ReintentarPagoReservaAmenityPortalCommand {
  readonly tipoPago?: 'SENA' | 'TOTAL';
}

export interface CobrarReservaAmenityManualCommand {
  readonly canalCobro: 'MANUAL';
  readonly monto: number;
  readonly medioPago: 'EFECTIVO' | 'TRANSFERENCIA' | 'OTRO';
  readonly fecha?: string | null;
  readonly observaciones?: string | null;
}

export interface CobrarReservaAmenityMercadoPagoCommand {
  readonly canalCobro: 'MERCADO_PAGO';
  readonly monto?: never;
  readonly medioPago?: never;
  readonly fecha?: never;
  readonly observaciones?: never;
}

export type CobrarReservaAmenityCommand =
  | CobrarReservaAmenityManualCommand
  | CobrarReservaAmenityMercadoPagoCommand;

export interface CobroReservaAmenityResultDto {
  readonly tipoCobro: 'SENA' | 'SALDO' | 'TOTAL';
  readonly monto: number;
  readonly concepto: string;
  readonly movimientoUuid?: string | null;
  readonly qr?: string | null;
}

export type PaginaReservasAmenityDto = PageResponse<ReservaAmenityDto>;
