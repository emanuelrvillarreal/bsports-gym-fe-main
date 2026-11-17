import { PageResponse } from './paginate.interface';
import { AsignarDescuentoPayload } from './descuentos.interfaces';

export type EstadoSocio = 'ACTIVO' | 'MOROSO' | 'INHABILITADO' | 'SUSPENDIDO' | 'INACTIVO';

export interface ActualizarEstadoSocioPayload {
  readonly estado: EstadoSocio;
}

export type Sexo = 'MASCULINO' | 'FEMENINO' | 'OTRO';

export type Parentesco = 'CONYUGE' | 'HIJO' | 'HIJA' | 'PADRE' | 'MADRE' | 'OTRO';

export interface SocioDto {
  readonly memberUuid: string;
  /** UUID de la credencial del usuario, usado para registrar accesos al club. */
  readonly userUuid?: string | null;
  readonly nombre: string;
  readonly apellido: string;
  readonly email: string;
  readonly dni?: string | null;
  readonly telefono?: string | null;
  readonly fechaNacimiento?: string | null;
  readonly sexo?: Sexo | null;
  readonly numeroSocio?: string | null;
  readonly fechaAlta?: string | null;
  readonly imageUrl?: string | null;
  readonly parentesco?: Parentesco | null;
  /** Indica si el socio es titular de un grupo familiar. */
  readonly titular?: boolean;
  /** UUID del titular cuando el socio pertenece a un grupo familiar. */
  readonly titularMemberUuid?: string | null;
  readonly tieneFamiliares?: boolean;
  readonly estado: EstadoSocio;
}

export interface SociosPaginateRequest {
  readonly page: number;
  readonly size: number;
  readonly search: string;
  readonly titular?: boolean;
  readonly estados: readonly EstadoSocio[];
}

export type SociosPaginateResponse = PageResponse<SocioDto>;

export interface AltaTitularPayload {
  readonly nombre: string;
  readonly apellido: string;
  readonly email: string;
  readonly password: string;
  readonly dni?: string;
  readonly telefono?: string;
  readonly fechaNacimiento?: string;
  readonly sexo?: Sexo;
  readonly fechaAlta?: string;
  /** Opcional: si no llega, el backend asigna el siguiente libre. */
  readonly numeroSocio?: number;
  readonly descuentos?: readonly AsignarDescuentoPayload[];
}

export interface AltaFamiliarPayload {
  readonly titularMemberUuid: string;
  readonly parentesco: Parentesco;
  readonly nombre: string;
  readonly apellido: string;
  readonly email: string;
  readonly password: string;
  readonly dni?: string;
  readonly telefono?: string;
  readonly fechaNacimiento?: string;
  readonly sexo?: Sexo;
  readonly fechaAlta?: string;
  readonly descuentos?: readonly AsignarDescuentoPayload[];
}

export interface AltaFamiliarPortalPayload {
  readonly parentesco: Parentesco;
  readonly nombre: string;
  readonly apellido: string;
  readonly email: string;
  readonly password?: string;
  readonly dni?: string;
  readonly telefono?: string;
  readonly fechaNacimiento?: string;
  readonly sexo?: Sexo;
}

export interface AltaFamiliarPortalResponse {
  readonly memberUuid: string;
}

export interface ActualizarSocioPayload {
  readonly nombre?: string;
  readonly apellido?: string;
  readonly email?: string;
  readonly dni?: string;
  readonly telefono?: string;
  readonly fechaNacimiento?: string;
  readonly sexo?: Sexo;
  readonly parentesco?: Parentesco;
  readonly numeroSocio?: number;
}

export interface SolicitudRegistroSocioDto {
  readonly memberUuid: string;
  readonly nombre: string;
  readonly apellido: string;
  readonly titularNombre: string | null;
  readonly email: string;
  readonly dni?: string | null;
  readonly telefono?: string | null;
  readonly parentesco?: Parentesco | null;
  readonly fechaSolicitud?: string | null;
}

export interface SolicitudesSociosPaginateRequest {
  readonly page: number;
  readonly size: number;
  readonly search: string;
}

export type SolicitudesSociosPaginateResponse = PageResponse<SolicitudRegistroSocioDto>;

/** Body opcional al aprobar una solicitud; un arreglo vacío conserva la aprobación tradicional. */
export interface AprobarSolicitudRegistroPayload {
  readonly descuentos?: readonly AsignarDescuentoPayload[];
}

export interface InicioImportacionSociosDto {
  readonly message: string;
  readonly importId: string;
  readonly filasTotales: number;
}

export interface ProgresoImportacionSociosDto {
  readonly filasProcesadas: number;
  readonly filasTotales: number;
  readonly porcentajeCompletado: number;
  readonly errorCount?: number;
  readonly warningCount?: number;
  readonly errorMessage?: string | null;
}

export interface ErrorImportacionSociosDto extends ProgresoImportacionSociosDto {
  readonly errorMessage: string;
}

export type EventoSeguimientoImportacionSociosDto =
  | { readonly tipo: 'conectado' }
  | { readonly tipo: 'reconectando' }
  | { readonly tipo: 'progreso'; readonly datos: ProgresoImportacionSociosDto }
  | { readonly tipo: 'completada'; readonly datos: ProgresoImportacionSociosDto }
  | { readonly tipo: 'error'; readonly datos: ErrorImportacionSociosDto };

export type EstadoResultadoImportacionSocios = 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type EstadoFilaImportacionSocios = 'SUCCESS' | 'ERROR';
export type TipoFilaImportacionSocios = 'TITULAR' | 'FAMILIAR';

export interface ResultadoImportacionSociosResumenDto {
  readonly importId: string;
  readonly totalRows: number;
  readonly successCount: number;
  readonly errorCount: number;
  readonly warningCount: number;
  readonly importStatus: EstadoResultadoImportacionSocios;
  readonly errorMessage: string | null;
  readonly dateCreated: string;
}

export interface ResultadoFilaImportacionSociosDto {
  readonly rowNumber: number;
  readonly status: EstadoFilaImportacionSocios;
  readonly tipo: TipoFilaImportacionSocios | null;
  readonly memberUuid: string | null;
  readonly numeroSocio: string | null;
  readonly errorMessage: string | null;
  readonly warnings: readonly string[];
}

export interface ResultadoImportacionSociosDetalleDto
  extends ResultadoImportacionSociosResumenDto {
  readonly rows: readonly ResultadoFilaImportacionSociosDto[];
}

export interface ResultadosImportacionSociosPageDto {
  readonly content: readonly ResultadoImportacionSociosResumenDto[];
  readonly page: number;
  readonly size: number;
  readonly totalElements: number;
  readonly totalPages: number;
  readonly hasNext: boolean;
  readonly hasPrevious: boolean;
}
