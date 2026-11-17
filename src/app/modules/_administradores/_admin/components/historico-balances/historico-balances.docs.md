# Histórico de balances

Consume el paginado OpenAPI 1-based de balances mensuales cerrados y reutiliza tabla y paginación.

La página de Tesorería lo monta únicamente para `ADMIN` mediante `*appVisibleParaRoles`. Así,
`ADM_RECEPCION` no instancia la tabla, sus comparativas ni las consultas de balances históricos.
