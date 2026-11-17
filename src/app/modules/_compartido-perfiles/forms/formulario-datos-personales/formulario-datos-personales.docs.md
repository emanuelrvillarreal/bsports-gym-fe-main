# Formulario de datos personales

Formulario reutilizable de perfil para profesor y socios. Recibe datos precargados y emite un payload normalizado sin realizar llamadas HTTP.

## Reglas

- Nombre, apellido y fecha de nacimiento son obligatorios y editables.
- DNI y email se muestran como datos de solo lectura porque `PUT /portal/member/perfil` no admite modificarlos.
- Teléfono es opcional.
- DNI y teléfono se muestran formateados; el payload emite el teléfono solo con dígitos.
- El número de socio no forma parte del formulario.
