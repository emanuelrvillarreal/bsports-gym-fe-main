# ContadorComponent

`app-contador` informa cuántas personas están presentes en el club. Está pensado para el encabezado de los perfiles operativos.

## Uso

```html
<app-contador />
```

No recibe inputs ni expone outputs. Para los roles activos `ADMIN` y `ADM_RECEPCION`, toma el valor inicial de `GET /acceso-club/presentes` y luego consume el stream SSE compartido `GET /acceso-club/live`. Cada evento `update` reemplaza el valor con `presenteCount`; la invalidación posterior a un registro local conserva el snapshot HTTP como respaldo.

## Estados visuales

| Cantidad   | Color                     |
| ---------- | ------------------------- |
| `0`        | Gris                      |
| `1` a `5`  | Amarillo                  |
| `6` a `9`  | Verde                     |
| `10` o más | Primario de la aplicación |

El testigo circular conserva una animación de pulso y se desactiva cuando el usuario solicita reducción de movimiento.
