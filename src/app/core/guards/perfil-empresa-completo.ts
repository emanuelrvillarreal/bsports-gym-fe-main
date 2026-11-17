import { PerfilEmpresaDto } from '../api/interfaces/empresa.interfaces';

function textoCompleto(valor: string | null | undefined): boolean {
  return typeof valor === 'string' && valor.trim().length > 0;
}

function domicilioCompleto(
  domicilio: PerfilEmpresaDto['domicilio'] | null | undefined,
): boolean {
  return (
    !!domicilio &&
    textoCompleto(domicilio.direccion) &&
    textoCompleto(domicilio.codigoPostal) &&
    textoCompleto(domicilio.localidad)
  );
}

function plazoCompleto(valor: number | null | undefined): boolean {
  return typeof valor === 'number' && Number.isInteger(valor) && valor >= 0;
}

/** Campos que exige el alta parcial antes de habilitar el portal ADMIN. */
export function perfilEmpresaCompleto(perfil: PerfilEmpresaDto): boolean {
  return (
    domicilioCompleto(perfil.domicilio) &&
    domicilioCompleto(perfil.domicilioFacturacion) &&
    textoCompleto(perfil.telefono) &&
    textoCompleto(perfil.emailInstitucional) &&
    typeof perfil.cuotaSocialHabilitada === 'boolean' &&
    plazoCompleto(perfil.diasVencimientoCuota) &&
    plazoCompleto(perfil.diasVencimientoMoroso) &&
    plazoCompleto(perfil.diasInhabilitacion)
  );
}
