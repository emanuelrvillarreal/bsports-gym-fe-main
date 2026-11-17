# Gestión de mi perfil

El perfil se carga y actualiza según el rol activo: los socios usan
`GET/PUT /portal/member/perfil` y el profesor usa
`GET/PUT /portal/profesor/perfil`.

El formulario es compartido, pero cada servicio conserva su propio contrato HTTP.
