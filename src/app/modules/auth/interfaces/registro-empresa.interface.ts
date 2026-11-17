/**
 * Alias retrocompatibles. El contrato canónico vive en core/api para que pueda
 * ser compartido por servicios y formularios sin depender del módulo auth.
 */
export type {
  AdministradorClubPayload,
  DomicilioClubPayload,
  RegistroEmpresaPayload,
  RegistroEmpresaResponse,
} from '../../../core/api/interfaces/empresa.interfaces';
