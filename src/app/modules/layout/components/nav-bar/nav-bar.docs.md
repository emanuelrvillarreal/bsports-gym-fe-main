# NavBarComponent

`app-nav-bar` es la navegación lateral del shell autenticado.

## Responsabilidad

- mostrar las opciones permitidas para el rol activo;
- resolver la ruta principal del contexto activo;
- permitir colapsar, expandir o cambiar de lado el menú;
- cerrar el panel al navegar en mobile;
- ofrecer cambio de empresa o rol cuando existe más de una opción;
- mostrar el nombre y logo de la empresa activa con fallback de marca.

## Inputs

| Input                     | Tipo                       | Default       | Descripción                                                     |
| ------------------------- | -------------------------- | ------------- | --------------------------------------------------------------- |
| `ladoMenu`                | `'izquierda' \| 'derecha'` | `'izquierda'` | Lado del viewport donde se monta el menú                        |
| `menuAbierto`             | `boolean`                  | `true`        | Estado expandido del menú                                       |
| `transicionesHabilitadas` | `boolean`                  | `true`        | Habilita las transiciones cuando el modo performance lo permite |

## Outputs

| Output             | Payload                    | Descripción                       |
| ------------------ | -------------------------- | --------------------------------- |
| `cambioLadoMenu`   | `'izquierda' \| 'derecha'` | Solicita cambiar el lado del menú |
| `cambioEstadoMenu` | `boolean`                  | Solicita abrir o cerrar el menú   |

## Contexto de autenticación

El nav-bar consulta `AuthService` y `AuthSessionService` para:

- filtrar opciones con el rol seleccionado dentro de la empresa activa;
- construir la ruta principal correspondiente;
- ofrecer `/seleccionar-empresa` cuando hay más de una empresa;
- ofrecer `/seleccionar-empresa` en modo de cambio de rol cuando la empresa activa tiene varios roles.

No infiere un rol por prioridad ni autoriza usando roles de otra empresa.

## Rutas por rol

ADMIN y ADM_RECEPCION reciben “Entradas a eventos” (`/admin/eventos-acceso` y `/adm-recepcion/eventos-acceso`), Descuentos, Tesorería e Ingresos. Solo ADMIN recibe “Panel”; ADM_RECEPCION inicia directamente en “Accesos”. PROFESOR inicia en “Eventos” y no recibe Inicio ni Configuración. SYSADMIN navega principalmente a “Nueva empresa”.

Toda page privada navegable debe registrar una opción con la misma URL y los mismos roles declarados por el archivo `*.routes.ts` de su familia. Una page deliberadamente no navegable no necesita ítem.

## Responsive y gestos

En mobile, cuando el menú está cerrado, desaparece la estructura lateral y permanece el botón para abrirla. Al seleccionar una opción el panel se cierra. El gesto horizontal permite abrir o cerrar según el lado configurado.

## Iconos

Las opciones usan claves semánticas tipadas como `inicio`, `socios`, `descuentos`, `tesoreria`, `entradasEventos` y `configuracion`. `core/icons/iconos-app.service.ts` traduce esas claves a SVG registrados; el menú no debe escribir nombres `hero...` ni `layout...` directamente. El botón de mover el menú usa `moverIzquierda`/`moverDerecha` (`layout-left`/`layout-right`).

Los SVG del layout se registran en `app-icons.registry.ts`. Toda clave nueva debe agregarse al catálogo y al registro. Una clave desconocida usa un icono de fallback para evitar espacios vacíos.

## Tema

Consume principalmente:

- `--app-surface`
- `--app-text`
- `--app-text-soft`
- `--app-surface-border`
- `--app-accent`
- `--app-accent-soft`

## Qué no hacer

- No usar el nav-bar como fuente de autorización: los guards y `data.roles` siguen siendo obligatorios.
- No duplicar opciones ni registrar navegación fuera de los prefijos canónicos de cada familia.
- No consumir endpoints de dominio desde este componente.
