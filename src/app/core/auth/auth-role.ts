export const APP_ROLES = [
  'SYSADMIN',
  'ADMIN',
  'ADM_RECEPCION',
  'PROFESOR',
  'SOCIO_TITULAR',
  'FAMILIAR',
] as const;

export type AppRole = (typeof APP_ROLES)[number];

type RolBruto = string | string[] | null | undefined;

export type UsuarioConRoles =
  | {
      role?: RolBruto;
      roles?: RolBruto;
      userCompanyRoles?: readonly {
        companyUuid?: string;
        roles?: readonly {
          name?: string;
        }[];
      }[];
    }
  | null
  | undefined;

export function normalizarRolUsuario(usuario: UsuarioConRoles): AppRole | null {
  const roles = extraerRolesUsuario(usuario);
  return roles.length === 1 ? roles[0] : null;
}

export function obtenerRutaPrincipalPorRol(rol: AppRole | null): string {
  switch (rol) {
    case 'SYSADMIN':
      return '/sysadmin/nueva-empresa';
    case 'ADMIN':
      return '/admin/dashboard';
    case 'ADM_RECEPCION':
      return '/adm-recepcion/accesos';
    case 'PROFESOR':
      return '/profesor/eventos';
    case 'SOCIO_TITULAR':
      return '/socio-titular/credencial';
    case 'FAMILIAR':
      return '/socio-familiar/credencial';
    default:
      return '/login';
  }
}

export function usuarioTieneAlgunRol(
  usuario: UsuarioConRoles,
  rolesPermitidos: readonly AppRole[],
  rolActivo?: AppRole | null,
): boolean {
  if (rolActivo) {
    return extraerRolesUsuario(usuario).includes(rolActivo) && rolesPermitidos.includes(rolActivo);
  }

  return extraerRolesUsuario(usuario).some((rol) => rolesPermitidos.includes(rol));
}

export function extraerRolesUsuario(usuario: UsuarioConRoles): AppRole[] {
  if (!usuario) return [];

  const rolesNormalizados = new Set<AppRole>(normalizarFuentesRoles([usuario.role, usuario.roles]));
  for (const companyRole of usuario.userCompanyRoles ?? []) {
    for (const role of companyRole.roles ?? []) {
      const rol = normalizarValorRol(role.name ?? '');
      if (rol) rolesNormalizados.add(rol);
    }
  }

  return Array.from(rolesNormalizados);
}

export function extraerRolesGlobales(usuario: UsuarioConRoles): AppRole[] {
  if (!usuario) return [];
  return normalizarFuentesRoles([usuario.role, usuario.roles]);
}

export function extraerRolesEmpresa(usuario: UsuarioConRoles, companyUuid: string): AppRole[] {
  if (!usuario || !companyUuid.trim()) return [];

  const roles = new Set<AppRole>();
  for (const asignacion of usuario.userCompanyRoles ?? []) {
    if (asignacion.companyUuid?.trim() !== companyUuid.trim()) continue;
    for (const role of asignacion.roles ?? []) {
      const normalizado = normalizarValorRol(role.name ?? '');
      if (normalizado) roles.add(normalizado);
    }
  }

  return Array.from(roles);
}

function normalizarFuentesRoles(fuentes: readonly RolBruto[]): AppRole[] {
  const roles = new Set<AppRole>();
  for (const fuente of fuentes) {
    for (const valor of convertirEnLista(fuente)) {
      const rol = normalizarValorRol(valor);
      if (rol) roles.add(rol);
    }
  }
  return Array.from(roles);
}

function convertirEnLista(valor: RolBruto): string[] {
  if (Array.isArray(valor)) {
    return valor.filter((item): item is string => typeof item === 'string');
  }
  if (typeof valor === 'string') {
    return valor
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

export function normalizarValorRol(valor: string): AppRole | null {
  const rol = valor.trim().toUpperCase();
  if (APP_ROLES.includes(rol as AppRole)) return rol as AppRole;

  switch (rol) {
    case 'ROLE_ADMIN':
      return 'ADMIN';
    case 'RECEPCIONISTA':
    case 'ROLE_RECEPCIONISTA':
    case 'ROLE_ADM_RECEPCION':
      return 'ADM_RECEPCION';
    case 'INSTRUCTOR':
    case 'ROLE_INSTRUCTOR':
    case 'ROLE_PROFESOR':
      return 'PROFESOR';
    case 'MIEMBRO':
    case 'SOCIO':
    case 'MEMBER':
    case 'ROLE_MIEMBRO':
    case 'ROLE_SOCIO':
    case 'ROLE_SOCIO_TITULAR':
      return 'SOCIO_TITULAR';
    case 'ROLE_FAMILIAR':
      return 'FAMILIAR';
    case 'ROLE_SYSADMIN':
      return 'SYSADMIN';
    default:
      return null;
  }
}
