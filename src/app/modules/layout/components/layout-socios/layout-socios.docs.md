# LayoutSociosComponent

`app-layout-socios` es el shell compartido por `SOCIO_TITULAR` y `FAMILIAR`.

| Prefijo           | Rol             | Pages específicas                        |
| ----------------- | --------------- | ---------------------------------------- |
| `/socio-titular`  | `SOCIO_TITULAR` | `modules/_socios/pages/socio-titular/`  |
| `/socio-familiar` | `FAMILIAR`      | `modules/_socios/pages/socio-familiar/` |

Calendario y credencial se cargan desde `modules/_socios/pages/` para ambos perfiles. Las diferencias funcionales permanecen en las pages y componentes específicos de cada subperfil.

No expone inputs ni outputs. Compone `LayoutMainComponent`; los guards y `data.roles` separan las capacidades de cada rol.

No duplicar el header ni el nav-bar. El rol `FAMILIAR` usa el prefijo canónico `/socio-familiar`.
