export type TipoAccesoClub = 'INGRESO' | 'EGRESO';

export interface RegistrarAccesoClubCommand {
  readonly userUuid: string;
}

export interface AccesoClubDto {
  readonly accesoUuid?: string;
  readonly userUuid: string;
  readonly memberUuid?: string;
  readonly nombre?: string;
  readonly apellido?: string;
  readonly fecha?: string;
  readonly tipo: TipoAccesoClub;
  readonly presente: boolean;
  readonly memberEstado?: string;
  readonly advertencia?: string | null;
}

export interface PresenteClubDto {
  readonly userUuid: string;
  readonly memberUuid?: string;
  readonly nombre: string;
  readonly apellido: string;
  readonly dni: string;
  readonly presente: boolean;
  readonly ultimoAccesoAt: string;
  readonly imageUrl?: string | null;
  readonly memberEstado?: string;
}

export interface PresentesClubResponse {
  readonly presentes: readonly PresenteClubDto[];
  readonly count: number;
}

export interface AccesoClubLiveEvent {
  readonly item: AccesoClubDto;
  readonly presenteCount: number;
}
