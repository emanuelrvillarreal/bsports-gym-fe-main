/** Contrato de error que devuelve la API para validaciones de DTO. */
export interface ApiErrorCampoDto {
  readonly nombreCampo?: string;
  readonly message?: string;
}

/**
 * Forma publica esperada para errores de negocio de la API.
 * `developerMessage` se declara a proposito fuera del contrato: nunca debe llegar a la UI.
 */
export interface ApiErrorDto {
  readonly userMessage?: string;
  readonly message?: string;
  readonly error?: string;
  readonly errores?: readonly unknown[];
  readonly fields?: readonly ApiErrorCampoDto[];
}

const MENSAJE_ERROR_POR_DEFECTO = 'No se pudo completar la operacion.';

/**
 * Convierte errores HTTP y errores ya transformados en un mensaje seguro para el usuario.
 * Las validaciones por campo tienen prioridad porque son la informacion mas accionable.
 */
export function extraerMensajeErrorApi(
  error: unknown,
  mensajePredeterminado = MENSAJE_ERROR_POR_DEFECTO,
): string {
  const detalle = obtenerDetalleApi(error);
  const mensajesCampos = extraerMensajesCampos(detalle);
  if (mensajesCampos.length > 0) {
    return mensajesCampos.join(' \u00b7 ');
  }

  const mensajeApi = extraerPrimerTexto(detalle, ['userMessage', 'message', 'error']);
  if (mensajeApi) {
    return mensajeApi;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  const mensajeHttp = extraerPrimerTexto(error, ['message', 'error']);
  return mensajeHttp || mensajePredeterminado;
}

function obtenerDetalleApi(error: unknown): unknown {
  if (!esRegistro(error)) {
    return error;
  }

  return 'error' in error ? error['error'] : error;
}

function extraerMensajesCampos(detalle: unknown): readonly string[] {
  if (!esRegistro(detalle) || !Array.isArray(detalle['fields'])) {
    return [];
  }

  const mensajes = new Set<string>();
  for (const campo of detalle['fields']) {
    if (!esRegistro(campo)) continue;

    const nombreCampo = limpiarTexto(campo['nombreCampo']);
    const mensaje = limpiarTexto(campo['message']);
    if (!mensaje) continue;

    mensajes.add(nombreCampo ? `${nombreCampo}: ${mensaje}` : mensaje);
  }

  return Array.from(mensajes);
}

function extraerPrimerTexto(origen: unknown, claves: readonly string[]): string {
  if (!esRegistro(origen)) {
    return typeof origen === 'string' ? origen.trim() : '';
  }

  for (const clave of claves) {
    const texto = limpiarTexto(origen[clave]);
    if (texto) return texto;
  }

  return '';
}

function limpiarTexto(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim() : '';
}

function esRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null;
}
