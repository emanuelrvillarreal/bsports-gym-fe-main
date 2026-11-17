# HeaderComponent

`app-header` — encabezado del shell autenticado con saludo, avatar editable y selector de tema.

## Uso básico

```html
<app-header />
```

El componente obtiene el usuario autenticado desde `AuthService`; no requiere preparar datos en el
contenedor.

## Inputs

No expone inputs.

## Outputs

No expone outputs.

## Variantes / Casos de uso avanzados

El avatar muestra, en este orden:

1. `imageUrl` del usuario autenticado;
2. las iniciales de nombre y apellido cuando no hay imagen o la imagen falla;
3. el icono genérico de usuario cuando tampoco hay datos para formar iniciales.

El avatar es un botón accesible disponible para todos los roles. Abre un `app-popup` que reutiliza
`app-formulario-registro-foto` para validar, previsualizar, subir o reemplazar la imagen. Cuando ya
existe una foto, la acción para eliminarla aparece junto a `Restablecer selección`; el pie contiene
solamente `Cerrar`, con el color primario de la empresa.

Mientras se sube o elimina una imagen, el formulario y el cierre del popup permanecen bloqueados.
Una operación exitosa actualiza la sesión mediante `AuthService` y cierra el diálogo; un error lo
mantiene abierto y muestra el mensaje dentro del formulario. Antes de mostrar la confirmación de
eliminación se cierra el diálogo nativo para evitar capas modales superpuestas. Si se cancela o el
endpoint falla, el editor vuelve a abrirse.

## Qué no hacer

- No agregar llamadas `HttpClient` directas: la carga y eliminación pertenecen a `AuthService`.
- No duplicar la validación de formato, peso o proporción; pertenece a
  `app-formulario-registro-foto`.
- No convertir el avatar en un elemento no interactivo: debe conservar semántica de botón,
  `aria-label`, `aria-haspopup` y foco visible.
- No cerrar el popup ante un error de red; el archivo debe quedar disponible para reintentar.

## Relación con el sistema de diseño

Reutiliza `app-popup`, `app-boton`, `app-formulario-registro-foto`, `app-load-spinner`,
`app-contador` y `app-dark-mode`. El contador de presentes solo se muestra para `ADMIN` y
`ADM_RECEPCION`; consulta su servicio en cada cambio de ruta. Consume `--app-surface`,
`--app-surface-strong`, `--app-surface-border`,
`--app-text`, `--app-accent` y `--semantic-danger`, por lo que responde a los temas claro y oscuro.

## Notas técnicas

`AuthService.subirFotoPerfil(File)` y `AuthService.eliminarFotoPerfil()` fusionan la respuesta del
backend en la sesión. Los `computed` del header reciben el nuevo `imageUrl` sin mantener una copia
local. Las suscripciones se cancelan al destruir el componente.
