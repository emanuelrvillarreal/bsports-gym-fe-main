import { DecoracionAuthComponent } from '../../components/decoracion-auth/decoracion-auth.component';
import { isPlatformBrowser, NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { finalize } from 'rxjs';

import {
  provideGuestRouteIcons,
  provideToastIcons,
} from '../../../../core/icons/app-icons.registry';
import { ResetPassPayload } from '../../../../core/global-services/interfaces/auth-service.interfaces';
import { AuthSessionService } from '../../../../core/global-services/services/auth-session.service';
import { TEMPLATE_STARTER_CONFIG } from '../../../../template-starter.config';
import { FormularioCambioContrasenaComponent } from '../../components/formulario-cambio-contrasena/formulario-cambio-contrasena.component';
import { LoginService } from '../../services/login.service';
import { ColorThemeService } from '../../../ui/color-mod/color-theme.service';
import { LoadSpinnerComponent } from '../../../ui/load-spinner/load-spinner.component';
import { PerformanceModeService } from '../../../ui/performance-mode.service';

const LOGO_FALLBACK_URL = 'assets/Logo BOP Solo.svg';
const CLAVES_CODE = ['code', 'Code', 'CODE', 'token', 'Token', 'TOKEN'];
const CLAVES_USUARIO = ['user', 'username', 'usuario'];
const CLAVES_EMAIL = ['email', 'mail'];

@Component({
  selector: 'app-recuperar-contrasena-page',
  standalone: true,
  imports: [
    DecoracionAuthComponent,
    FormularioCambioContrasenaComponent,
    NgOptimizedImage,
    LoadSpinnerComponent,
  ],
  providers: [provideGuestRouteIcons(), provideToastIcons()],
  templateUrl: './recuperar-contrasena-page.component.html',
  styleUrl: '../login/login-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecuperarContrasenaPageComponent {
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly loginService = inject(LoginService);
  private readonly authSessionService = inject(AuthSessionService);
  private readonly colorThemeService = inject(ColorThemeService);
  private readonly performanceModeService = inject(PerformanceModeService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly esNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly appName = TEMPLATE_STARTER_CONFIG.appName;
  protected readonly logoUrl = computed(
    () => this.authSessionService.companyLogoUrl().trim() || LOGO_FALLBACK_URL,
  );
  protected readonly nombreEmpresa = computed(
    () => this.authSessionService.companyName().trim() || this.appName,
  );
  protected readonly logoCargado = signal(false);
  protected readonly logoConError = signal(false);
  protected readonly altoRendimiento = computed(() => !this.performanceModeService.desactivado());
  protected readonly usuario = signal('');
  protected readonly email = signal('');
  protected readonly code = signal('');
  protected readonly cargando = signal(false);
  protected readonly mensajeError = signal('');

  protected readonly linkValido = computed(() => !!this.email().trim() && !!this.code().trim());

  constructor() {
    this.colorThemeService.inicializar({ sincronizarBackend: false });

    effect(() => {
      this.logoUrl();
      this.logoCargado.set(false);
      this.logoConError.set(false);
    });

    this.activatedRoute.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        this.aplicarParametrosRecuperacion(params);
      });
  }

  protected volverALogin(): void {
    void this.router.navigateByUrl('/login');
  }

  protected restablecerContrasena(payload: ResetPassPayload): void {
    if (this.cargando() || !this.linkValido()) {
      return;
    }

    this.cargando.set(true);
    this.mensajeError.set('');

    this.loginService
      .cambiarContrasenaConToken(payload)
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: () => {
          void this.router.navigateByUrl('/login');
        },
        error: (error: unknown) => {
          this.mensajeError.set(
            error instanceof Error ? error.message : 'No se pudo restablecer la contrasena.',
          );
        },
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

  private aplicarParametrosRecuperacion(params: ParamMap): void {
    const usuario = this.primerValor(params, CLAVES_USUARIO);
    const email =
      this.primerValor(params, CLAVES_EMAIL) || this.emailDesdeUsuario(usuario);
    const code =
      this.primerValor(params, CLAVES_CODE) || this.valorDesdeLocation(CLAVES_CODE);

    this.usuario.set(usuario);
    this.email.set(email);
    this.code.set(code);

    if (!this.linkValido()) {
      this.mensajeError.set('El enlace de recuperacion no contiene los datos necesarios.');
      return;
    }

    this.mensajeError.set('');
  }

  private primerValor(params: ParamMap, claves: readonly string[]): string {
    for (const clave of claves) {
      const valor = params.get(clave)?.trim();
      if (valor) {
        return valor;
      }
    }

    return '';
  }

  private emailDesdeUsuario(usuario: string): string {
    return usuario.includes('@') ? usuario : '';
  }

  private valorDesdeLocation(claves: readonly string[]): string {
    if (!this.esNavegador) {
      return '';
    }

    try {
      const busqueda = new URLSearchParams(window.location.search);
      for (const clave of claves) {
        const valor = busqueda.get(clave)?.trim();
        if (valor) {
          return valor;
        }
      }
    } catch {
      return '';
    }

    return '';
  }
}
