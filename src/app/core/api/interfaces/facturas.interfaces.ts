import { PageResponse } from './paginate.interface';

export type FacturaEstado = 'PENDIENTE' | 'PENDIENTE_PAGO' | 'PAGADA' | 'VENCIDA' | 'ACTIVA';
export type FacturaOrden = 'FECHA_VENCIMIENTO_ASC' | 'FECHA_VENCIMIENTO_DESC';

export interface FacturaDto {
  /** UUID local que debe enviarse al generar el pago. */
  readonly facturaUuid: string;
  readonly uuidFacturaCrm: string;
  readonly codigoPlan: string | null;
  readonly codigosProductos: readonly string[];
  readonly importe: number | null;
  readonly fechaGeneracion: string;
  readonly fechaVencimiento: string;
  readonly estado: FacturaEstado;
}

export interface FacturasPaginateRequest {
  readonly page?: number;
  readonly size?: number;
  readonly estados?: readonly FacturaEstado[];
  readonly orden?: FacturaOrden;
  /** Solo SYSADMIN: selecciona la empresa sin enviar X-Company-Uuid. */
  readonly companyUuid?: string;
}

export type FacturasPaginateResponse = PageResponse<FacturaDto>;

export interface GenerarPagoFacturasPayload {
  readonly facturasUuid: readonly string[];
  readonly referencia: string;
  /** Fecha local en formato yyyy-MM-dd. */
  readonly fechaPago: string;
}

export interface PagoFacturasDto {
  readonly id: string;
  readonly init_point: string;
}
