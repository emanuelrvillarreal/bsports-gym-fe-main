# Gestión de accesos

`app-gestion-accesos` registra ingresos y egresos del club, muestra la ocupación actual y consulta el historial por rango de fechas.

## Uso básico

```html
<app-gestion-accesos />
```

## Responsabilidades

- Consulta `GET /acceso-club/presentes` para calcular ocupación, mostrar los tres primeros ingresos, decidir la acción disponible de cada socio y listar todas las personas presentes en el modo `Ingresos`. Cada ingreso usa `imageUrl` como foto de fondo o una insignia con iniciales si no hay foto.
- Registra la acción mediante `POST /acceso-club`; el backend resuelve si corresponde ingreso o egreso.
- Consulta `GET /acceso-club` para el historial por fecha y usa `GET /acceso-club/live` para incorporar cada evento `update` al feed en tiempo real. El stream es compartido con el contador del header, por lo que ambos consumidores reutilizan una sola conexión SSE.

## Qué no hacer

- No duplicar la lógica de presencia en la tabla: debe derivarse del snapshot de presentes por `userUuid`.
- No reordenar los tres ingresos en el cliente: el carrusel respeta el orden que entrega el backend.

## Relación con el sistema de diseño

Reutiliza `app-card`, `app-boton`, `app-select`, `app-carrusel-fade`, `app-load-spinner-blue`, `app-tabla-responsive` y `app-paginacion`. Los ingresos usan `--semantic-success` y los egresos `--semantic-danger`.

## Notas técnicas

El selector `Todos / Ingresos` alterna entre el paginado remoto de socios y el snapshot completo de presentes; este último se filtra localmente y no se pagina. El carrusel y el feed reservan su alto mientras cargan para evitar saltos visuales. Ante cada evento live, el feed y el contador cambian inmediatamente y los presentes se resincronizan en segundo plano para mantener completos la foto, el DNI, el estado y las acciones de la tabla.
