import { UsuarioSesion } from './auth-session-service.interfaces';

export interface RegistroUsuarioPayload {
  readonly nombre: string;
  readonly apellido: string;
  readonly email: string;
  readonly password: string;
}

export interface RegistroFamiliarPayload {
  readonly nombre: string;
  readonly apellido: string;
  readonly dni: string;
  readonly email: string;
  readonly password: string;
  readonly sexo?: string;
  readonly fechaNacimiento?: string;
  readonly telefono?: string;
}

export interface PerfilUsuarioPayload {
  readonly nombre: string;
  readonly apellido: string;
  readonly dni: string;
  readonly sexo?: string;
  readonly fechaNacimiento?: string;
  readonly localidad?: string;
  readonly direccion?: string;
  readonly telefono?: string;
  readonly email: string;
}

export interface LoginPayload {
  readonly username: string;
  readonly password: string;
  readonly companyUuid?: string | null;
}

export interface StartLoginPayload {
  readonly email: string;
  readonly path?: string;
}

export interface StartLoginResponse {
  readonly message: string;
}

export interface FinishLoginPayload {
  readonly code: string;
}

export interface TokensAuthResponse {
  readonly accessToken?: string;
  readonly refreshToken?: string;
  readonly token?: string;
  readonly refresh?: string;
  readonly access_token?: string;
  readonly refresh_token?: string;
  readonly data?: Partial<TokensAuthResponse>;
}

export interface UserDataResponse {
  readonly data?: UsuarioSesion;
  readonly role?: string | string[];
  readonly roles?: string | string[];
  readonly [key: string]: unknown;
}

export interface RefreshPayload {
  readonly refresh: string;
}

export interface ForgotPasswordPayload {
  readonly email: string;
  /** Path público del club desde el que se solicita el recupero. */
  readonly path?: string;
}

export interface ResetPassPayload {
  readonly email: string;
  readonly code: string;
  readonly password: string;
}
