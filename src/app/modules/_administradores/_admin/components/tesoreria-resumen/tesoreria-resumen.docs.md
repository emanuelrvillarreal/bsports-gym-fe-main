# TesoreriaResumenComponent

`app-tesoreria-resumen` muestra el balance del mes.

## Uso

```html
<app-tesoreria-resumen />
```

## Contrato

Consume `GET /treasury/balance`.

La página de Tesorería lo monta con `*appVisibleParaRoles="['ADMIN']"`. De esta manera,
`ADM_RECEPCION` no ve las métricas financieras ni ejecuta la consulta de balance actual.

## Qué no hacer

- No montar este componente para `ADM_RECEPCION`: contiene información financiera reservada a `ADMIN`.
