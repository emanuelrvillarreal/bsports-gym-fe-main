import { AppRole } from '../../auth/auth-role';

export interface TokensSesion {
  readonly accessToken: string;
  readonly refreshToken: string;
}

export interface EmpresaSesionDisponible {
  readonly uuid: string;
  readonly nombre: string;
  readonly cuit?: string | null;
  readonly logoUrl?: string | null;
  readonly roles: readonly AppRole[];
}

export interface UsuarioSesion {
  readonly nombre?: string;
  readonly apellido?: string;
  readonly dni?: string;
  readonly email?: string;
  readonly telefono?: string;
  readonly fechaNacimiento?: string;
  readonly imageUrl?: string | null;
  readonly role?: string | string[];
  readonly roles?: string | string[];
  readonly userCompanyRoles?: readonly {
    readonly uuid?: string;
    readonly status?: number;
    readonly dateCreated?: number | string;
    readonly companyUuid?: string;
    readonly companyName?: string;
    readonly companyCuit?: string | null;
    /** Datos institucionales disponibles para el contexto de empresa activo. */
    readonly emailInstitucional?: string | null;
    readonly telefono?: string | null;
    /** Logo informado por el endpoint de login dentro de la empresa del usuario. */
    readonly logoUrl?: string | null;
    readonly companyLogoUrl?: string | null;
    /** Bloqueo operativo informado por el backend para esta empresa. */
    readonly companyBlocked?: boolean | null;
    readonly roles?: readonly {
      readonly uuid?: string;
      readonly name?: string;
      readonly permissions?: readonly {
        readonly name?: string;
      }[];
    }[];
  }[];
  readonly [key: string]: unknown;
}
