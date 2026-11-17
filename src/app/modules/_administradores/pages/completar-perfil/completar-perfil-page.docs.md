# Completar perfil del club

Pantalla exclusiva de ADMIN para completar el perfil de un club creado desde el CRM. Consulta `GET /companies/current` y mantiene los cambios de los tres pasos en memoria hasta tocar **Enviar perfil**. La actualización usa `PUT /companies/profile` y conserva los campos de identificación y facturación que ya llegaron del backend.

1. Domicilios, teléfono y email institucional.
2. Tres plazos enteros de cuota con valores iniciales 10, 31 y 91 días.
3. Decisión explícita sobre cuota social, selector de colores y logo opcionales.

La periodicidad de cuota social se configura con el selector de `/admin/cuota-social` o `/sysadmin/cuota-social`, una vez completado el perfil. El wizard conserva el valor de periodicidad que ya trae el perfil al guardar los demás datos.

Reutiliza `app-wizard-pasos`, `app-color-mod`, `app-formulario-registro-foto`, `app-boton` y el spinner existente. Los colores elegidos quedan como vista previa hasta el envío final. El logo se sube por `POST /companies/logo` después del PUT; si falla, se puede reintentar o continuar sin logo.
