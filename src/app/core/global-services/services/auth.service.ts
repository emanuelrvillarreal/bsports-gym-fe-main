import { HttpClient, HttpContext, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  Observable,
  catchError,
  finalize,
  map,
  of,
  retry,
  shareReplay,
  switchMap,
  tap,
  timer,
  throwError,
} from 'rxjs';

import {
  AppRole,
  extraerRolesEmpresa,
  extraerRolesGlobales,
  extraerRolesUsuario,
  normalizarValorRol,
  obtenerRutaPrincipalPorRol,
} from '../../auth/auth-role';
import { API_ROUTES } from '../../api/api-routes';
import { crearApiUrl } from '../../api/api-url';
import { extraerMensajeErrorApi } from '../../api/error-api';
import { OMITIR_AUTH } from '../../interceptors/context/auth-context';
import { conCompanyUuid, conHeadersExtra, sinCompanyUuid } from '../../interceptors/context/http-headers-context';
import { MOSTRAR_TOAST_ERROR, MOSTRAR_TOAST_EXITO } from '../../interceptors/context/http-toast-context';
import {
  ForgotPasswordPayload,
  FinishLoginPayload,
  LoginPayload,
  PerfilUsuarioPayload,
  RefreshPayload,
  RegistroFamiliarPayload,
  RegistroUsuarioPayload,
  ResetPassPayload,
  StartLoginPayload,
  StartLoginResponse,
  TokensAuthResponse,
  UserDataResponse,
} from '../interfaces/auth-service.interfaces';
import { EmpresaSesionDisponible, UsuarioSesion } from '../interfaces/auth-session-service.interfaces';
import { AuthSessionService } from './auth-session.service';

const CLAVE_MENU_ABIERTO = 'b-spots.navBar.abierto';
const CANTIDAD_MAXIMA_REINTENTOS_REFRESH = 2;
const DEMORAS_REINTENTO_REFRESH_MS = [500, 1500] as const;

/**
 * Servicio responsable de la logica de autenticacion y de la comunicacion con el backend.
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly authSessionService = inject(AuthSessionService);
  private refreshEnCurso$: Observable<string> | null = null;
  private rehidratacionEnCurso$: Observable<boolean> | null = null;

  registrarUsuario(payload: RegistroUsuarioPayload): Observable<unknown> {
    const user: RegistroUsuarioPayload = {
      nombre: payload.nombre.trim(),
      apellido: payload.apellido.trim(),
      email: payload.email.trim().toLowerCase(),
      password: payload.password,
    };

    return this.http.post(crearApiUrl(API_ROUTES.auth.registrarPublico), { user }, {
      context: new HttpContext()
        .set(OMITIR_AUTH, true)
        .set(MOSTRAR_TOAST_EXITO, { titulo: 'Registro' })
        .set(MOSTRAR_TOAST_ERROR, { titulo: 'Registro' }),
    }).pipe(
      catchError((error) => this.transformarErrorHttp(error)),
    );
  }

  registrarFamiliar(payload: RegistroFamiliarPayload): Observable<unknown> {
    return this.http.post(crearApiUrl(API_ROUTES.authTemplateLegado.agregarFamiliar), this.normalizarPayloadFamiliar(payload), {
      context: new HttpContext()
        .set(MOSTRAR_TOAST_EXITO, { titulo: 'Familiares' })
        .set(MOSTRAR_TOAST_ERROR, { titulo: 'Familiares' }),
    }).pipe(
      catchError((error) => this.transformarErrorHttp(error)),
    );
  }

  login(payload: LoginPayload): Observable<TokensAuthResponse> {
    const companyUuid = payload.companyUuid?.trim() ?? '';
    // El formulario de login ya informa el error junto a los campos. Como el
    // host global no existe en rutas públicas, un toast del interceptor queda
    // pendiente y se muestra recién al entrar al layout autenticado.
    const contextoBase = new HttpContext().set(OMITIR_AUTH, true);
    const contextoLogin = companyUuid
      ? conCompanyUuid(contextoBase, companyUuid)
      : conHeadersExtra(sinCompanyUuid(contextoBase), { 'X-Company-Uuid': '' });
    const bodyLogin = {
      username: payload.username,
      password: payload.password,
    } satisfies Pick<LoginPayload, 'username' | 'password'>;

    return this.http.post<TokensAuthResponse>(crearApiUrl(API_ROUTES.auth.login), bodyLogin, {
      context: contextoLogin,
    }).pipe(
      tap((respuesta) => {
        const usuario = this.extraerUsuarioSesionDesdeAutenticacion(respuesta);
        if (usuario) {
          this.authSessionService.guardarUsuario(usuario);
        }
      }),
      map((respuesta) => this.normalizarTokens(respuesta)),
      tap((tokens) => this.authSessionService.guardarTokens(tokens)),
      switchMap((tokens) =>
        this.obtenerUserData().pipe(
          tap((usuario) => this.authSessionService.guardarUsuario(usuario)),
          map(() => tokens),
        ),
      ),
      catchError((error) => this.transformarErrorHttp(error)),
    );
  }

  solicitarLoginSinContrasena(payload: StartLoginPayload): Observable<void> {
    const solicitud: StartLoginPayload = {
      email: payload.email.trim().toLowerCase(),
      ...(payload.path?.trim() ? { path: payload.path.trim() } : {}),
    };

    return this.http.post<StartLoginResponse>(
      crearApiUrl(API_ROUTES.auth.startLogin),
      solicitud,
      { context: sinCompanyUuid(new HttpContext().set(OMITIR_AUTH, true)) },
    ).pipe(
      map(() => void 0),
      catchError((error) => this.transformarErrorHttp(error)),
    );
  }

  canjearLoginSinContrasena(code: string): Observable<TokensAuthResponse> {
    const payload: FinishLoginPayload = { code: code.trim() };

    return this.http.post<TokensAuthResponse>(
      crearApiUrl(API_ROUTES.auth.finishLogin),
      payload,
      { context: sinCompanyUuid(new HttpContext().set(OMITIR_AUTH, true)) },
    ).pipe(
      tap((respuesta) => {
        const usuario = this.extraerUsuarioSesionDesdeAutenticacion(respuesta);
        if (usuario) {
          this.authSessionService.guardarUsuario(usuario);
        }
      }),
      map((respuesta) => this.normalizarTokens(respuesta)),
      tap((tokens) => this.authSessionService.guardarTokens(tokens)),
      switchMap((tokens) =>
        this.obtenerUserData().pipe(
          tap((usuario) => this.authSessionService.guardarUsuario(usuario)),
          map(() => tokens),
        ),
      ),
      catchError((error) => this.transformarErrorHttp(error)),
    );
  }

  rehidratarSesion(): Observable<boolean> {
    if (this.estaAutenticado() && this.obtenerUsuarioGuardado()) {
      this.validarContextoActivo();
      return of(true);
    }

    if (this.rehidratacionEnCurso$) {
      return this.rehidratacionEnCurso$;
    }

    // Solucion puente: mientras no exista refresh token en cookie HttpOnly,
    // rehidratamos la sesion usando el refresh token persistido en sessionStorage.
    // Cuando backend migre a cookie, este flujo deberia apoyarse en esa cookie.
    const rehidratacion$ = this.rehidratarDesdeSesionActual().pipe(
      catchError(() => {
        this.authSessionService.limpiarSesion();
        return of(false);
      }),
      finalize(() => {
        this.rehidratacionEnCurso$ = null;
      }),
      shareReplay(1),
    );

    this.rehidratacionEnCurso$ = rehidratacion$;
    return rehidratacion$;
  }

  obtenerUserData(): Observable<UsuarioSesion> {
    return this.http.get<UserDataResponse>(crearApiUrl(API_ROUTES.auth.sessionActual), {
      context: this.crearContextoCompany(),
    }).pipe(
      map((respuesta) => this.normalizarUsuarioSesion(respuesta)),
      catchError((error) => this.transformarErrorHttp(error)),
    );
  }

  refrescarEstadoSesion(): Observable<UsuarioSesion> {
    return this.obtenerUserData().pipe(
      tap((usuario) => this.authSessionService.guardarUsuario(usuario)),
      tap(() => this.validarContextoActivo()),
    );
  }

  subirFotoPerfil(archivo: File): Observable<UsuarioSesion> {
    const formData = new FormData();
    formData.append('file', archivo);

    return this.http
      .post<UserDataResponse>(crearApiUrl(API_ROUTES.auth.subirFotoPerfil), formData, {
        context: this.crearContextoCompany()
          .set(MOSTRAR_TOAST_EXITO, { titulo: 'Foto de perfil actualizada' })
          .set(MOSTRAR_TOAST_ERROR, { titulo: 'Foto de perfil' }),
      })
      .pipe(
        map((respuesta) => this.fusionarUsuarioSesion(respuesta)),
        tap((usuario) => {
          this.authSessionService.guardarUsuario(usuario);
          this.authSessionService.marcarFotoPerfilActualizada();
        }),
        catchError((error) => this.transformarErrorHttp(error)),
      );
  }

  eliminarFotoPerfil(): Observable<UsuarioSesion> {
    return this.http
      .delete<UserDataResponse>(crearApiUrl(API_ROUTES.auth.eliminarFotoPerfil), {
        context: this.crearContextoCompany()
          .set(MOSTRAR_TOAST_EXITO, { titulo: 'Foto de perfil eliminada' })
          .set(MOSTRAR_TOAST_ERROR, { titulo: 'Foto de perfil' }),
      })
      .pipe(
        map((respuesta) => this.fusionarUsuarioSesion(respuesta)),
        tap((usuario) => {
          this.authSessionService.guardarUsuario(usuario);
          this.authSessionService.marcarFotoPerfilActualizada();
        }),
        catchError((error) => this.transformarErrorHttp(error)),
      );
  }

  actualizarPerfilUsuario(payload: PerfilUsuarioPayload): Observable<UsuarioSesion> {
    const perfilNormalizado: PerfilUsuarioPayload = {
      nombre: payload.nombre.trim(),
      apellido: payload.apellido.trim(),
      dni: payload.dni.trim(),
      sexo: payload.sexo?.trim() || undefined,
      fechaNacimiento: payload.fechaNacimiento?.trim() || undefined,
      localidad: payload.localidad?.trim() || undefined,
      direccion: payload.direccion?.trim() || undefined,
      telefono: payload.telefono?.trim() || undefined,
      email: payload.email.trim(),
    };

    return this.http.put<unknown>(
      crearApiUrl(API_ROUTES.authTemplateLegado.perfilUsuario),
      {
        ...perfilNormalizado,
        user: perfilNormalizado,
      },
      {
        context: this.crearContextoCompany()
          .set(MOSTRAR_TOAST_EXITO, { titulo: 'Mi perfil' })
          .set(MOSTRAR_TOAST_ERROR, { titulo: 'Mi perfil' }),
      },
    ).pipe(
      switchMap(() => this.obtenerUserData()),
      tap((usuario) => this.authSessionService.guardarUsuario(usuario)),
      catchError((error) => this.transformarErrorHttp(error)),
    );
  }

  cambiarContrasena(payload: ResetPassPayload): Observable<void> {
    return this.http.post(
      crearApiUrl(API_ROUTES.auth.resetPass),
      payload,
      {
        context: new HttpContext()
          .set(OMITIR_AUTH, true)
          .set(MOSTRAR_TOAST_EXITO, { titulo: 'Contrasena' })
          .set(MOSTRAR_TOAST_ERROR, { titulo: 'Contrasena' }),
      },
    ).pipe(
      map(() => void 0),
      catchError((error) => this.transformarErrorHttp(error)),
    );
  }

  solicitarRecuperacionContrasena(payload: ForgotPasswordPayload): Observable<void> {
    return this.http.post(
      crearApiUrl(API_ROUTES.auth.forgotPassword),
      payload,
      {
        context: new HttpContext()
          .set(OMITIR_AUTH, true)
          .set(MOSTRAR_TOAST_EXITO, { titulo: 'Contrasena' })
          .set(MOSTRAR_TOAST_ERROR, { titulo: 'Contrasena' }),
      },
    ).pipe(
      map(() => void 0),
      catchError((error) => this.transformarErrorHttp(error)),
    );
  }

  refrescarAccessToken(): Observable<string> {
    if (this.refreshEnCurso$) {
      return this.refreshEnCurso$;
    }

    const refreshToken = this.authSessionService.obtenerRefreshToken();
    if (!refreshToken) {
      this.limpiarSesionLocal();
      return throwError(() => new Error('No existe refresh token para renovar la sesion.'));
    }

    this.refreshEnCurso$ = this.http
      .post<Partial<TokensAuthResponse>>(crearApiUrl(API_ROUTES.auth.refresh), { refresh: refreshToken } satisfies RefreshPayload, {
        context: new HttpContext().set(OMITIR_AUTH, true),
      })
      .pipe(
        map((respuesta) => {
          const tokens = this.normalizarTokens(respuesta, refreshToken);
          this.authSessionService.guardarTokens(tokens);
          return tokens.accessToken;
        }),
        retry({
          count: CANTIDAD_MAXIMA_REINTENTOS_REFRESH,
          // Un refresh puede fallar transitoriamente por red, saturacion o por
          // una validacion eventual del backend. Los errores de contrato no se
          // reintentan porque nunca se resolverian con la misma request.
          delay: (error: unknown, numeroReintento) =>
            esErrorRefreshReintentable(error)
              ? timer(obtenerDemoraReintentoRefresh(numeroReintento))
              : throwError(() => error),
        }),
        catchError((error) => {
          this.limpiarSesionLocal();
          return throwError(() => error);
        }),
        finalize(() => {
          this.refreshEnCurso$ = null;
        }),
        shareReplay(1),
      );

    return this.refreshEnCurso$;
  }

  logout(): Observable<void> {
    this.cerrarMenuPersistido();
    this.limpiarSesionLocal();
    void this.router.navigateByUrl('/login');
    return of(void 0);
  }

  obtenerAccessToken(): string {
    return this.authSessionService.obtenerAccessToken();
  }

  obtenerRefreshToken(): string {
    return this.authSessionService.obtenerRefreshToken();
  }

  estaAutenticado(): boolean {
    return !!this.obtenerAccessToken();
  }

  obtenerUsuarioGuardado(): UsuarioSesion | null {
    return this.authSessionService.obtenerUsuario();
  }

  obtenerRolUsuario(): AppRole | null {
    const rolActivo = this.authSessionService.obtenerRolActivo();
    if (!rolActivo) return null;
    if (this.rolPerteneceAlContexto(rolActivo) || this.esAdminDelegadoDesdeSysadmin()) {
      return rolActivo;
    }
    return null;
  }

  obtenerRutaPrincipalUsuario(): string {
    return obtenerRutaPrincipalPorRol(this.obtenerRolUsuario());
  }

  obtenerEmpresasDisponibles(): readonly EmpresaSesionDisponible[] {
    const usuario = this.obtenerUsuarioGuardado();
    const empresas = new Map<string, EmpresaSesionDisponible>();

    for (const asignacion of usuario?.userCompanyRoles ?? []) {
      const uuid = asignacion.companyUuid?.trim() ?? '';
      if (!uuid) continue;

      const existente = empresas.get(uuid);
      const roles = new Set<AppRole>(existente?.roles ?? []);
      for (const rol of extraerRolesEmpresa(usuario, uuid)) roles.add(rol);
      empresas.set(uuid, {
        uuid,
        nombre: asignacion.companyName?.trim() || existente?.nombre || 'Empresa sin nombre',
        cuit: asignacion.companyCuit ?? existente?.cuit,
        logoUrl: asignacion.logoUrl ?? asignacion.companyLogoUrl ?? existente?.logoUrl,
        roles: Array.from(roles),
      });
    }

    return Array.from(empresas.values()).filter((empresa) => empresa.roles.length > 0);
  }

  obtenerRolesEmpresaActiva(): readonly AppRole[] {
    if (this.esAdminDelegadoDesdeSysadmin()) return ['ADMIN'];

    const companyUuid = this.authSessionService.obtenerCompanyUuidActivo();
    return companyUuid
      ? extraerRolesEmpresa(this.obtenerUsuarioGuardado(), companyUuid)
      : extraerRolesGlobales(this.obtenerUsuarioGuardado());
  }

  obtenerCompanyUuidActivo(): string {
    return this.authSessionService.obtenerCompanyUuidActivo();
  }

  empresaActivaBloqueada(): boolean {
    const companyUuid = this.obtenerCompanyUuidActivo();
    if (!companyUuid) return false;

    return this.obtenerUsuarioGuardado()?.userCompanyRoles?.some(
      (asignacion) =>
        asignacion.companyUuid?.trim() === companyUuid && asignacion.companyBlocked === true,
    ) ?? false;
  }

  marcarEmpresaActivaBloqueada(bloqueada: boolean): void {
    this.authSessionService.actualizarBloqueoEmpresa(this.obtenerCompanyUuidActivo(), bloqueada);
  }

  /**
   * Abre una empresa como ADMIN únicamente para un SYSADMIN autenticado.
   * El backend sigue siendo la autoridad final; este contexto solo prepara el
   * rol activo y el X-Company-Uuid que usarán las llamadas del club.
   */
  entrarComoAdminDesdeSysadmin(companyUuid: string): boolean {
    const uuid = companyUuid.trim();
    if (!uuid || !this.tieneRolGlobal('SYSADMIN')) return false;

    this.authSessionService.guardarCompanyUuidActivo(uuid);
    this.authSessionService.guardarRolActivo('ADMIN');
    return true;
  }

  esAdminDelegadoDesdeSysadmin(): boolean {
    return (
      this.tieneRolGlobal('SYSADMIN') &&
      this.authSessionService.obtenerRolActivo() === 'ADMIN' &&
      !!this.authSessionService.obtenerCompanyUuidActivo()
    );
  }

  volverAlContextoSysadmin(): boolean {
    if (!this.esAdminDelegadoDesdeSysadmin()) return false;

    this.authSessionService.guardarCompanyUuidActivo('');
    this.authSessionService.guardarRolActivo('SYSADMIN');
    return true;
  }

  tieneRolGlobal(rol: AppRole): boolean {
    const usuario = this.obtenerUsuarioGuardado();
    if (extraerRolesGlobales(usuario).includes(rol)) return true;

    // El login vigente informa SYSADMIN dentro de userCompanyRoles[].roles[].name.
    // Se acepta esa forma solo para SYSADMIN: los roles de cada club no deben
    // convertirse accidentalmente en permisos globales.
    return rol === 'SYSADMIN' && extraerRolesUsuario(usuario).includes('SYSADMIN');
  }

  seleccionarEmpresa(companyUuid: string): boolean {
    const empresa = this.obtenerEmpresasDisponibles().find((item) => item.uuid === companyUuid.trim());
    if (!empresa) return false;
    this.authSessionService.guardarCompanyUuidActivo(empresa.uuid);
    return true;
  }

  seleccionarRol(rol: AppRole): boolean {
    if (this.obtenerEmpresasDisponibles().length > 0 && !this.obtenerCompanyUuidActivo()) return false;
    if (!this.obtenerRolesEmpresaActiva().includes(rol)) return false;
    this.authSessionService.guardarRolActivo(rol);
    return true;
  }

  limpiarContextoActivo(): void {
    this.authSessionService.limpiarContextoActivo();
  }

  resolverRutaPostAutenticacion(): string {
    this.validarContextoActivo();
    const empresas = this.obtenerEmpresasDisponibles();
    const companyUuidActivo = this.authSessionService.obtenerCompanyUuidActivo();

    if (empresas.length > 1 && !companyUuidActivo) return '/seleccionar-empresa';

    if (empresas.length === 1 && !companyUuidActivo) {
      this.authSessionService.guardarCompanyUuidActivo(empresas[0].uuid);
    }

    const roles = this.obtenerRolesEmpresaActiva();
    const rolActivo = this.obtenerRolUsuario();
    if (rolActivo) return obtenerRutaPrincipalPorRol(rolActivo);
    if (roles.length > 1) return '/seleccionar-empresa';
    if (roles.length === 1 && this.seleccionarRol(roles[0])) {
      return obtenerRutaPrincipalPorRol(roles[0]);
    }

    return '/login';
  }

  validarContextoActivo(): void {
    const companyUuid = this.authSessionService.obtenerCompanyUuidActivo();
    if (companyUuid && !this.obtenerEmpresasDisponibles().some((empresa) => empresa.uuid === companyUuid)) {
      this.authSessionService.limpiarContextoActivo();
      return;
    }

    const rolPersistido = this.authSessionService.obtenerRolActivo();
    if (rolPersistido && (!normalizarValorRol(rolPersistido) || !this.rolPerteneceAlContexto(rolPersistido))) {
      this.authSessionService.guardarRolActivo(null);
    }
  }

  private rolPerteneceAlContexto(rol: AppRole): boolean {
    return this.obtenerRolesEmpresaActiva().includes(rol);
  }

  private crearContextoCompany(): HttpContext {
    const companyUuid = this.authSessionService.obtenerCompanyUuid();
    return companyUuid
      ? conCompanyUuid(new HttpContext(), companyUuid)
      : new HttpContext();
  }

  private normalizarPayloadFamiliar(payload: RegistroFamiliarPayload): Record<string, unknown> {
    const mail = payload.email.trim();
    const telefono = payload.telefono?.trim() || undefined;

    return {
      ...payload,
      email: mail,
      mail,
      telefono,
      phone: telefono,
    };
  }

  private limpiarSesionLocal(): void {
    this.refreshEnCurso$ = null;
    this.rehidratacionEnCurso$ = null;
    this.authSessionService.limpiarSesion();
  }

  private rehidratarDesdeSesionActual(): Observable<boolean> {
    if (this.estaAutenticado()) {
      return this.obtenerUserData().pipe(
        tap((usuario) => {
          this.authSessionService.guardarUsuario(usuario);
          this.validarContextoActivo();
        }),
        map(() => true),
      );
    }

    const refreshToken = this.authSessionService.obtenerRefreshToken();
    if (!refreshToken) {
      return of(false);
    }

    return this.refrescarAccessToken().pipe(
      switchMap(() => this.obtenerUserData()),
      tap((usuario) => {
        this.authSessionService.guardarUsuario(usuario);
        this.validarContextoActivo();
      }),
      map(() => true),
    );
  }

  private transformarErrorHttp(error: unknown): Observable<never> {
    if (error instanceof HttpErrorResponse) {
      return throwError(() => new Error(this.extraerMensajeError(error)));
    }

    return throwError(() => (error instanceof Error ? error : new Error('Ocurrio un error inesperado.')));
  }

  private extraerMensajeError(error: HttpErrorResponse): string {
    return extraerMensajeErrorApi(error, 'No se pudo completar la operacion de autenticacion.');
  }

  private normalizarTokens(
    respuesta: Partial<TokensAuthResponse>,
    refreshTokenFallback = '',
  ): { accessToken: string; refreshToken: string } {
    const data = this.aObjeto(respuesta.data);
    const origenTokens = this.contieneCamposToken(data) ? data as Partial<TokensAuthResponse> : respuesta;
    const accessToken = this.limpiarToken(
      origenTokens.accessToken
      ?? origenTokens.token
      ?? origenTokens.access_token
      ?? '',
    );
    const refreshToken = this.limpiarToken(
      origenTokens.refreshToken
      ?? origenTokens.refresh
      ?? origenTokens.refresh_token
      ?? refreshTokenFallback,
    );

    if (!accessToken) {
      throw new Error('La respuesta de autenticacion no incluyo un access token valido.');
    }

    if (!refreshToken) {
      throw new Error('La respuesta de autenticacion no incluyo un refresh token valido.');
    }

    return { accessToken, refreshToken };
  }

  private extraerUsuarioSesionDesdeAutenticacion(respuesta: Partial<TokensAuthResponse>): UsuarioSesion | null {
    const candidatos: unknown[] = [
      respuesta,
      respuesta.data,
      this.aObjeto(respuesta)?.['user'],
      this.aObjeto(respuesta.data)?.['user'],
    ];

    for (const candidato of candidatos) {
      const usuario = this.normalizarUsuarioSesionParcial(candidato);
      if (usuario) {
        return usuario;
      }
    }

    return null;
  }

  private normalizarUsuarioSesion(respuesta: UserDataResponse): UsuarioSesion {
    const usuario = (respuesta.data ?? respuesta) as UsuarioSesion;

    return {
      ...usuario,
      role: usuario.role ?? (typeof respuesta.role !== 'undefined' ? respuesta.role : undefined),
      roles: usuario.roles ?? (typeof respuesta.roles !== 'undefined' ? respuesta.roles : undefined),
    };
  }

  private fusionarUsuarioSesion(respuesta: UserDataResponse): UsuarioSesion {
    const actual = this.authSessionService.obtenerUsuario() ?? {};
    const actualizado = this.normalizarUsuarioSesion(respuesta);
    const camposDefinidos = Object.fromEntries(
      Object.entries(actualizado).filter(([, valor]) => valor !== undefined),
    ) as UsuarioSesion;

    return {
      ...actual,
      ...camposDefinidos,
      userCompanyRoles: camposDefinidos.userCompanyRoles ?? actual.userCompanyRoles,
    };
  }

  private normalizarUsuarioSesionParcial(origen: unknown): UsuarioSesion | null {
    const usuario = this.aObjeto(origen) as UsuarioSesion | null;
    if (!usuario) {
      return null;
    }

    const tieneCompanyUuid = typeof usuario.userCompanyRoles?.[0]?.companyUuid === 'string'
      && usuario.userCompanyRoles[0].companyUuid.trim().length > 0;
    const tieneIdentidad = typeof usuario.email === 'string'
      || typeof usuario.nombre === 'string'
      || typeof usuario.apellido === 'string'
      || typeof usuario.dni === 'string';

    return tieneCompanyUuid || tieneIdentidad ? usuario : null;
  }

  private contieneCamposToken(valor: unknown): boolean {
    const objeto = this.aObjeto(valor);
    if (!objeto) {
      return false;
    }

    return [
      objeto['accessToken'],
      objeto['refreshToken'],
      objeto['token'],
      objeto['refresh'],
      objeto['access_token'],
      objeto['refresh_token'],
    ].some((token) => typeof token === 'string' && token.trim().length > 0);
  }

  private aObjeto(valor: unknown): Record<string, unknown> | null {
    return typeof valor === 'object' && valor !== null ? valor as Record<string, unknown> : null;
  }

  private limpiarToken(valor: unknown): string {
    if (typeof valor !== 'string') {
      return '';
    }

    const limpio = valor.trim();
    return limpio && limpio !== 'undefined' && limpio !== 'null' ? limpio : '';
  }

  private cerrarMenuPersistido(): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }

    try {
      localStorage.setItem(CLAVE_MENU_ABIERTO, 'false');
    } catch {
      return;
    }
  }
}

function esErrorRefreshReintentable(error: unknown): boolean {
  if (!(error instanceof HttpErrorResponse)) {
    return false;
  }

  return error.status === 0
    || error.status === 401
    || error.status === 408
    || error.status === 429
    || error.status >= 500;
}

function obtenerDemoraReintentoRefresh(numeroReintento: number): number {
  return DEMORAS_REINTENTO_REFRESH_MS[numeroReintento - 1]
    ?? DEMORAS_REINTENTO_REFRESH_MS[DEMORAS_REINTENTO_REFRESH_MS.length - 1];
}
