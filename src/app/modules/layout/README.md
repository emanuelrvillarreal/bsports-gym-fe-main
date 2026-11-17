# Layout

`layout` define los shells privados reutilizables. Las pages se montan mediante `router-outlet` sin duplicar navegación, header, feedback global ni comportamiento responsive.

## Componentes

- [layout-main.docs.md](./components/layout-main/layout-main.docs.md)
- [layout-sysadmin.docs.md](./components/layout-sysadmin/layout-sysadmin.docs.md)
- [layout-administradores.docs.md](./components/layout-administradores/layout-administradores.docs.md)
- [layout-socios.docs.md](./components/layout-socios/layout-socios.docs.md)
- [layout-profesor.docs.md](./components/layout-profesor/layout-profesor.docs.md)
- [header.docs.md](./components/header/header.docs.md)
- [nav-bar.docs.md](./components/nav-bar/nav-bar.docs.md)

## Asignación

| Layout                   | Prefijos                            | Roles                       |
| ------------------------ | ----------------------------------- | --------------------------- |
| `layout-sysadmin`        | `/sysadmin`                         | `SYSADMIN`                  |
| `layout-administradores` | `/admin`, `/adm-recepcion`          | `ADMIN`, `ADM_RECEPCION`    |
| `layout-profesor`        | `/profesor`                         | `PROFESOR`                  |
| `layout-socios`          | `/socio-titular`, `/socio-familiar` | `SOCIO_TITULAR`, `FAMILIAR` |

La page `/seleccionar-empresa` vive fuera de los layouts privados y unifica la elección de empresa y rol. La configuración compartida permanece disponible en los perfiles administrativos, no en el portal profesor.

## Regla

El layout contiene shell, navegación, header y comportamiento responsive. No contiene métricas, widgets de una page, consumo de backend ni reglas de autorización. Antes de crear UI, revisar el [índice UI](../../../../docs/ui/README.md) y reutilizar los componentes existentes.
