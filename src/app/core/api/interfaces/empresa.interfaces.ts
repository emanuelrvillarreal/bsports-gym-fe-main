import { ResumenSuscripcionEmpresaCrmDto } from './crm.interfaces';
import { FacturaEstado } from './facturas.interfaces';
import { PeriodicidadCuota } from './periodicidad-cuota.interfaces';

export interface DomicilioClubPayload {
  readonly direccion: string;
  readonly codigoPostal: string;
  readonly localidad: string;
}

export interface AdministradorClubPayload {
  readonly nombre: string;
  readonly apellido: string;
  readonly email: string;
  readonly password: string;
}

/** Cómo vence el certificado médico: un día fijo del año para todos, o N meses desde la carga. */
export type CertificadoVigenciaModo = 'FECHA_FIJA' | 'DURACION';

/** Cómo se calcula el recargo por pago fuera de término. */
export type RecargoTipo = 'FIJO' | 'PORCENTAJE';

/** Contrato ClubProfileFieldsDTO documentado por la colección Postman. */
export interface PerfilEmpresaPayload {
  /** Identificador URL del club; el backend lo requiere al actualizar el perfil. */
  readonly path?: string;
  readonly nombreComercial: string;
  readonly razonSocial: string;
  readonly cuit: string;
  readonly domicilio: DomicilioClubPayload;
  readonly domicilioFacturacion: DomicilioClubPayload;
  readonly telefono: string;
  readonly emailFacturaElectronica: string;
  readonly emailInstitucional: string;
  readonly colorPrimario: string;
  readonly colorSecundario: string;
  readonly cuotaSocialHabilitada: boolean;
  readonly periodicidadCuotaSocial?: PeriodicidadCuota | null;
  readonly diasVencimientoCuota?: number;
  readonly diasVencimientoMoroso?: number;
  readonly diasInhabilitacion?: number;
  /** Recargo opcional por cuota impaga pasado el vencimiento + días de gracia; se cobra una sola vez. */
  /** Vigencia del certificado médico del club. */
  readonly certificadoVigenciaModo?: CertificadoVigenciaModo;
  readonly certificadoVigenciaMeses?: number;
  readonly certificadoRenovacionDia?: number;
  readonly certificadoRenovacionMes?: number;
  readonly recargoHabilitado?: boolean;
  readonly recargoTipo?: RecargoTipo | null;
  readonly recargoValor?: number | null;
  readonly recargoDiasGracia?: number;
}

/**
 * Perfil institucional completo devuelto por GET /companies/current.
 *
 * El endpoint puede incluir los datos de identificación y branding de la
 * empresa además de los campos editables del perfil. Se mantienen opcionales
 * para conservar compatibilidad con despliegues que todavía no los exponen.
 */
export interface PerfilEmpresaDto extends Omit<
  PerfilEmpresaPayload,
  | 'domicilio'
  | 'domicilioFacturacion'
  | 'telefono'
  | 'emailInstitucional'
  | 'colorPrimario'
  | 'colorSecundario'
  | 'cuotaSocialHabilitada'
> {
  readonly uuid?: string;
  readonly domicilio: DomicilioClubPayload | null;
  readonly domicilioFacturacion: DomicilioClubPayload | null;
  readonly telefono: string | null;
  readonly emailInstitucional: string | null;
  readonly logoUrl?: string | null;
  readonly colorPrimario: string | null;
  readonly colorSecundario: string | null;
  readonly cuotaSocialHabilitada: boolean | null;
  /** Se devuelve al consultar el perfil, pero no pertenece al DTO de actualización. */
  readonly importeCuotaSocial?: number | null;
  readonly path?: string;
}

/** Contrato ClubRegistrationRequestDTO de POST /sysadmin/clubs. */
export interface RegistroEmpresaPayload extends PerfilEmpresaPayload {
  readonly admin: AdministradorClubPayload;
  readonly codigoPlan?: string;
  readonly codigoCondicionImpositiva: string;
  readonly codigoProvincia: string;
}

/** Campos de CompanyDTO que necesita el onboarding para continuar. */
export interface EmpresaDto {
  readonly uuid: string;
  readonly cuit?: string;
  readonly nombreComercial?: string | null;
  readonly razonSocial?: string;
  readonly logoUrl?: string | null;
  readonly adminCreado?: boolean;
  /** 0 representa una empresa activa; cualquier otro valor, una desactivada. */
  readonly status?: number | null;
  readonly suscripcionCrm: ResumenSuscripcionEmpresaCrmDto | null;
  /** Resumen de la factura más reciente, incluido en el paginado de clubes. */
  readonly ultimaFacturaEstado?: FacturaEstado | null;
  readonly ultimaFacturaFechaGeneracion?: string | null;
  readonly ultimaFacturaFechaVencimiento?: string | null;
}

/** CompanyDTO público resuelto desde el identificador URL único del club. */
export interface EmpresaPublicaDto {
  readonly uuid: string;
  readonly nombreComercial: string;
  readonly logoUrl?: string | null;
  readonly colorPrimario?: string | null;
  readonly colorSecundario?: string | null;
  /** El lookup se realiza por path; algunas versiones del backend no lo devuelven. */
  readonly path?: string;
}

export interface AdministradorEmpresaDto {
  readonly uuid?: string;
  readonly nombre?: string;
  readonly apellido?: string;
  readonly email?: string;
}

export interface RegistroEmpresaResponse {
  readonly company: EmpresaDto;
  readonly admin: AdministradorEmpresaDto;
}

/** Request de POST /companies/paginate-club. */
export interface EmpresasPaginateRequest {
  readonly page: number;
  readonly size: number;
  readonly search: string;
}

/** Estado enmascarado; nunca contiene credenciales en texto plano. */
export interface ConfiguracionMercadoPagoDto {
  readonly habilitado: boolean;
  readonly operativo: boolean;
  readonly webhookOperativo: boolean;
  readonly accessTokenHint?: string | null;
  readonly publicKeyHint?: string | null;
  readonly webhookSecretHint?: string | null;
}

/** Los campos omitidos conservan el secreto guardado en el backend. */
export interface GuardarConfiguracionMercadoPagoPayload {
  readonly accessToken?: string;
  readonly publicKey?: string;
  readonly webhookSecret?: string;
  readonly habilitado?: boolean;
}

/** Solapas del menú administrativo que el club ocultó; aplica a ADMIN y recepción. */
export interface MenuSolapasDto {
  readonly solapasOcultas: readonly string[];
}
