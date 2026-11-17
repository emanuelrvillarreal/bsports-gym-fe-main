# FormularioEventoAccesoComponent

Formulario presentacional standalone, OnPush y basado en signals para alta y edición.

- Inputs: `formId`, `valorInicial` y `reinicioVersion`.
- Output: `enviado` con `EventoAccesoAltaCommand`.
- Valida título y descripción obligatorios, sus longitudes máximas y los importes. El precio de socio
  al día admite cero; los precios de morosos e invitados, cuando están habilitados, deben ser mayores a cero.
- El input de fecha del evento es de tipo fecha y muestra únicamente el día seleccionado.
- Expone precios diferenciados para socio al día, socio moroso e invitado.
- Envía siempre `permiteMorosos` y `permiteInvitados`; en un alta ambos comienzan habilitados.
- Solo reinicia cuando cambia la versión o el valor inicial; un error del contenedor conserva lo escrito.
- No realiza HTTP ni administra popups o mensajes de operación.
- Usa controles nativos accesibles y `appValidacionFormulario`.
- Al intentar enviar, marca en rojo los campos incompletos o inválidos mediante la validación compartida.
