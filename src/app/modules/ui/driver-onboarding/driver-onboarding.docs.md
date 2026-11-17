# Driver Onboarding

Tours guiados con [driver.js](https://driverjs.com/) integrados al layout autenticado.

## Archivos

- [driver-onboarding.service.ts](./driver-onboarding.service.ts)
- [driver-onboarding.registry.ts](./driver-onboarding.registry.ts)
- [ejemplo/ejemplo.onboarding.ts](./ejemplo/ejemplo.onboarding.ts) — tour de ejemplo

## Registrar un tour

1. Crear archivo `mi-modulo.onboarding.ts` exportando pasos tipados.
2. Registrar en `driver-onboarding.registry.ts` con rol (`admin`, `profesor`, `miembro`) y `DriverOnboardingPage` genérico (`inicio`, `config`, etc.).
3. Asegurar selectores DOM estables en el layout o página destino.

Roles y páginas del template son genéricos; las apps derivadas extienden el union `DriverOnboardingPage` al registrar tours propios.

## Estilos

Los estilos de `driver.js` y el tema del popover se cargan globalmente desde la sección `styles` de `angular.json`. `driver.css` y `driver-onboarding.global.scss` se declaran como entradas separadas para evitar `@import` obsoletos de Sass.

## Relación

- [onboarding-config-panel.docs.md](../onboarding-config-panel/onboarding-config-panel.docs.md)
