# Toast Alert Host

Host global que monta toasts disparados por `ToastAlertService`. Vive en el layout autenticado.

## Archivo

- [toast-alert-host.component.ts](./components/toast-alert-host.component.ts)

## Uso

No se instancia en páginas individuales. El layout principal incluye `<app-toast-alert-host />` una sola vez.

Los interceptors y servicios llaman a `ToastAlertService` para mostrar mensajes HTTP o de negocio.

## Relación

- [toast-alert.docs.md](./toast-alert.docs.md) — componente visual de cada toast
- [toast-alert.service.ts](./services/toast-alert.service.ts) — API imperativa
