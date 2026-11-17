export type ModoRegistroTitular = 'usuario-nuevo' | 'usuario-existente';

/** MemberPublicRegistroCommand enviado a POST /member/public/titular. */
export interface RegistroTitularPublicoPayload {
  readonly nombre: string;
  readonly apellido: string;
  readonly email: string;
  readonly password?: string;
  readonly dni?: string;
  readonly telefono?: string;
  readonly fechaNacimiento?: string;
}

/** Datos confirmados de MemberDTO necesarios para cerrar el registro público. */
export interface RegistroTitularPublicoResponse {
  readonly memberUuid: string;
  readonly nombre?: string;
  readonly apellido?: string;
  readonly email?: string;
  readonly status?: number;
}
