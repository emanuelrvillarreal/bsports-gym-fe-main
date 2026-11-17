# GestionUsuariosInternosComponent

`app-gestion-usuarios-internos` coordina alta, edición, paginado y baja de recepcionistas o profesores. Alta y edición reutilizan el mismo formulario dentro de un popup bloqueante.

La primera columna de ambas tablas muestra `imageUrl` como avatar. Cuando el usuario no tiene foto,
`app-tabla-responsive` genera un cuadro con sus iniciales, igual que en la tabla de socios.

## Uso

```html
<app-gestion-usuarios-internos tipo="profesor" />
```

## Inputs

| Input  | Tipo                            | Descripción                                      |
| ------ | ------------------------------- | ------------------------------------------------ |
| `tipo` | `'recepcionista' \| 'profesor'` | Selecciona el endpoint y los textos del dominio. |

## Contrato

Consume alta, paginado, baja y `PUT /recepcionista/uuid/{uuid}` o sus equivalentes de profesor. El paginado es 1-based: recepción envía `page`, `size` y `search`; profesores agrega el filtro opcional `estados`.

La tabla ofrece `editar` para filas activas e inactivas y una acción personalizada `dar-baja`. El popup usa `app-titulo-hero`, bloquea el cierre durante una mutación, se cierra y recarga al guardar correctamente, y permanece abierto ante errores para conservar los valores ingresados.

Durante la carga inicial y cada recarga por búsqueda, estado o paginación, la tabla y la paginación permanecen montadas. `app-tabla-responsive` muestra su spinner integrado y conserva el alto configurado con `tbody_rows`; el botón Buscar muestra simultáneamente su propio estado de carga y la paginación queda deshabilitada.

Recepción no muestra filtro de estado ni envía la propiedad `estados`. Tanto recepcionistas como profesores ocultan Fecha de alta y el contenedor completa `fechaAlta` con la fecha local del momento (`yyyy-MM-dd`). Profesores conserva su selector de estado.

En profesores, la barra superior distribuye la búsqueda amplia, el selector de Estado y el botón Buscar en ese orden. Los labels de Buscar y Estado comparten alineación y los tres controles se apilan en pantallas angostas.

## Qué no hacer

- No usar este componente para socios: sus reglas y payloads son diferentes.
- No reactivar usuarios desde esta pantalla; el contrato sólo documenta baja lógica.
