# Theme System

El template tiene dos motores separados y coordinados.

## 1. Motor de esquema (dark / light)

Controla tokens estructurales: fondos, superficies, bordes, textos.

- Servicio: `dark-mode/theme-mode.service.ts`
- UI: `app-dark-mode`

## 2. Motor de branding (colores de marca)

Controla primario, secundario, terciario vía `ColorThemeService`.

- Servicio: `color-mod/color-theme.service.ts`
- UI: `app-color-mod`

## Reglas

| Motor    | Toca                                                     | No toca            |
| -------- | -------------------------------------------------------- | ------------------ |
| Esquema  | `--app-bg`, `--app-surface`, `--app-text`                | `--color-primario` |
| Branding | `--color-primario`, `--brand-*`, `--interactive-primary` | base light/dark    |

Los tokens semánticos (`--semantic-success`, etc.) **no** cambian con el branding.

## Tabla de tokens (aliases)

| Token legacy         | Alias descriptivo       | Uso                     |
| -------------------- | ----------------------- | ----------------------- |
| `--color-primario`   | `--brand-primary`       | Marca principal         |
| `--color-secundario` | `--brand-secondary`     | Marca secundaria        |
| `--color-terciario`  | `--brand-tertiary`      | Marca terciaria         |
| `--app-accent`       | `--interactive-primary` | Botones, links, foco    |
| `--app-success`      | `--semantic-success`    | Estados OK (verde fijo) |
| `--app-warning`      | `--semantic-warning`    | Alertas                 |
| `--app-info`         | `--semantic-info`       | Información             |
| `--app-danger`       | `--semantic-danger`     | Error / peligro         |

Definidos en `src/styles.scss`. En código nuevo preferí los nombres de la columna **Alias descriptivo**.

## Performance global

`PerformanceModeService` + `html[data-ui-high-performance]` coordinan animaciones en componentes UI. Ver `alto-rendimiento/alto-rendimiento.docs.md`.
