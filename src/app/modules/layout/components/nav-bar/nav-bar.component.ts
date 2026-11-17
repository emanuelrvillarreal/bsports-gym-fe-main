import { NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { filter as filtrarEventos, map as mapearEventos } from 'rxjs';
import { NgIcon } from '@ng-icons/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../../core/global-services/services/auth.service';
import { AuthSessionService } from '../../../../core/global-services/services/auth-session.service';
import { TEMPLATE_STARTER_CONFIG } from '../../../../template-starter.config';
import { obtenerColorTextoContraste } from '../../../../helpers/color-texto-contraste';
import { OpcionNavegacion } from './interfaces/navbar.interface';
import { GRUPOS_PORTAL, solapasVisibles } from '../../../_socios/grupos-portal';
import { APP_ROLES, AppRole, usuarioTieneAlgunRol } from '../../../../core/auth/auth-role';
import { LoadSpinnerComponent } from '../../../ui/load-spinner/load-spinner.component';
import { PerformanceModeService } from '../../../ui/performance-mode.service';
import { ColorThemeService } from '../../../ui/color-mod/color-theme.service';
import { IconosAppService } from '../../../../core/icons/iconos-app.service';
import { MenuSolapasService } from '../../../../core/global-services/services/menu-solapas.service';
import {
  RolAdministrativo,
  obtenerRutaBaseAdministrativa,
  obtenerSeccionesVisibles,
} from '../../../_administradores/secciones-administracion';

export type LadoMenu = 'izquierda' | 'derecha';

export function crearOpcionesPrincipales(rutaPrincipal: string): readonly OpcionNavegacion[] {
  return [
    {
      etiqueta: 'Panel',
      icono: 'dashboard',
      ruta: rutaPrincipal,
      roles: ['ADMIN'],
    },
  ];
}

/**
 * Menú corto del socio: una opción por grupo de GRUPOS_PORTAL (las pantallas del grupo se ven como solapas),
 * más "Mi perfil" al final. Cada opción queda resaltada en cualquier pantalla de su grupo.
 */
export function crearOpcionesPortalSocio(
  base: '/socio-titular' | '/socio-familiar',
  rol: 'SOCIO_TITULAR' | 'FAMILIAR',
): readonly OpcionNavegacion[] {
  const titular = base === '/socio-titular';
  const grupos = GRUPOS_PORTAL.flatMap((grupo) => {
    const solapas = solapasVisibles(grupo, titular);
    if (!solapas.length) return [];
    return [
      {
        etiqueta: grupo.etiqueta,
        icono: grupo.icono,
        ruta: `${base}/${solapas[0].segmento}`,
        activaEn: solapas.map((s) => `${base}/${s.segmento}`),
        roles: [rol],
      } satisfies OpcionNavegacion,
    ];
  });
  return [...grupos, { etiqueta: 'Mi perfil', icono: 'perfil', ruta: `${base}/perfil`, roles: [rol] }];
}

export function crearOpcionesProfesor(): readonly OpcionNavegacion[] {
  return [
    { etiqueta: 'Eventos', icono: 'eventos', ruta: '/profesor/eventos', roles: ['PROFESOR'] },
    {
      etiqueta: 'Mis actividades',
      icono: 'actividades',
      ruta: '/profesor/mis-actividades',
      roles: ['PROFESOR'],
    },
    {
      etiqueta: 'Mi credencial',
      icono: 'credencial',
      ruta: '/profesor/credencial',
      roles: ['PROFESOR'],
    },
    {
      etiqueta: 'Mi calendario',
      icono: 'calendario',
      ruta: '/profesor/calendario',
      roles: ['PROFESOR'],
    },
    {
      etiqueta: 'Asistencias',
      icono: 'actividades',
      ruta: '/profesor/asistencias',
      roles: ['PROFESOR'],
    },
    {
      etiqueta: 'Seguimiento de alumnos',
      icono: 'dashboard',
      ruta: '/profesor/seguimiento',
      roles: ['PROFESOR'],
    },
    {
      etiqueta: 'Entrenamiento',
      icono: 'eventos',
      ruta: '/profesor/entrenamiento',
      roles: ['PROFESOR'],
    },
    {
      etiqueta: 'Evaluaciones físicas',
      icono: 'certificados',
      ruta: '/profesor/evaluaciones',
      roles: ['PROFESOR'],
    },
    {
      etiqueta: 'Mis equipos',
      icono: 'eventos',
      ruta: '/profesor/mis-equipos',
      roles: ['PROFESOR'],
    },
    {
      etiqueta: 'Mi perfil',
      icono: 'perfil',
      ruta: '/profesor/perfil',
      roles: ['PROFESOR'],
    },
  ];
}

/**
 * Entradas del menú lateral para ADMIN o recepción: una por sección del catálogo que
 * conserve alguna solapa visible. Las pantallas de cada sección se eligen con sus solapas.
 */
export function crearOpcionesSeccionesAdministracion(
  rol: RolAdministrativo,
  ocultas: ReadonlySet<string>,
): readonly OpcionNavegacion[] {
  const rutaBase = obtenerRutaBaseAdministrativa(rol);
  return obtenerSeccionesVisibles(rol, ocultas).map((seccion) => ({
    etiqueta: seccion.etiqueta,
    icono: seccion.icono,
    ruta: `${rutaBase}/${seccion.segmento}`,
    roles: [rol],
  }));
}

@Component({
  selector: 'app-nav-bar',
  imports: [NgIcon, RouterLink, RouterLinkActive, NgOptimizedImage, LoadSpinnerComponent],
  templateUrl: './nav-bar.component.html',
  styleUrl: './nav-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavBarComponent {
  private static readonly LOGO_FALLBACK_URL = 'assets/Logo BOP Solo.svg';
  private readonly authService = inject(AuthService);
  private readonly authSessionService = inject(AuthSessionService);
  private readonly performanceModeService = inject(PerformanceModeService);
  private readonly colorTheme = inject(ColorThemeService);
  protected readonly iconos = inject(IconosAppService);
  private readonly menuSolapas = inject(MenuSolapasService);
  private readonly router = inject(Router);
  private readonly urlActual = toSignal(
    this.router.events.pipe(
      filtrarEventos((evento) => evento instanceof NavigationEnd),
      mapearEventos(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );

  /** Opción agrupada (portal del socio): activa en cualquiera de las pantallas de su grupo. */
  protected activaPorGrupo(opcion: OpcionNavegacion): boolean {
    const ruta = this.urlActual().split(/[?#]/)[0];
    return !!opcion.activaEn?.some((r) => ruta === r || ruta.startsWith(r + '/'));
  }
  private readonly mediaQueryMenuMovil =
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 42rem)') : null;
  protected readonly usarLogoFallback = signal(false);
  protected readonly logoUrl = computed(() => {
    const logoEmpresa = this.authSessionService.companyLogoUrl().trim();
    return this.usarLogoFallback() || !logoEmpresa
      ? NavBarComponent.LOGO_FALLBACK_URL
      : logoEmpresa;
  });
  protected readonly logoCargado = signal(false);
  protected readonly logoConError = signal(false);
  private readonly umbralArrastre = 60;
  private arrastreActivo = false;
  private punteroArrastre: number | null = null;
  private inicioX = 0;
  private inicioAbierto = true;

  readonly ladoMenu = input<LadoMenu>('izquierda');
  readonly menuAbierto = input(true);
  readonly transicionesHabilitadas = input(true);
  readonly cambioLadoMenu = output<LadoMenu>();
  readonly cambioEstadoMenu = output<boolean>();
  protected readonly altoRendimiento = computed(() => !this.performanceModeService.desactivado());
  protected readonly transicionesEfectivas = computed(
    () => this.transicionesHabilitadas() && !this.altoRendimiento(),
  );
  protected readonly colorTextoAlternador = computed(() =>
    obtenerColorTextoContraste(this.colorTheme.colorPrimario()),
  );
  protected readonly nombreMarca = computed(() => {
    return this.authSessionService.companyName().trim() || TEMPLATE_STARTER_CONFIG.appName;
  });

  constructor() {
    const rolActual = this.authService.obtenerRolUsuario();
    if (rolActual === 'ADMIN' || rolActual === 'ADM_RECEPCION') {
      this.menuSolapas.asegurarCargado().pipe(takeUntilDestroyed()).subscribe();
    }

    effect(() => {
      this.authSessionService.companyLogoUrl();
      this.usarLogoFallback.set(false);
      this.logoCargado.set(false);
      this.logoConError.set(false);
    });
  }

  protected readonly opcionesNavegacion = computed(() => {
    const usuario = this.authService.obtenerUsuarioGuardado();
    const esAdminDelegado =
      typeof this.authService.esAdminDelegadoDesdeSysadmin === 'function' &&
      this.authService.esAdminDelegadoDesdeSysadmin();
    const opcionesBase: readonly OpcionNavegacion[] = [
      ...crearOpcionesPrincipales(this.authService.obtenerRutaPrincipalUsuario()),
      {
        etiqueta: 'Nueva empresa',
        icono: 'nuevaEmpresa',
        ruta: '/sysadmin/nueva-empresa',
        roles: ['SYSADMIN'],
      },
      {
        etiqueta: 'Clubes',
        icono: 'cambiarEmpresa',
        ruta: '/sysadmin/clubes',
        roles: ['SYSADMIN'],
      },
      {
        etiqueta: 'Mercado Pago',
        icono: 'tesoreria',
        ruta: '/sysadmin/mercado-pago',
        roles: ['SYSADMIN'],
      },
      {
        etiqueta: 'CRM Manager',
        icono: 'tesoreria',
        ruta: '/sysadmin/crm-manager',
        roles: ['SYSADMIN'],
      },
      {
        etiqueta: 'Cuota social',
        icono: 'tesoreria',
        ruta: '/sysadmin/cuota-social',
        roles: ['SYSADMIN'],
      },
      {
        etiqueta: 'Configuración',
        icono: 'configuracion',
        ruta: '/sysadmin/configuracion',
        roles: ['SYSADMIN'],
      },
      ...crearOpcionesSeccionesAdministracion('ADMIN', this.menuSolapas.ocultas()),
      ...crearOpcionesSeccionesAdministracion('ADM_RECEPCION', this.menuSolapas.ocultas()),
      ...(esAdminDelegado
        ? [
            {
              etiqueta: 'Volver a SYSADMIN',
              icono: 'cambiarEmpresa',
              ruta: '/sysadmin/clubes',
            } satisfies OpcionNavegacion,
          ]
        : []),
      ...crearOpcionesPortalSocio('/socio-titular', 'SOCIO_TITULAR'),
      ...crearOpcionesProfesor(),
      ...crearOpcionesPortalSocio('/socio-familiar', 'FAMILIAR'),
      ...(this.authService.obtenerEmpresasDisponibles().length > 1
        ? [
            {
              etiqueta: 'Cambiar empresa',
              icono: 'cambiarEmpresa',
              ruta: '/seleccionar-empresa',
              roles: APP_ROLES,
            } satisfies OpcionNavegacion,
          ]
        : []),
      ...(this.authService.obtenerRolesEmpresaActiva().length > 1
        ? [
            {
              etiqueta: 'Cambiar rol',
              icono: 'cambiarRol',
              ruta: '/seleccionar-empresa',
              queryParams: { modo: 'roles' },
              roles: APP_ROLES,
            } satisfies OpcionNavegacion,
          ]
        : []),
    ];

    return opcionesBase.filter(
      (opcion) =>
        !opcion.roles?.length ||
        usuarioTieneAlgunRol(usuario, opcion.roles, this.authService.obtenerRolUsuario()) ||
        (esAdminDelegado && opcion.roles.includes('ADMIN')),
    );
  });

  protected alternarLadoMenu(): void {
    const nuevoLado: LadoMenu = this.ladoMenu() === 'izquierda' ? 'derecha' : 'izquierda';
    this.cambioLadoMenu.emit(nuevoLado);
  }

  protected alternarEstadoMenu(): void {
    this.cambioEstadoMenu.emit(!this.menuAbierto());
  }

  protected cerrarSesion(): void {
    this.cerrarMenuSiEsMovil();
    this.authService.logout().subscribe();
  }

  protected manejarSeleccionItem(): void {
    this.cerrarMenuSiEsMovil();
  }

  protected manejarLogoCargado(): void {
    this.logoCargado.set(true);
    this.logoConError.set(false);
  }

  protected manejarLogoError(): void {
    if (!this.usarLogoFallback() && this.authSessionService.companyLogoUrl().trim()) {
      this.usarLogoFallback.set(true);
      this.logoCargado.set(false);
      this.logoConError.set(false);
      return;
    }

    this.logoCargado.set(false);
    this.logoConError.set(true);
  }

  protected iniciarArrastre(evento: PointerEvent): void {
    if (evento.pointerType === 'mouse' && evento.button !== 0) {
      return;
    }

    const objetivo = evento.target as HTMLElement | null;
    if (objetivo?.closest('a,button,input,textarea,select,label')) {
      return;
    }

    this.arrastreActivo = true;
    this.punteroArrastre = evento.pointerId;
    this.inicioX = evento.clientX;
    this.inicioAbierto = this.menuAbierto();
  }

  @HostListener('window:pointerup', ['$event'])
  protected finalizarArrastre(evento: PointerEvent): void {
    if (!this.arrastreActivo || this.punteroArrastre !== evento.pointerId) {
      return;
    }

    const delta = evento.clientX - this.inicioX;
    const lado = this.ladoMenu();

    if (lado === 'izquierda') {
      if (this.inicioAbierto && delta < -this.umbralArrastre) {
        this.cambioEstadoMenu.emit(false);
      }
      if (!this.inicioAbierto && delta > this.umbralArrastre) {
        this.cambioEstadoMenu.emit(true);
      }
    } else {
      if (this.inicioAbierto && delta > this.umbralArrastre) {
        this.cambioEstadoMenu.emit(false);
      }
      if (!this.inicioAbierto && delta < -this.umbralArrastre) {
        this.cambioEstadoMenu.emit(true);
      }
    }

    this.arrastreActivo = false;
    this.punteroArrastre = null;
  }

  private cerrarMenuSiEsMovil(): void {
    if (!this.menuAbierto() || !this.mediaQueryMenuMovil?.matches) {
      return;
    }

    this.cambioEstadoMenu.emit(false);
  }
}
