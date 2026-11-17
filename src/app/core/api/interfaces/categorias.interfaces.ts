import { PageResponse } from './paginate.interface';

export interface CategoriaDto {
  readonly categoriaUuid: string;
  readonly nombre: string;
  readonly descripcion?: string | null;
  readonly edadMinima?: number | null;
  readonly edadMaxima?: number | null;
}

export interface GuardarCategoriaCommand {
  readonly nombre: string;
  readonly descripcion: string | null;
  readonly edadMinima: number | null;
  readonly edadMaxima: number | null;
}

export interface PaginarCategoriasCommand {
  readonly page: number;
  readonly size: number;
  readonly search: string;
}

export type PaginaCategoriasDto = PageResponse<CategoriaDto>;
