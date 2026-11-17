import { ActualizarPerfilPortalPayload } from './interfaces/portal.interfaces';

/** Construye el contrato exacto aceptado por PUT /portal/member/perfil. */
export function crearPayloadPerfilPortal(
  payload: ActualizarPerfilPortalPayload,
): ActualizarPerfilPortalPayload {
  const perfil: ActualizarPerfilPortalPayload = {
    nombre: payload.nombre,
    apellido: payload.apellido,
    fechaNacimiento: payload.fechaNacimiento,
  };

  return payload.telefono ? { ...perfil, telefono: payload.telefono } : perfil;
}
