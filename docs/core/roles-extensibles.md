# Roles extensibles

Los roles canónicos de la aplicación son:

```ts
'SYSADMIN' | 'ADMIN' | 'ADM_RECEPCION' | 'PROFESOR' | 'SOCIO_TITULAR' | 'FAMILIAR';
```

`src/app/core/auth/auth-role.ts` define `AppRole`, normaliza valores recibidos y resuelve la ruta principal. Alias históricos como `RECEPCIONISTA`, `INSTRUCTOR`, `MIEMBRO`, `SOCIO` y sus variantes `ROLE_*` se aceptan únicamente como entrada y se convierten al rol canónico.

## Contexto activo

Tras autenticarse, el usuario resuelve empresa y rol en `/seleccionar-empresa`. Cuando la empresa elegida ofrece más de un rol, la misma page muestra sus roles disponibles sin navegar a otra ruta.

La autorización privada evalúa el rol activo dentro de la empresa activa. No debe autorizar usando cualquier rol global ni inferir uno por prioridad.

| Rol             | Ruta principal           | Layout                   |
| --------------- | ------------------------ | ------------------------ |
| `SYSADMIN`      | `/sysadmin/nueva-empresa` | `layout-sysadmin`       |
| `ADMIN`         | `/admin/dashboard`        | `layout-administradores` |
| `ADM_RECEPCION` | `/adm-recepcion/dashboard` | `layout-administradores` |
| `PROFESOR`      | `/profesor/eventos`      | `layout-profesor`        |
| `SOCIO_TITULAR` | `/socio-titular/inicio`  | `layout-socios`          |
| `FAMILIAR`      | `/socio-familiar/inicio` | `layout-socios`          |

El identificador de rol continúa siendo `FAMILIAR`, mientras que su prefijo canónico es `/socio-familiar`.

## Agregar o cambiar un rol

1. Actualizar `APP_ROLES` y, si corresponde, `normalizarValorRol` en `core/auth/auth-role.ts`.
2. Definir la ruta principal en `obtenerRutaPrincipalPorRol`.
3. Crear o reutilizar la familia, las pages y el layout apropiados.
4. Declarar prefijo, guards y `data.roles` en el archivo `*.routes.ts` de la familia.
5. Alinear las opciones de `nav-bar` y el flujo de selección de contexto.
6. Agregar pruebas de ruta inicial, acceso permitido y aislamiento entre roles y prefijos.

No duplicar listas de roles en componentes, hardcodear alias en templates ni poner reglas de negocio en los guards.
