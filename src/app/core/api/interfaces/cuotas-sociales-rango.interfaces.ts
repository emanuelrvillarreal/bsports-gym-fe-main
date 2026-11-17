import { PageResponse } from './paginate.interface';

/** Rango etario e importe aplicable a la cuota social de un club. */
export interface CuotaSocialRangoDto {
  readonly cuotaSocialRangoUuid: string;
  readonly nombre: string;
  readonly descripcion?: string | null;
  readonly edadHasta: number;
  readonly importe: number;
  readonly esDefault: boolean;
}

/** Payload compartido por el alta y la edición de un rango de cuota social. */
export interface GuardarCuotaSocialRangoCommand {
  readonly nombre: string;
  readonly descripcion: string | null;
  readonly edadHasta: number;
  readonly importe: number;
}

export interface PaginarCuotasSocialesRangoCommand {
  readonly page: number;
  readonly size: number;
  readonly search: string;
}

export type PaginaCuotasSocialesRangoDto = PageResponse<CuotaSocialRangoDto>;
