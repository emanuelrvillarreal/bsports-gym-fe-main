import { CertificadoMedicoDto } from './certificados-medicos.interfaces';

export interface PerfilPersonalDto {
  readonly nombre: string;
  readonly apellido: string;
  readonly telefono?: string | null;
  readonly fechaNacimiento?: string | null;
  readonly email?: string | null;
  readonly dni?: string | null;
}

export interface ActualizarPerfilPortalPayload {
  readonly nombre: string;
  readonly apellido: string;
  readonly telefono?: string;
  readonly fechaNacimiento: string;
}

export interface PerfilPortalDto extends PerfilPersonalDto {
  readonly memberUuid: string;
  readonly numeroSocio?: string | null;
  readonly fechaAlta?: string | null;
  readonly imageUrl?: string | null;
  readonly certificados?: readonly CertificadoMedicoDto[] | null;
}

export interface CredencialPortalDto<T> {
  readonly userUuid: string;
  readonly qr: string;
  readonly member?: T;
  readonly profesor?: T;
}

export interface MiembroGrupoFamiliarDto extends PerfilPortalDto {
  readonly memberUuid: string;
  readonly titular: boolean;
  readonly titularMemberUuid?: string | null;
  readonly parentesco?: string | null;
  readonly estado?: string | null;
}

export interface IntegranteGrupoFamiliarDto {
  readonly userUuid: string;
  readonly qr: string;
  readonly member: MiembroGrupoFamiliarDto;
}

export interface GrupoFamiliarPortalDto {
  readonly titularMemberUuid: string;
  readonly integrantes: readonly IntegranteGrupoFamiliarDto[];
}

export interface CalendarioConsultaPayload {
  readonly desde: string;
  readonly hasta: string;
}

export interface CalendarioSlotDto {
  readonly slotUuid?: string | null;
  readonly eventoUuid?: string | null;
  readonly titulo?: string | null;
  readonly tipo: 'ACTIVIDAD' | 'AMENITY';
  readonly referenciaUuid: string;
  readonly referenciaNombre?: string | null;
  readonly titularNombre: string | null;
  readonly titularApellido: string | null;
  readonly inicio: string;
  readonly fin: string;
  readonly ubicacion?: string | null;
  readonly estado?: 'PENDIENTE_DE_PAGO' | 'CONFIRMADO' | 'CANCELADO';
}
