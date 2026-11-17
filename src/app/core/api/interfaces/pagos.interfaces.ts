export type EstadoPago = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'CANCELADO';

export interface PagoItemDto {
  readonly detalle?: string | null;
  readonly cuotaUuid?: string | null;
  readonly monto?: number | null;
}

export interface PagoDetalleDto {
  readonly estado: EstadoPago;
  readonly montoTotal: number;
  readonly detalle?: string | null;
  readonly paymentId?: string | number | null;
  readonly items: readonly PagoItemDto[];
}
