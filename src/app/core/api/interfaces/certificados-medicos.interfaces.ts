export type EstadoCertificadoMedico =
  | 'PENDIENTE_VALIDACION'
  | 'CONFIRMADO'
  | 'DENEGADO'
  | 'VENCIDO';

export interface CertificadoMedicoDto {
  readonly certificadoUuid: string;
  readonly memberUuid: string;
  readonly fechaCarga: string;
  readonly fechaExpiracion: string;
  readonly nombreArchivo: string;
  readonly urlArchivo?: string | null;
  readonly estado: EstadoCertificadoMedico;
}

export interface ActualizarEstadoCertificadoMedicoPayload {
  readonly estado: Extract<
    EstadoCertificadoMedico,
    'PENDIENTE_VALIDACION' | 'CONFIRMADO' | 'DENEGADO'
  >;
}

/** Situación del certificado de un socio frente al club (la calcula el backend). */
export type SituacionCertificado =
  | 'SIN_CERTIFICADO'
  | 'PENDIENTE_VALIDACION'
  | 'VIGENTE'
  | 'POR_VENCER'
  | 'VENCIDO'
  | 'DENEGADO';

export const ETIQUETAS_SITUACION_CERTIFICADO: Readonly<Record<SituacionCertificado, string>> = {
  SIN_CERTIFICADO: 'Sin certificado',
  PENDIENTE_VALIDACION: 'Pendiente de confirmar',
  VIGENTE: 'Vigente',
  POR_VENCER: 'Por vencer',
  VENCIDO: 'Vencido',
  DENEGADO: 'Rechazado',
};

export interface CertificadoResumenFilaDto {
  readonly memberUuid: string;
  readonly nombre: string;
  readonly apellido: string;
  readonly dni?: string | null;
  readonly imageUrl?: string | null;
  readonly situacion: SituacionCertificado;
  /** dd/MM/yyyy; null si no tiene certificado con fecha. */
  readonly fechaExpiracion?: string | null;
  readonly diasRestantes?: number | null;
  readonly actividadesQueLoExigen: readonly string[];
  /** Hoy no puede hacer alguna actividad que exige certificado. */
  readonly bloqueado: boolean;
}

export interface CertificadosResumenRequest {
  readonly page: number;
  readonly size: number;
  readonly search?: string;
  readonly situacion?: SituacionCertificado | null;
  readonly soloQueLoNecesitan?: boolean;
}

export interface CertificadosResumenResponse {
  readonly conteos: Readonly<Partial<Record<SituacionCertificado, number>>>;
  readonly bloqueados: number;
  readonly filas: {
    readonly content: readonly CertificadoResumenFilaDto[];
    readonly totalElements: number;
    readonly totalPages: number;
    readonly number: number;
  };
}
