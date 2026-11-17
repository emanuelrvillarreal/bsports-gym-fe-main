# Página Ingresos

Rutas disponibles para ADMIN y ADM_RECEPCION: `/admin/ingresos` y
`/adm-recepcion/ingresos`. Ambas reutilizan `GestionMovimientosComponent` con
`tipoFijo="null"`, por lo que permiten consultar y registrar ingresos o egresos sin duplicar
endpoints, servicios ni contratos de Tesorería.
