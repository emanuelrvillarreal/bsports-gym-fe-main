# SeleccionarEmpresaPageComponent

`app-seleccionar-empresa-page` — resuelve la elección de empresa y rol autenticado dentro de `/seleccionar-empresa`, sin navegar a una page intermedia.

## Uso básico

La page se carga desde `COMPARTIDO_PERFILES_ROUTES` y requiere el contexto provisto por `AuthService`:

```ts
{
  path: 'seleccionar-empresa',
  canActivate: [authSessionGuard, seleccionEmpresaGuard],
  loadComponent: () =>
    import('./pages/seleccionar-empresa/seleccionar-empresa-page.component').then(
      (m) => m.SeleccionarEmpresaPageComponent,
    ),
}
```

Para abrir directamente los roles de la empresa activa desde el nav-bar se usa:

```ts
{
  etiqueta: 'Cambiar rol',
  ruta: '/seleccionar-empresa',
  queryParams: { modo: 'roles' },
}
```

## Inputs

No expone inputs. Obtiene empresas, empresa activa, roles y usuario desde `AuthService`.

## Outputs

No expone outputs. Confirma el contexto mediante `AuthService` y navega con `Router`.

## Variantes / Casos de uso avanzados

- Varias empresas: muestra cards de clubes; una empresa con varios roles abre sus cards dentro de la misma page.
- Una empresa con varios roles: abre directamente sus roles y oculta `Atrás` porque no existe otra empresa elegible.
- Empresa con un rol: confirma empresa y rol y navega directamente a la ruta principal del perfil.
- `?modo=roles`: muestra los roles de la empresa activa; `Atrás` vuelve al listado y elimina el query param sin alterar el contexto autenticado vigente.
- Las cards de roles reutilizan el catálogo semántico de `IconosAppService`; no registran nombres Heroicons directamente.

## Qué no hacer

- No volver a crear `/seleccionar-rol`: empresa y rol se resuelven en esta page.
- No confirmar una empresa con varios roles al abrir sus cards; empresa y rol deben persistirse juntos al elegir el perfil.
- No duplicar cards, botones, spinners ni iconos: reutilizar `app-card`, `app-boton`, `app-load-spinner-blue` e `IconosAppService`.
- No mostrar `Atrás` cuando existe una sola empresa.

## Relación con el sistema de diseño

Reutiliza `app-titulo-hero`, `app-card`, `app-boton` y `app-load-spinner-blue`. Las cards heredan la paleta `branding.colors` de cada empresa y sus fallbacks desde `ColorThemeService`; responden al tema mediante los tokens globales `--app-*` y `--semantic-danger`.

## Notas técnicas

La carga de paletas tolera configuraciones ausentes, JSON inválido y errores HTTP usando la paleta predeterminada. La autorización permanece en los guards; esta page solo coordina la selección visual y la persistencia del contexto.
