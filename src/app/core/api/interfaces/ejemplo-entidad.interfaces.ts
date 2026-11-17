import { PageResponse, PaginateRequest } from './paginate.interface';

/** DTO de ejemplo — reemplazar campos según tu backend. */
export interface EjemploEntidadApiDto {
  readonly uuid?: string;
  readonly nombre: string;
  readonly descripcion?: string | null;
  readonly activo?: boolean;
}

export interface EjemploEntidadFormPayload {
  readonly uuid?: string;
  readonly nombre: string;
  readonly descripcion?: string;
  readonly activo?: boolean;
}

export type EjemploEntidadPaginateResponse = PageResponse<EjemploEntidadApiDto>;

export interface EjemploEntidadPaginateRequest extends PaginateRequest {}
