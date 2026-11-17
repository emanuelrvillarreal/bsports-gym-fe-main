# Layout Main

## Que Es

`app-layout-main` es el contenedor principal del shell autenticado.

## Responsabilidad

- renderizar `app-nav-bar`
- renderizar `app-header`
- renderizar el `router-outlet`
- coordinar apertura, cierre y lado del menu
- persistir preferencias simples del layout

## Estado Que Maneja

- lado del menu: izquierda o derecha
- estado del menu: abierto o cerrado
- habilitacion diferida de transiciones

## Persistencia

Guarda en `localStorage`:

- `b-spots.navBar.ladoMenu`
- `b-spots.navBar.abierto`

Estas claves conservan deliberadamente el nombre histórico `navBar` para no perder preferencias almacenadas. La carpeta y el componente actuales usan `nav-bar`.

## Impacto En El Template

Es parte del starter base porque resuelve el frame principal de la app.

También inicializa el branding sincronizado con backend, el seguimiento de rutas de `driver-onboarding` y el host global de toasts.

Cuando se use en otro proyecto, normalmente no hace falta reemplazarlo completo. Lo habitual es mantener este contenedor y cambiar las familias de pages, el branding y las opciones de navegación.

## Responsive

En escritorio ajusta margenes segun ancho y lado del navbar.

En mobile libera el contenido para que el menu funcione como overlay compacto.
