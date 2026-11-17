import { EJEMPLO_INICIO_ONBOARDING } from './ejemplo/ejemplo.onboarding';
import { DriverOnboardingDefinition, DriverOnboardingRole } from './driver-onboarding.models';

export const DRIVER_ONBOARDING_DEFINITIONS: readonly DriverOnboardingDefinition[] = [
  EJEMPLO_INICIO_ONBOARDING,
] as const;

export const DRIVER_ONBOARDING_BY_ROLE: Readonly<Record<DriverOnboardingRole, readonly DriverOnboardingDefinition[]>> = {
  admin: DRIVER_ONBOARDING_DEFINITIONS.filter((item) => item.role === 'admin'),
  profesor: DRIVER_ONBOARDING_DEFINITIONS.filter((item) => item.role === 'profesor'),
  miembro: DRIVER_ONBOARDING_DEFINITIONS.filter((item) => item.role === 'miembro'),
};
