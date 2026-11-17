# Índice de componentes UI

Documentación viva junto al código (`*.docs.md` en cada carpeta). Este índice refleja los componentes existentes en `src/app/modules/ui`.

## Motores de apariencia

| Pieza            | Documentación                                                                                  |
| ---------------- | ---------------------------------------------------------------------------------------------- |
| Sistema de tema  | [theme-system.docs.md](../../src/app/modules/ui/theme-system.docs.md)                          |
| Dark mode        | [dark-mode.docs.md](../../src/app/modules/ui/dark-mode/dark-mode.docs.md)                      |
| Color y branding | [color-mod.docs.md](../../src/app/modules/ui/color-mod/color-mod.docs.md)                      |
| Modo performance | [alto-rendimiento.docs.md](../../src/app/modules/ui/alto-rendimiento/alto-rendimiento.docs.md) |

## Contenedores y navegación visual

| Componente        | Selector            | Documentación                                                                                             |
| ----------------- | ------------------- | --------------------------------------------------------------------------------------------------------- |
| Card              | `app-card`          | [card.docs.md](../../src/app/modules/ui/card/card.docs.md)                                                |
| Cards de catálogo | `app-cards`         | [cards.docs.md](../../src/app/modules/ui/cards/cards.docs.md)                                             |
| Cards hero        | `app-cards-hero`    | [cards-hero.docs.md](../../src/app/modules/ui/cards-hero/cards-hero.docs.md)                              |
| Título hero       | `app-titulo-hero`   | [titulo-hero.docs.md](../../src/app/modules/ui/titulo-hero/titulo-hero.docs.md)                           |
| Solapas           | `app-solapas`       | [solapas.docs.md](../../src/app/modules/ui/solapas/solapas.docs.md)                                       |
| Carrusel 3D       | `app-carrusel-3d`   | [carrusel-3d.docs.md](../../src/app/modules/ui/carrusel-3d/carrusel-3d.docs.md)                           |
| Carrusel Fade     | `app-carrusel-fade` | [carrusel-fade.component.docs.md](../../src/app/modules/ui/carrusel-fade/carrusel-fade.component.docs.md) |

## Formularios y acciones

| Componente               | Selector                    | Documentación                                                                                                 |
| ------------------------ | --------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Botón                    | `app-boton`                 | [boton.docs.md](../../src/app/modules/ui/boton/boton.docs.md)                                                 |
| Select                   | `app-select`                | [select.docs.md](../../src/app/modules/ui/select/select.docs.md)                                              |
| Popup                    | `app-popup`                 | [popup.docs.md](../../src/app/modules/ui/popup/popup.docs.md)                                                 |
| Checkout Mercado Pago    | `app-checkout-mercado-pago` | [checkout-mercado-pago.docs.md](../../src/app/modules/ui/checkout-mercado-pago/checkout-mercado-pago.docs.md) |
| Lector QR                | `app-lector-qr`             | [lector-qr.docs.md](../../src/app/modules/ui/lector-qr/lector-qr.docs.md)                                     |
| Wizard de pasos          | `app-wizard-pasos`          | [wizard-pasos.docs.md](../../src/app/modules/ui/wizard-pasos/wizard-pasos.docs.md)                            |
| Validación de formulario | `appValidacionFormulario`   | [validacion-formulario.docs.md](../../src/app/modules/ui/validacion-formulario/validacion-formulario.docs.md) |

## Datos

| Componente        | Selector               | Documentación                                                                                  |
| ----------------- | ---------------------- | ---------------------------------------------------------------------------------------------- |
| Tabla responsive  | `app-tabla-responsive` | [tabla-responsive.docs.md](../../src/app/modules/ui/tabla-responsive/tabla-responsive.docs.md) |
| Paginación        | `app-paginacion`       | [paginacion.docs.md](../../src/app/modules/ui/paginacion/paginacion.docs.md)                   |
| Gráfico de barras | `app-grafico-barras`   | [grafico-barras.docs.md](../../src/app/modules/ui/grafico-barras/grafico-barras.docs.md)       |
| Calendario        | `app-calendario`       | [calendario.docs.md](../../src/app/modules/ui/calendario/calendario.docs.md)                   |
| Carnet            | `app-carnet`           | [carnet.docs.md](../../src/app/modules/ui/carnet/carnet.docs.md)                               |

`app-calendario` y `app-carnet` son visuales. La carga y adaptación de datos pertenece a los componentes de lógica de socios o profesores.

## Carga y feedback

| Componente           | Selector                 | Documentación                                                                                        |
| -------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------- |
| Page loading shell   | `app-page-loading-shell` | [page-loading-shell.docs.md](../../src/app/modules/ui/page-loading-shell/page-loading-shell.docs.md) |
| Load spinner         | `app-load-spinner`       | [load-spinner.docs.md](../../src/app/modules/ui/load-spinner/load-spinner.docs.md)                   |
| Load spinner blue    | `app-load-spinner-blue`  | [load-spinner-blue.docs.md](../../src/app/modules/ui/load-spinner-blue/load-spinner-blue.docs.md)    |
| Toast alert          | `app-toast-alert`        | [toast-alert.docs.md](../../src/app/modules/ui/toast-alert/toast-alert.docs.md)                      |
| Host global de toast | `app-toast-alert-host`   | [toast-alert-host.docs.md](../../src/app/modules/ui/toast-alert/toast-alert-host.docs.md)            |

## Onboarding

| Pieza                  | Documentación                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Driver onboarding      | [driver-onboarding.docs.md](../../src/app/modules/ui/driver-onboarding/driver-onboarding.docs.md)                   |
| Panel de configuración | [onboarding-config-panel.docs.md](../../src/app/modules/ui/onboarding-config-panel/onboarding-config-panel.docs.md) |

## Helpers compartidos

Los helpers puros viven en `src/app/helpers/`. Incluyen utilidades para tablas, gráficos, calendario, select, paginación, cards hero y carrusel.

## Convención

Cada componente reutilizable nuevo en `modules/ui/` debe incluir un `nombre.docs.md` con propósito, ejemplo funcional, inputs, outputs, casos avanzados, antipatrón, tokens CSS y notas técnicas relevantes.
