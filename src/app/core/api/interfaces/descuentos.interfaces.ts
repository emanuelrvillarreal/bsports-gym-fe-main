import { PageResponse } from './paginate.interface';

export type TipoValorDescuento = 'PORCENTAJE' | 'MONTO_FIJO';

/** Definición reutilizable de un descuento dentro del catálogo del club. */
export interface DescuentoDto {
  readonly descuentoUuid: string;
  readonly titulo: string;
  readonly tipoValor: TipoValorDescuento;
  readonly porcentaje: number | null;
  readonly montoFijo: number | null;
}

/**
 * El backend exige que el valor que no corresponde a `tipoValor` se envíe en `null`.
 */
export interface GuardarDescuentoPayload {
  readonly titulo: string;
  readonly tipoValor: TipoValorDescuento;
  readonly porcentaje: number | null;
  readonly montoFijo: number | null;
}

export interface DescuentosPaginateRequest {
  readonly page: number;
  readonly size: number;
  readonly search: string;
}

export type DescuentosPaginateResponse = PageResponse<DescuentoDto>;

/** Descuento aplicado a un socio o a una inscripción de actividad concreta. */
export interface DescuentoAsignadoDto extends DescuentoDto {
  readonly asignacionUuid: string;
  readonly fechaDesde: string;
  readonly fechaHasta: string | null;
  readonly vigente: boolean;
}

export interface ActividadConDescuentosDto {
  readonly actividadUuid: string;
  readonly actividadNombre: string;
  readonly descuentos: readonly DescuentoAsignadoDto[];
}

export interface MemberDescuentosDto {
  readonly memberUuid: string;
  readonly nombre: string;
  readonly fotoUrl: string | null;
  readonly cuotaSocial: readonly DescuentoAsignadoDto[];
  readonly actividades: readonly ActividadConDescuentosDto[];
}

export type MemberDescuentosPaginateResponse = PageResponse<MemberDescuentosDto>;

export interface AsignarDescuentoPayload {
  readonly descuentoUuid: string;
  readonly fechaDesde: string;
  readonly fechaHasta: string | null;
}

export interface FinalizarDescuentoPayload {
  readonly fecha: string;
}
