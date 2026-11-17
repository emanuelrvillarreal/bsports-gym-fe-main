export interface ConfiguracionDto {
  readonly uuid?: string;
  readonly name: string;
  readonly value: string;
  readonly global: boolean;
}

export interface ConfiguracionGuardarPayload {
  readonly name: string;
  readonly value: string;
  readonly global: boolean;
}
