export interface TemplateStarterAuthMockConfig {
  readonly enabled: boolean;
}

export interface TemplateStarterBackendConfig {
  readonly companyUuid: string;
}

export interface TemplateStarterConfig {
  readonly appName: string;
  readonly authMock: TemplateStarterAuthMockConfig;
  readonly backend: TemplateStarterBackendConfig;
}

export const TEMPLATE_STARTER_CONFIG: TemplateStarterConfig = {
  appName: 'B Sports Gym',
  backend: {
    companyUuid: '',
  },
  authMock: {
    enabled: false,
  },
} as const;
