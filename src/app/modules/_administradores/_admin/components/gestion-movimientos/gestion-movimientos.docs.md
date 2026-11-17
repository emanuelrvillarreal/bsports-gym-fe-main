# Gestión de movimientos

Lista, filtra, detalla, crea y anula movimientos. El input `tipoFijo` permite reutilizar el mismo
contrato y componente en `/admin/ingresos`, evitando un servicio o flujo duplicado.

El filtro visual de período (`MM-yyyy`) se transforma al paginar en `fechaDesde` y `fechaHasta`
(`yyyy-MM-dd`), según el contrato vigente de `POST /treasury/movimiento/paginate`.
