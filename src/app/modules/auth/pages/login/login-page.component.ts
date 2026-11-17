import { DecoracionAuthComponent } from '../../components/decoracion-auth/decoracion-auth.component';
import { NgOptimizedImage } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  provideGuestRouteIcons,
  provideToastIcons,
} from '../../../../core/icons/app-icons.registry';
import { FormularioLoginComponent } from '../../components/formulario-login/formulario-login.component';
import { AuthSessionService } from '../../../../core/global-services/services/auth-session.service';
import { EmpresaPublicaContextService } from '../../../../core/global-services/services/empresa-publica-context.service';
import { ColorThemeService } from '../../../ui/color-mod/color-theme.service';
import { LoadSpinnerComponent } from '../../../ui/load-spinner/load-spinner.component';
import { PerformanceModeService } from '../../../ui/performance-mode.service';
import { TEMPLATE_STARTER_CONFIG } from '../../../../template-starter.config';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [DecoracionAuthComponent, FormularioLoginComponent, NgOptimizedImage, LoadSpinnerComponent],
  providers: [provideGuestRouteIcons(), provideToastIcons()],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss',
})
export class LoginPageComponent {
  private static readonly LOGO_FALLBACK_URL = 'assets/Logo BOP Solo.svg';
  private readonly authSessionService = inject(AuthSessionService);
  private readonly route = inject(ActivatedRoute);
  protected readonly empresaPublicaContext = inject(EmpresaPublicaContextService);
  private readonly colorThemeService = inject(ColorThemeService);
  private readonly performanceModeService = inject(PerformanceModeService);
  protected readonly appName = TEMPLATE_STARTER_CONFIG.appName;
  protected readonly esRutaEmpresa = this.route.snapshot.paramMap.has('companyName');
  protected readonly logoUrl = computed(
    () =>
      (this.esRutaEmpresa
        ? this.empresaPublicaContext.logoUrl()
        : this.authSessionService.companyLogoUrl().trim()) || LoginPageComponent.LOGO_FALLBACK_URL,
  );
  protected readonly nombreEmpresa = computed(
    () =>
      (this.esRutaEmpresa
        ? this.empresaPublicaContext.nombreComercial()
        : this.authSessionService.companyName().trim()) || this.appName,
  );
  protected readonly logoCargado = signal(false);
  protected readonly logoConError = signal(false);
  protected readonly altoRendimiento = computed(() => !this.performanceModeService.desactivado());

  constructor() {
    this.colorThemeService.inicializar({ sincronizarBackend: false });
    if (!this.esRutaEmpresa) {
      this.empresaPublicaContext.limpiar();
      this.colorThemeService.restaurarPaletaBase();
    }

    effect(() => {
      this.logoUrl();
      this.logoCargado.set(false);
      this.logoConError.set(false);
    });
  }

  protected manejarLogoCargado(): void {
    this.logoCargado.set(true);
    this.logoConError.set(false);
  }

  protected manejarLogoError(): void {
    this.logoCargado.set(false);
    this.logoConError.set(true);
  }
}
