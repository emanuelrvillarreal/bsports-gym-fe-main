export interface LoginFormularioPayload {
  readonly username: string;
  readonly password: string;
  readonly companyUuid?: string | null;
}
