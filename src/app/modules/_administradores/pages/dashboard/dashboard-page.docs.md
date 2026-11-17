# DashboardAdministradoresPageComponent

`app-dashboard-administradores-page` presenta el dashboard financiero para `ADMIN` y conserva el resumen operativo para `ADM_RECEPCION`.

## Uso básico

La page se carga exclusivamente desde `/admin/dashboard`. El título y el subtítulo se definen mediante `tituloPagina` y `subtituloPagina` en `route.data`.

## Inputs

No expone inputs públicos.

## Outputs

No expone outputs públicos.

## Variantes / Casos de uso avanzados

`ADMIN` compone el hero de período y el contenedor `app-dashboard-financiero`. `ADM_RECEPCION` conserva `app-resumen-dashboard` sin métricas de Tesorería.

## Qué no hacer

- No exponer datos financieros en la variante de recepción.
- No inyectar servicios de negocio en esta page sin extraer antes la lógica a un componente de dominio.

## Relación con el sistema de diseño

Reutiliza `app-titulo-hero` y responde al tema activo mediante los tokens del componente compartido.
