import { PageResponse } from './paginate.interface';

export type EstadoUsuarioInterno = 'ACTIVO' | 'INACTIVO';

export interface UsuarioInternoBaseDto {
  readonly nombre: string;
  readonly apellido: string;
  readonly email: string;
  readonly dni?: string | null;
  readonly telefono?: string | null;
  readonly fechaNacimiento?: string | null;
  readonly fechaAlta?: string | null;
  readonly imageUrl?: string | null;
  readonly estado?: EstadoUsuarioInterno;
}

export interface ProfesorDto extends UsuarioInternoBaseDto {
  readonly profesorUuid: string;
}

export interface RecepcionistaDto extends UsuarioInternoBaseDto {
  readonly recepcionistaUuid: string;
}

export type UsuarioInternoDto = ProfesorDto | RecepcionistaDto;

export interface CrearUsuarioInternoPayload {
  readonly nombre: string;
  readonly apellido: string;
  readonly email: string;
  readonly password: string;
  readonly dni?: string;
  readonly telefono?: string;
  readonly fechaNacimiento?: string;
  readonly fechaAlta?: string;
}

export interface ActualizarUsuarioInternoPayload {
  readonly nombre?: string;
  readonly apellido?: string;
  readonly email?: string;
  readonly dni?: string;
  readonly telefono?: string;
}

interface PaginarUsuariosInternosBasePayload {
  readonly page: number;
  readonly size: number;
  readonly search: string;
}

export interface PaginarProfesoresPayload extends PaginarUsuariosInternosBasePayload {
  readonly estados: readonly EstadoUsuarioInterno[];
}

export type PaginarRecepcionistasPayload = PaginarUsuariosInternosBasePayload;

export type PaginaUsuariosInternosResponse<T extends UsuarioInternoDto> = PageResponse<T>;
