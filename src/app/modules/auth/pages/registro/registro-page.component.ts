import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { finalize } from 'rxjs';
import {
  provideGuestRouteIcons,
  provideToastIcons,
} from '../../../../core/icons/app-icons.registry';
import {
  FormularioRegistroComponent,
  FormularioRegistroValor,
} from '../../components/formulario-registro-persona/formulario-registro.component';
import { RegistroPersonaService } from '../../services/registro-persona.service';
import { EmpresaPublicaContextService } from '../../../../core/global-services/services/empresa-publica-context.service';
import { ColorThemeService } from '../../../ui/color-mod/color-theme.service';
import { DarkModeComponent } from '../../../ui/dark-mode/dark-mode.component';
import { PerformanceModeService } from '../../../ui/performance-mode.service';
import { ToastAlertComponent } from '../../../ui/toast-alert/components/toast-alert.component';
import { TEMPLATE_STARTER_CONFIG } from '../../../../template-starter.config';
import { BotonComponent } from '../../../ui/boton/boton.component';

const PATRON_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Component({
  selector: 'app-registro-page',
  standalone: true,
  imports: [
    BotonComponent,
    DarkModeComponent,
    FormularioRegistroComponent,
    NgIcon,
    RouterLink,
    ToastAlertComponent,
  ],
  providers: [provideGuestRouteIcons(), provideToastIcons()],
  templateUrl: './registro-page.component.html',
  styleUrl: './registro-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistroPageComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly empresaPublicaContext = inject(EmpresaPublicaContextService);
  private readonly registroPersonaService = inject(RegistroPersonaService);
  private readonly colorThemeService = inject(ColorThemeService);
  private readonly performanceModeService = inject(PerformanceModeService);
  private readonly formularioRegistro = viewChild(FormularioRegistroComponent);
  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  protected readonly appName = TEMPLATE_STARTER_CONFIG.appName;
  protected readonly logoMarcaAgua = computed(
    () =>
      (this.esRutaEmpresa ? this.empresaPublicaContext.logoUrl() : '') ||
      'assets/Logo BOP Solo.svg',
  );
  protected readonly esRutaEmpresa = this.route.snapshot.paramMap.has('companyName');

  protected readonly modalAbierto = signal(true);
  protected readonly registrando = signal(false);
  protected readonly errorRegistro = signal('');
  protected readonly solicitudEnviada = signal(false);
  protected readonly mostrarToastConexion = signal(false);
  protected readonly altoRendimiento = computed(() => !this.performanceModeService.desactivado());
  protected readonly companyUuid = computed(
    () =>
      this.esRutaEmpresa
        ? this.empresaPublicaContext.uuid()
        : (this.queryParams().get('companyUuid')?.trim() ?? ''),
  );
  protected readonly companyUuidValido = computed(() => PATRON_UUID.test(this.companyUuid()));
  protected readonly rutaLogin = computed(() =>
    this.esRutaEmpresa && this.empresaPublicaContext.path()
      ? `/${this.empresaPublicaContext.path()}/login`
      : '/login',
  );

  constructor() {
    this.colorThemeService.inicializar({ sincronizarBackend: false });
    if (!this.esRutaEmpresa) {
      this.empresaPublicaContext.limpiar();
      this.colorThemeService.restaurarPaletaBase();
    }
  }

  protected cerrarRegistro(): void {
    this.modalAbierto.set(false);
    void this.router.navigateByUrl(this.rutaLogin());
  }

  protected registrar(valor: FormularioRegistroValor): void {
    if (!this.companyUuidValido() || this.registrando()) return;

    this.errorRegistro.set('');
    this.registrando.set(true);

    this.registroPersonaService
      .registrarPersona(this.companyUuid(), valor)
      .pipe(finalize(() => this.registrando.set(false)))
      .subscribe({
        next: () => {
          this.formularioRegistro()?.resetearFormulario();
          this.errorRegistro.set('');
          this.solicitudEnviada.set(true);
        },
        error: (error: unknown) => {
          const mensaje =
            error instanceof Error ? error.message : 'No se pudo completar el registro.';
          if (this.esErrorConexion(mensaje)) {
            this.mostrarToastConexion.set(true);
            this.errorRegistro.set('');
            return;
          }

          this.errorRegistro.set(mensaje);
        },
      });
  }

  protected cerrarToastConexion(): void {
    this.mostrarToastConexion.set(false);
  }

  private esErrorConexion(mensaje: string): boolean {
    const valor = mensaje.trim().toLowerCase();
    return (
      valor.includes('failed to fetch') ||
      valor.includes('http failure response') ||
      valor.includes('unknown error')
    );
  }
}
