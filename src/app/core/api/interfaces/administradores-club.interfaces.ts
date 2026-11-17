import { PageResponse } from './paginate.interface';

/** AdminDTO devuelto por los endpoints de administradores del club. */
export interface AdministradorClubDto {
  readonly userUuid: string;
  readonly nombre: string;
  readonly apellido: string;
  readonly dni?: string | null;
  readonly telefono?: string | null;
  readonly email: string;
  readonly fechaNacimiento?: string | null;
}

/** AdminAltaCommand de POST /admin. */
export interface CrearAdministradorClubPayload {
  readonly nombre: string;
  readonly apellido: string;
  readonly dni: string;
  readonly email: string;
  readonly password: string;
  readonly telefono?: string;
  readonly fechaNacimiento?: string;
}

/** Datos editables del administrador; nunca incluye la contraseÃ±a. */
export interface ActualizarAdministradorClubPayload {
  readonly nombre?: string;
  readonly apellido?: string;
  readonly dni?: string;
  readonly email?: string;
  readonly telefono?: string;
  readonly fechaNacimiento?: string;
}

/** Request exacto de POST /admin/paginate. */
export interface AdministradoresClubPaginateRequest {
  readonly page: number;
  readonly size: number;
  readonly search: string;
}

export type AdministradoresClubPaginateResponse = PageResponse<AdministradorClubDto>;
