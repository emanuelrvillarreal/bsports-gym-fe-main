# CertificadosMedicosPortalComponent

Muestra el historial de certificados del miembro autenticado y permite subir un archivo propio desde el portal.

## Reglas

- Acepta PNG, JPG, JPEG y PDF de hasta 2 MB.
- La carga desde portal queda en `PENDIENTE_VALIDACION`; el club debe confirmarla.
- Si el club deniega un certificado, el historial muestra `DENEGADO` con un chip rojo.
- Nunca expone el enlace de un certificado `VENCIDO`, porque el archivo puede haber sido eliminado del almacenamiento.

## Uso

El componente se compone desde `PerfilPortalComponent`, que obtiene `memberUuid` y `certificados` mediante el perfil del portal y recarga el perfil después de una carga exitosa.
