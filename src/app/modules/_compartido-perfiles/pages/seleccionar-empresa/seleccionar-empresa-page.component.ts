import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { catchError, finalize, forkJoin, map, of } from 'rxjs';

import { ConfiguracionDto } from '../../../../core/api/interfaces/configuracion.interfaces';
import { ConfiguracionApiService } from '../../../../core/api/services/configuracion-api.service';
import { AppRole, obtenerRutaPrincipalPorRol } from '../../../../core/auth/auth-role';
import { AuthService } from '../../../../core/global-services/services/auth.service';
import { IconoApp, IconosAppService } from '../../../../core/icons/iconos-app.service';
import { provideLayoutIcons } from '../../../../core/icons/app-icons.registry';
import { formatearCuil } from '../../../../helpers/cuil-formato';
import { BotonComponent } from '../../../ui/boton/boton.component';
import { ColorHex, ColorThemeService, PaletaGuardada } from '../../../ui/color-mod/color-theme.service';
import { CardComponent } from '../../../ui/card/card.component';
import { LoadSpinnerBlueComponent } from '../../../ui/load-spinner-blue/load-spinner-blue.component';
import { TituloHeroComponent } from '../../../ui/titulo-hero/titulo-hero.component';

const ETIQUETAS_ROL: Readonly<Record<AppRole, string>> = {
  SYSADMIN: 'Administración del sistema',
  ADMIN: 'Administración del gimnasio',
  ADM_RECEPCION: 'Recepción',
  PROFESOR: 'Profesor',
  SOCIO_TITULAR: 'Mi cuenta de socio',
  FAMILIAR: 'Mi cuenta de socio',
};

/** Qué puede hacer con cada rol, en palabras simples. */
const DESCRIPCIONES_ROL: Readonly<Record<AppRole, string>> = {
  SYSADMIN: 'Manejar todos los gimnasios',
  ADMIN: 'Socios, cobros, actividades y todo el gimnasio',
  ADM_RECEPCION: 'Cobrar, registrar entradas y anotar socios',
  PROFESOR: 'Mis clases, asistencia y alumnos',
  SOCIO_TITULAR: 'Mi credencial, mis cuotas y mis actividades',
  FAMILIAR: 'Mi credencial y mis actividades',
};

const ICONOS_ROL: Readonly<Record<AppRole, IconoApp>> = {
  SYSADMIN: 'configuracion',
  ADMIN: 'dashboard',
  ADM_RECEPCION: 'recepcion',
  PROFESOR: 'profesores',
  SOCIO_TITULAR: 'credencial',
  FAMILIAR: 'grupoFamiliar',
};

@Component({
  selector: 'app-seleccionar-empresa-page',
  imports: [BotonComponent, CardComponent, LoadSpinnerBlueComponent, NgIcon, TituloHeroComponent],
  providers: [provideLayoutIcons()],
  templateUrl: './seleccionar-empresa-page.component.html',
  styleUrl: './seleccionar-empresa-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeleccionarEmpresaPageComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly configuracionApi = inject(ConfiguracionApiService);
  private readonly colorThemeService = inject(ColorThemeService);
  protected readonly iconos = inject(IconosAppService);

  protected readonly empresas = this.authService.obtenerEmpresasDisponibles();
  protected readonly paletas = signal<Readonly<Record<string, PaletaGuardada>>>({});
  protected readonly cargandoPaletas = signal(true);
  protected readonly empresaSeleccionadaUuid = signal<string | null>(null);
  protected readonly empresaSeleccionada = computed(() =>
    this.empresas.find((empresa) => empresa.uuid === this.empresaSeleccionadaUuid()) ?? null,
  );
  protected readonly mostrandoRoles = computed(() => this.empresaSeleccionada() !== null);
  protected readonly mostrarAtras = computed(() => this.mostrandoRoles() && this.empresas.length > 1);
  protected readonly titulo = computed(() =>
    this.mostrandoRoles() ? '¿Cómo querés entrar hoy?' : 'Seleccioná tu gimnasio',
  );
  protected readonly subtitulo = computed(() =>
    this.mostrandoRoles()
      ? `Tenés más de un rol en ${this.empresaSeleccionada()?.nombre ?? 'este club'}. Elegí uno; después podés cambiarlo desde el menú con "Cambiar rol".`
      : 'Elegí la organización con la que querés operar.',
  );
  protected readonly nombreUsuario = computed(() => {
    const usuario = this.authService.obtenerUsuarioGuardado();
    const nombre = usuario?.nombre?.trim() ?? '';
    const apellido = usuario?.apellido?.trim() ?? '';
    return [nombre, apellido].filter(Boolean).join(' ') || 'usuario';
  });

  private readonly paletaPredeterminada = this.colorThemeService.obtenerPaletaPredeterminada();

  constructor() {
    this.cargarPaletas();
    this.inicializarVista();
  }

  protected obtenerPaleta(companyUuid: string): PaletaGuardada {
    return this.paletas()[companyUuid] ?? this.paletaPredeterminada;
  }

  protected obtenerIniciales(nombre: string): string {
    return nombre
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((parte) => parte[0]?.toUpperCase() ?? '')
      .join('') || 'C';
  }

  protected readonly formatearCuil = formatearCuil;

  protected seleccionarEmpresa(companyUuid: string): void {
    const empresa = this.empresas.find((item) => item.uuid === companyUuid);
    if (!empresa) return;

    if (empresa.roles.length > 1) {
      this.empresaSeleccionadaUuid.set(empresa.uuid);
      return;
    }

    const [rol] = empresa.roles;
    if (
      rol &&
      this.authService.seleccionarEmpresa(empresa.uuid) &&
      this.authService.seleccionarRol(rol)
    ) {
      void this.router.navigateByUrl(obtenerRutaPrincipalPorRol(rol));
    }
  }

  protected seleccionarRol(rol: AppRole): void {
    const empresa = this.empresaSeleccionada();
    if (!empresa || !empresa.roles.includes(rol)) return;
    if (!this.authService.seleccionarEmpresa(empresa.uuid)) return;
    if (!this.authService.seleccionarRol(rol)) return;
    void this.router.navigateByUrl(obtenerRutaPrincipalPorRol(rol));
  }

  protected etiquetaRol(rol: AppRole): string {
    return ETIQUETAS_ROL[rol];
  }

  protected descripcionRol(rol: AppRole): string {
    return DESCRIPCIONES_ROL[rol];
  }

  protected iconoRol(rol: AppRole): IconoApp {
    return ICONOS_ROL[rol];
  }

  protected volverAEmpresas(): void {
    this.empresaSeleccionadaUuid.set(null);
    void this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: { modo: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected cerrarSesion(): void {
    this.authService.logout().subscribe();
  }

  private inicializarVista(): void {
    const empresaUnica = this.empresas.length === 1 ? this.empresas[0] : null;
    const solicitaRoles = this.activatedRoute.snapshot.queryParamMap.get('modo') === 'roles';
    const uuidActivo = this.authService.obtenerCompanyUuidActivo();
    const empresaActiva = this.empresas.find((empresa) => empresa.uuid === uuidActivo) ?? null;
    const empresaInicial = solicitaRoles ? empresaActiva : empresaUnica;

    if (!empresaInicial) return;
    this.seleccionarEmpresa(empresaInicial.uuid);
  }

  private cargarPaletas(): void {
    const solicitudes = this.empresas.map((empresa) =>
      this.configuracionApi.obtenerPorClave('branding.colors', empresa.uuid).pipe(
        map((configuracion) => [empresa.uuid, this.parsearPaleta(configuracion) ?? this.paletaPredeterminada] as const),
        catchError(() => of([empresa.uuid, this.paletaPredeterminada] as const)),
      ),
    );

    forkJoin(solicitudes)
      .pipe(finalize(() => this.cargandoPaletas.set(false)))
      .subscribe((paletas) => this.paletas.set(Object.fromEntries(paletas)));
  }

  private parsearPaleta(configuracion: ConfiguracionDto | null): PaletaGuardada | null {
    if (!configuracion?.value?.trim()) return null;

    try {
      const valor: unknown = JSON.parse(configuracion.value);
      if (typeof valor !== 'object' || valor === null) return null;

      const candidata = valor as Partial<PaletaGuardada>;
      if (!this.esColorHex(candidata.primario) || !this.esColorHex(candidata.secundario)) return null;

      return {
        primario: candidata.primario,
        secundario: candidata.secundario,
        terciario: this.esColorHex(candidata.terciario)
          ? candidata.terciario
          : this.paletaPredeterminada.terciario,
      };
    } catch {
      return null;
    }
  }

  private esColorHex(valor: unknown): valor is ColorHex {
    return typeof valor === 'string' && /^#[\da-fA-F]{6}$/.test(valor);
  }
}
