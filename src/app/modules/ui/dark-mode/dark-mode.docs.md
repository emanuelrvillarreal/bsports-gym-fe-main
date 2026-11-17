# Dark Mode

`app-dark-mode` es la UI del motor de esquema visual del template.

No cambia branding. Cambia la base estructural del tema:

- `dark`
- `light`

## Que Controla

El motor aplica clases sobre `html` y `body`:

- `theme-mode-dark`
- `theme-mode-light`

Y mantiene alias compatibles:

- `dark-mode-on`
- `dark-mode-off`

## Tokens Que Impacta

El esquema visual controla los tokens estructurales definidos en `src/styles.scss`:

- `--app-bg`
- `--app-text`
- `--app-surface`
- `--app-surface-strong`
- `--app-surface-border`
- `--app-text-soft`
- `--app-calendar-indicator-filter`

No cambia:

- `--color-primario`
- `--color-secundario`
- `--color-terciario`

## Como Se Usa

```html
<app-dark-mode />
```

Cada click alterna entre:

1. `dark`
2. `light`

## Persistencia

La preferencia se guarda en `localStorage` con la clave:

- `b-spots.theme-mode`

El valor efectivo que deja el switch hoy es binario:

- `dark`
- `light`

## Alcance

Impacta en toda la app porque aplica clases globales sobre `html` y `body`.

Eso afecta:

- fondos
- superficies
- bordes
- textos
- inputs `date`
- scrollbar global

## Donde Vive La Logica

- UI: `dark-mode.component.ts`
- motor: `theme-mode.service.ts`

## Regla Del Template

El motor de esquema no debe tocar branding.

Su responsabilidad es solo definir la base estructural del tema.

## Nota De Arquitectura

El motor interno sigue preparado para soportar `system` si mas adelante queres exponer esa opcion en otra UI o en configuracion avanzada.

El switch actual, en cambio, se dejo deliberadamente binario para que el comportamiento visual sea claro y consistente.
