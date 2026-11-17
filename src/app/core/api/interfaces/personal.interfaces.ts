/** Pantalla "Personal": una fila por persona con roles combinables. */
export interface SocioDePersonalDto {
  readonly memberUuid: string;
  readonly numeroSocio: string | null;
}

export interface PersonaPersonalDto {
  readonly userUuid: string;
  readonly nombre: string | null;
  readonly apellido: string | null;
  readonly dni: string | null;
  readonly email: string | null;
  readonly telefono: string | null;
  readonly imageUrl: string | null;
  readonly admin: boolean;
  readonly recepcion: boolean;
  readonly profesor: boolean;
  /** Es quien tiene la sesión abierta. */
  readonly yo: boolean;
  readonly socio: SocioDePersonalDto | null;
}

export interface CupoAdminsDto {
  readonly actuales: number;
  /** null si el plan no informa un límite. */
  readonly limite: number | null;
}

export interface ListadoPersonalDto {
  readonly cupoAdmins: CupoAdminsDto;
  readonly personas: readonly PersonaPersonalDto[];
}

export interface RolesPersonal {
  readonly admin: boolean;
  readonly recepcion: boolean;
  readonly profesor: boolean;
}

export interface AltaPersonalPayload extends RolesPersonal {
  readonly nombre: string;
  readonly apellido: string;
  readonly dni: string | null;
  readonly email: string;
  readonly telefono: string | null;
  readonly password: string | null;
}

export interface PersonaEncontradaDto {
  readonly existe: boolean;
  readonly nombre: string | null;
  readonly apellido: string | null;
  readonly dni: string | null;
  readonly email: string | null;
  readonly telefono: string | null;
  readonly yaEsPersonal: boolean;
  readonly socio: SocioDePersonalDto | null;
}
