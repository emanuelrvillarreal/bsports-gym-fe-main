import { DriverOnboardingDefinition } from '../driver-onboarding.models';

/** Ejemplo de tour por ruta — copiar y adaptar al registrar pages en apps derivadas. */
export const EJEMPLO_INICIO_ONBOARDING: DriverOnboardingDefinition = {
  role: 'admin',
  page: 'inicio',
  routePath: 'inicio',
  label: 'Inicio',
  description: 'Recorrido de ejemplo sobre la pagina placeholder del template.',
  version: 1,
  steps: [
    {
      element: '.inicio-page__hero',
      popover: {
        title: 'Pagina de inicio',
        description: 'Reemplaza este placeholder con el dashboard o home de tu producto.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '.dark-mode-switch',
      popover: {
        title: 'Modo oscuro',
        description: 'El layout incluye tema claro/oscuro desde el header.',
        side: 'bottom',
        align: 'end',
      },
    },
  ],
};
