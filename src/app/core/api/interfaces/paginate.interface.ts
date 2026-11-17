export interface PaginateFiltro {
  readonly tabla: string;
  readonly columna: string;
  readonly operacion: string;
  readonly valor: string;
}

export interface PaginateParametro {
  readonly nombre: string;
  readonly valor: string;
}

export interface PaginateRelacion {
  readonly tipo: string;
  readonly hastaTabla: string;
  readonly hastaColumna: string;
  readonly desdeTabla: string;
  readonly desdeColumna: string;
}

export interface PaginateOrden {
  readonly tabla: string;
  readonly columna: string;
  readonly direccion: string;
}

export interface PaginateRequest {
  readonly page: number;
  readonly size: number;
  readonly parametros: readonly PaginateParametro[];
  readonly filtros: readonly (readonly PaginateFiltro[])[];
  readonly relaciones: readonly PaginateRelacion[];
  readonly ordenes: readonly PaginateOrden[];
}

export interface PageResponse<T> {
  readonly content: readonly T[];
  readonly totalElements: number;
  readonly totalPages: number;
  readonly size: number;
  readonly number: number;
  readonly first: boolean;
  readonly last: boolean;
  readonly numberOfElements: number;
  readonly empty: boolean;
}
