import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterOutlet } from '@angular/router';
import { BrandingEmpresaService } from '../../../_compartido-perfiles/services/branding-empresa.service';
import { ColorThemeService } from '../../../ui/color-mod/color-theme.service';
import { DriverOnboardingService } from '../../../ui/driver-onboarding/driver-onboarding.service';
import { ToastAlertHostComponent } from '../../../ui/toast-alert/components/toast-alert-host.component';
import { provideLayoutIcons, provideToastIcons } from '../../../../core/icons/app-icons.registry';
import { HeaderComponent } from '../header/header.component';
import { SolapaNavegable, SolapasComponent } from '../../../ui/solapas/solapas.component';
import { LadoMenu, NavBarComponent } from '../nav-bar/nav-bar.component';

// Se conservan las claves históricas para no perder preferencias guardadas en navegadores existentes.
const CLAVE_LADO_MENU = 'b-spots.navBar.ladoMenu';
const CLAVE_MENU_ABIERTO = 'b-spots.navBar.abierto';

@Component({
  selector: 'app-layout-main',
  imports: [RouterOutlet, NavBarComponent, HeaderComponent, SolapasComponent, ToastAlertHostComponent],
  providers: [provideLayoutIcons(), provideToastIcons()],
  templateUrl: './layout-main.component.html',
  styleUrl: './layout-main.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayoutMainComponent implements OnInit, OnDestroy {
  /** Solapas del grupo de pantallas actual (portal del socio); vacío = sin barra. */
  readonly solapas = input<readonly SolapaNavegable[]>([]);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly brandingEmpresaService = inject(BrandingEmpresaService);
  private readonly colorThemeService = inject(ColorThemeService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly driverOnboardingService = inject(DriverOnboardingService);
  private readonly esNavegador = isPlatformBrowser(this.platformId);
  private habilitarTransicionesTimeout: ReturnType<typeof setTimeout> | null = null;

  protected readonly ladoMenu = signal<LadoMenu>(this.obtenerLadoMenuInicial());
  protected readonly menuAbierto = signal(this.obtenerEstadoMenuInicial());
  protected readonly transicionesMenuHabilitadas = signal(false);

  ngOnInit(): void {
    this.colorThemeService.inicializar({ sincronizarBackend: false });
    this.brandingEmpresaService.cargarPaletaEmpresaActiva()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ error: () => void 0 });
    this.driverOnboardingService.inicializarSeguimientoRutas();

    if (!this.esNavegador) {
      return;
    }

    this.habilitarTransicionesTimeout = setTimeout(() => {
      this.transicionesMenuHabilitadas.set(true);
      this.habilitarTransicionesTimeout = null;
    }, 300);
  }

  ngOnDestroy(): void {
    if (!this.habilitarTransicionesTimeout) {
      return;
    }

    clearTimeout(this.habilitarTransicionesTimeout);
    this.habilitarTransicionesTimeout = null;
  }

  protected actualizarLadoMenu(lado: LadoMenu): void {
    this.ladoMenu.set(lado);
    this.guardarLadoMenu(lado);
  }

  protected actualizarEstadoMenu(abierto: boolean): void {
    this.menuAbierto.set(abierto);
    this.guardarEstadoMenu(abierto);
  }

  private obtenerLadoMenuInicial(): LadoMenu {
    if (!this.esNavegador) {
      return 'izquierda';
    }

    try {
      const ladoGuardado = localStorage.getItem(CLAVE_LADO_MENU);

      return ladoGuardado === 'derecha' || ladoGuardado === 'izquierda'
        ? ladoGuardado
        : 'izquierda';
    } catch {
      return 'izquierda';
    }
  }

  private guardarLadoMenu(lado: LadoMenu): void {
    if (!this.esNavegador) {
      return;
    }

    try {
      localStorage.setItem(CLAVE_LADO_MENU, lado);
    } catch {
      return;
    }
  }

  private obtenerEstadoMenuInicial(): boolean {
    if (!this.esNavegador) {
      return true;
    }

    try {
      const estado = localStorage.getItem(CLAVE_MENU_ABIERTO);
      return estado === 'false' ? false : true;
    } catch {
      return true;
    }
  }

  private guardarEstadoMenu(abierto: boolean): void {
    if (!this.esNavegador) {
      return;
    }

    try {
      localStorage.setItem(CLAVE_MENU_ABIERTO, String(abierto));
    } catch {
      return;
    }
  }
}
