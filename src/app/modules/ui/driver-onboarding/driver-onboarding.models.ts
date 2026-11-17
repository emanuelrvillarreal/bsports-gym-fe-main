import type { DriveStep } from 'driver.js';

/** Roles de ejemplo para tours — extender en apps derivadas. */
export type DriverOnboardingRole = 'admin' | 'profesor' | 'miembro';

/**
 * Identificadores de página del tour.
 * El template incluye solo claves genéricas; las apps agregan las suyas al registrar definiciones.
 */
export type DriverOnboardingPage =
  | 'inicio'
  | 'config'
  | 'ejemplo'
  | 'listado'
  | 'detalle'
  | 'login'
  | 'registro';

export interface DriverOnboardingStepDefinition {
  readonly element: string;
  readonly popover: NonNullable<DriveStep['popover']>;
}

export interface DriverOnboardingDefinition {
  readonly role: DriverOnboardingRole;
  readonly page: DriverOnboardingPage;
  readonly routePath: string;
  readonly label: string;
  readonly description: string;
  readonly version: number;
  readonly steps: readonly DriverOnboardingStepDefinition[];
}

export interface DriverOnboardingStoredPageState {
  readonly completed: boolean;
  readonly version: number;
}

export type DriverOnboardingStoredRoleState = Partial<
  Record<DriverOnboardingPage, DriverOnboardingStoredPageState>
>;

export type DriverOnboardingStoredState = Partial<
  Record<DriverOnboardingRole, DriverOnboardingStoredRoleState>
>;

export interface DriverOnboardingConfigItem {
  readonly page: DriverOnboardingPage;
  readonly routePath: string;
  readonly label: string;
  readonly description: string;
  readonly version: number;
  readonly completed: boolean;
  readonly pending: boolean;
}
