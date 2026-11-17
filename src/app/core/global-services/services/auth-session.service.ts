import { Injectable, signal } from '@angular/core';

import { AppRole } from '../../auth/auth-role';
import { TokensSesion, UsuarioSesion } from '../interfaces/auth-session-service.interfaces';

const CLAVE_ACCESS_TOKEN = 'auth.accessToken';
const CLAVE_REFRESH_TOKEN = 'auth.refreshToken';
const CLAVE_USUARIO = 'auth.userData';
const CLAVE_COMPANY_UUID_MANUAL = 'auth.companyUuid.manual';
const CLAVE_COMPANY_UUID_ACTIVA = 'auth.companyUuid.active';
const CLAVE_ROL_ACTIVO = 'auth.role.active';
const CLAVE_COMPANY_LOGO_URL = 'auth.companyLogoUrl';
const CLAVE_COMPANY_NAME = 'auth.companyName';
const CLAVE_ULTIMA_COMPANY_UUID_BRANDING = 'branding.lastCompanyUuid';
const PREFIJO_AVISO_FACTURA_PENDIENTE = 'aviso-factura-pendiente:';

/**
 * Servicio responsable de almacenar, exponer y limpiar el estado local de sesion.
 */
@Injectable({
  providedIn: 'root',
})
export class AuthSessionService {
  private readonly accessToken = signal('');
  private readonly refreshToken = signal('');
  private readonly usuario = signal<UsuarioSesion | null>(null);
  private readonly revisionFotoPerfilState = signal(0);
  private readonly companyLogoUrlState = signal('');
  private readonly companyNameState = signal('');
  readonly companyLogoUrl = this.companyLogoUrlState.asReadonly();
  readonly companyName = this.companyNameState.asReadonly();

  constructor() {
    this.limpiarPersistenciaLegadaSinRefreshToken();
    this.limpiarBrandingContextualLegado();
    this.hidratarCompanyLogoPersistido();
    this.hidratarCompanyNamePersistido();
  }

  obtenerAccessToken(): string {
    return this.accessToken();
  }

  obtenerRefreshToken(): string {
    const tokenEnMemoria = this.refreshToken();
    if (tokenEnMemoria) {
      return tokenEnMemoria;
    }

    return this.obtenerRefreshTokenPersistido();
  }

  guardarTokens(tokens: TokensSesion): void {
    if (!tokens.accessToken || !tokens.refreshToken) {
      return;
    }

    this.accessToken.set(tokens.accessToken);
    this.refreshToken.set(tokens.refreshToken);
    this.persistirRefreshToken(tokens.refreshToken);
  }

  guardarUsuario(usuario: UsuarioSesion): void {
    this.usuario.set(usuario);
    this.sincronizarCompanyNameDesdeUsuario(usuario);
    this.sincronizarCompanyLogoDesdeUsuario(usuario);
  }

  obtenerUsuario(): UsuarioSesion | null {
    return this.usuario();
  }

  /**
   * Devuelve la foto de sesión con una revisión de caché para que las vistas ya montadas
   * reemplacen la imagen luego de subirla, aun si el backend conserva la misma URL.
   */
  obtenerUrlFotoPerfilActualizada(fotoAlternativa = ''): string {
    const fotoSesion = this.usuario()?.imageUrl?.trim() ?? '';
    const foto = fotoSesion || fotoAlternativa.trim();
    if (!foto) return '';

    const separador = foto.includes('?') ? '&' : '?';
    return `${foto}${separador}revision=${this.revisionFotoPerfilState()}`;
  }

  marcarFotoPerfilActualizada(): void {
    this.revisionFotoPerfilState.update((revision) => revision + 1);
  }

  actualizarBloqueoEmpresa(companyUuid: string, bloqueada: boolean): void {
    const uuid = companyUuid.trim();
    const usuario = this.usuario();
    if (!uuid || !usuario?.userCompanyRoles?.length) return;

    let encontrada = false;
    const asignaciones = usuario.userCompanyRoles.map((asignacion) => {
      if (asignacion.companyUuid?.trim() !== uuid) return asignacion;
      encontrada = true;
      return { ...asignacion, companyBlocked: bloqueada };
    });

    if (encontrada) this.usuario.set({ ...usuario, userCompanyRoles: asignaciones });
  }

  obtenerCompanyUuid(): string {
    return this.obtenerCompanyUuidActivo() || this.obtenerCompanyUuidManualPersistido();
  }

  guardarCompanyUuidActivo(companyUuid: string): void {
    const limpio = companyUuid.trim();
    if (!this.esNavegador()) return;

    if (!limpio) {
      sessionStorage.removeItem(CLAVE_COMPANY_UUID_ACTIVA);
      this.guardarRolActivo(null);
      return;
    }

    sessionStorage.setItem(CLAVE_COMPANY_UUID_ACTIVA, limpio);
    this.guardarRolActivo(null);
    this.hidratarBrandingEmpresaActiva();
    const usuario = this.usuario();
    this.sincronizarCompanyNameDesdeUsuario(usuario);
    this.sincronizarCompanyLogoDesdeUsuario(usuario);
  }

  obtenerCompanyUuidActivo(): string {
    if (!this.esNavegador()) return '';
    return (sessionStorage.getItem(CLAVE_COMPANY_UUID_ACTIVA) ?? '').trim();
  }

  guardarRolActivo(rol: AppRole | null): void {
    if (!this.esNavegador()) return;
    if (!rol) {
      sessionStorage.removeItem(CLAVE_ROL_ACTIVO);
      return;
    }
    sessionStorage.setItem(CLAVE_ROL_ACTIVO, rol);
  }

  obtenerRolActivo(): AppRole | null {
    if (!this.esNavegador()) return null;
    const rol = (sessionStorage.getItem(CLAVE_ROL_ACTIVO) ?? '').trim();
    return rol ? rol as AppRole : null;
  }

  limpiarContextoActivo(): void {
    if (!this.esNavegador()) return;
    sessionStorage.removeItem(CLAVE_COMPANY_UUID_ACTIVA);
    sessionStorage.removeItem(CLAVE_ROL_ACTIVO);
  }

  guardarCompanyUuidManual(companyUuid: string): void {
    const limpio = companyUuid.trim();
    if (!this.esNavegador()) {
      return;
    }

    if (!limpio) {
      sessionStorage.removeItem(CLAVE_COMPANY_UUID_MANUAL);
      return;
    }

    sessionStorage.setItem(CLAVE_COMPANY_UUID_MANUAL, limpio);
  }

  obtenerCompanyUuidManual(): string {
    return this.obtenerCompanyUuidManualPersistido();
  }

  obtenerCompanyUuidBranding(): string {
    return this.obtenerCompanyUuid();
  }

  obtenerCompanyLogoUrl(): string {
    const logoEnMemoria = this.companyLogoUrlState();
    if (logoEnMemoria) {
      return logoEnMemoria;
    }

    return this.obtenerCompanyLogoUrlPersistido();
  }

  actualizarCompanyLogoUrl(logoUrl: string | null | undefined): void {
    const limpio = typeof logoUrl === 'string' ? logoUrl.trim() : '';
    this.companyLogoUrlState.set(limpio);

    if (!this.esNavegador()) return;

    try {
      if (limpio) {
        localStorage.setItem(CLAVE_COMPANY_LOGO_URL, limpio);
      } else {
        localStorage.removeItem(CLAVE_COMPANY_LOGO_URL);
      }
    } catch {
      // El signal sigue siendo la fuente disponible si el storage esta bloqueado.
    }
  }

  obtenerCompanyName(): string {
    const nombreEnMemoria = this.companyNameState();
    if (nombreEnMemoria) {
      return nombreEnMemoria;
    }

    return this.obtenerCompanyNamePersistido();
  }

  actualizarAccessToken(accessToken: string): void {
    this.accessToken.set(accessToken);
  }

  limpiarSesion(): void {
    this.accessToken.set('');
    this.refreshToken.set('');
    this.usuario.set(null);
    this.limpiarPersistenciaCompleta();
  }

  private limpiarPersistenciaLegadaSinRefreshToken(): void {
    if (!this.esNavegador()) {
      return;
    }

    sessionStorage.removeItem(CLAVE_ACCESS_TOKEN);
    localStorage.removeItem(CLAVE_USUARIO);
  }

  /** El branding es global: elimina el cache historico que se separaba por UUID. */
  private limpiarBrandingContextualLegado(): void {
    if (!this.esNavegador()) return;

    try {
      const prefijos = [`${CLAVE_COMPANY_LOGO_URL}.`, `${CLAVE_COMPANY_NAME}.`];
      for (let indice = localStorage.length - 1; indice >= 0; indice -= 1) {
        const clave = localStorage.key(indice);
        if (clave && prefijos.some((prefijo) => clave.startsWith(prefijo))) {
          localStorage.removeItem(clave);
        }
      }
      localStorage.removeItem(CLAVE_ULTIMA_COMPANY_UUID_BRANDING);
    } catch {
      // El branding global sigue disponible si el storage esta bloqueado.
    }
  }

  private hidratarCompanyLogoPersistido(): void {
    const persistido = this.obtenerCompanyLogoUrlPersistido();
    if (persistido) {
      this.companyLogoUrlState.set(persistido);
    }
  }

  private hidratarCompanyNamePersistido(): void {
    const persistido = this.obtenerCompanyNamePersistido();
    if (persistido) {
      this.companyNameState.set(persistido);
    }
  }

  private limpiarPersistenciaCompleta(): void {
    if (!this.esNavegador()) {
      return;
    }

    // Solucion puente: por ahora solo persistimos el refresh token para poder
    // rehidratar la sesion al hacer F5. Cuando backend pase a cookie HttpOnly,
    // esta persistencia en sessionStorage deberia eliminarse.
    sessionStorage.removeItem(CLAVE_REFRESH_TOKEN);
    for (let indice = sessionStorage.length - 1; indice >= 0; indice -= 1) {
      const clave = sessionStorage.key(indice);
      if (clave?.startsWith(PREFIJO_AVISO_FACTURA_PENDIENTE)) sessionStorage.removeItem(clave);
    }
    this.limpiarContextoActivo();
    this.limpiarPersistenciaLegadaSinRefreshToken();
  }

  private persistirRefreshToken(refreshToken: string): void {
    if (!this.esNavegador()) {
      return;
    }

    sessionStorage.setItem(CLAVE_REFRESH_TOKEN, refreshToken);
  }

  private obtenerRefreshTokenPersistido(): string {
    if (!this.esNavegador()) {
      return '';
    }

    const token = sessionStorage.getItem(CLAVE_REFRESH_TOKEN) ?? '';
    if (token) {
      this.refreshToken.set(token);
    }

    return token;
  }

  private sincronizarCompanyLogoDesdeUsuario(usuario: UsuarioSesion | null): void {
    const logoNuevo = this.extraerCompanyLogoUrl(usuario);
    if (!logoNuevo) {
      return;
    }

    const logoActual = this.obtenerCompanyLogoUrlPersistido();
    if (logoActual === logoNuevo) {
      if (this.companyLogoUrlState() !== logoNuevo) {
        this.companyLogoUrlState.set(logoNuevo);
      }
      return;
    }

    this.persistirCompanyLogoUrl(logoNuevo);
  }

  private sincronizarCompanyNameDesdeUsuario(usuario: UsuarioSesion | null): void {
    const nombreNuevo = this.extraerCompanyName(usuario);
    if (!nombreNuevo) {
      return;
    }

    const nombreActual = this.obtenerCompanyNamePersistido();
    if (nombreActual === nombreNuevo) {
      if (this.companyNameState() !== nombreNuevo) {
        this.companyNameState.set(nombreNuevo);
      }
      return;
    }

    this.persistirCompanyName(nombreNuevo);
  }

  private extraerCompanyLogoUrl(usuario: UsuarioSesion | null): string {
    const companyUuid = this.obtenerCompanyUuid();
    const asignaciones = usuario?.userCompanyRoles ?? [];
    const asignacion = companyUuid
      ? asignaciones.find((item) => item.companyUuid?.trim() === companyUuid)
      : asignaciones.length === 1 ? asignaciones[0] : undefined;
    // El login vigente devuelve `logoUrl`; se conserva `companyLogoUrl` por compatibilidad.
    const logo = asignacion?.logoUrl ?? asignacion?.companyLogoUrl;
    return typeof logo === 'string' ? logo.trim() : '';
  }

  private extraerCompanyName(usuario: UsuarioSesion | null): string {
    const companyUuid = this.obtenerCompanyUuid();
    const asignaciones = usuario?.userCompanyRoles ?? [];
    const asignacion = companyUuid
      ? asignaciones.find((item) => item.companyUuid?.trim() === companyUuid)
      : asignaciones.length === 1 ? asignaciones[0] : undefined;
    const nombre = asignacion?.companyName;
    return typeof nombre === 'string' ? nombre.trim() : '';
  }

  private persistirCompanyLogoUrl(logoUrl: string): void {
    if (!this.esNavegador()) {
      return;
    }

    const limpio = logoUrl.trim();
    if (!limpio) {
      return;
    }

    try {
      localStorage.setItem(CLAVE_COMPANY_LOGO_URL, limpio);
      this.companyLogoUrlState.set(limpio);
    } catch {
      this.companyLogoUrlState.set(limpio);
    }
  }

  private obtenerCompanyLogoUrlPersistido(): string {
    if (!this.esNavegador()) {
      return this.companyLogoUrlState();
    }

    try {
      const persistido = (localStorage.getItem(CLAVE_COMPANY_LOGO_URL) ?? '').trim();
      if (persistido && this.companyLogoUrlState() !== persistido) {
        this.companyLogoUrlState.set(persistido);
      }
      return persistido;
    } catch {
      return this.companyLogoUrlState();
    }
  }

  private persistirCompanyName(companyName: string): void {
    if (!this.esNavegador()) {
      return;
    }

    const limpio = companyName.trim();
    if (!limpio) {
      return;
    }

    try {
      localStorage.setItem(CLAVE_COMPANY_NAME, limpio);
      this.companyNameState.set(limpio);
    } catch {
      this.companyNameState.set(limpio);
    }
  }

  private obtenerCompanyNamePersistido(): string {
    if (!this.esNavegador()) {
      return this.companyNameState();
    }

    try {
      const persistido = (localStorage.getItem(CLAVE_COMPANY_NAME) ?? '').trim();
      if (persistido && this.companyNameState() !== persistido) {
        this.companyNameState.set(persistido);
      }
      return persistido;
    } catch {
      return this.companyNameState();
    }
  }

  private obtenerCompanyUuidManualPersistido(): string {
    if (!this.esNavegador()) {
      return '';
    }

    return (sessionStorage.getItem(CLAVE_COMPANY_UUID_MANUAL) ?? '').trim();
  }

  private hidratarBrandingEmpresaActiva(): void {
    this.companyLogoUrlState.set(this.obtenerCompanyLogoUrlPersistido());
    this.companyNameState.set(this.obtenerCompanyNamePersistido());
  }

  private esNavegador(): boolean {
    return typeof window !== 'undefined' && typeof sessionStorage !== 'undefined';
  }
}
