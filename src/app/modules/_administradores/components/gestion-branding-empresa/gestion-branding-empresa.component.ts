import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import { EmpresaApiService } from '../../../../core/api/services/empresa-api.service';
import { AuthSessionService } from '../../../../core/global-services/services/auth-session.service';
import {
  FormularioRegistroFotoComponent,
  FormularioRegistroFotoValor,
} from '../../../auth/components/formulario-registro-foto/formulario-registro-foto.component';
import { BrandingEmpresaService } from '../../../_compartido-perfiles/services/branding-empresa.service';
import { CardComponent } from '../../../ui/card/card.component';
import { ColorModComponent } from '../../../ui/color-mod/color-mod.component';
import { PaletaGuardada } from '../../../ui/color-mod/color-theme.service';
import { LoadSpinnerBlueComponent } from '../../../ui/load-spinner-blue/load-spinner-blue.component';
import { ToastAlertService } from '../../../ui/toast-alert/services/toast-alert.service';

const ROLES_BRANDING = new Set(['ADMIN', 'SYSADMIN']);

@Component({
  selector: 'app-gestion-branding-empresa',
  standalone: true,
  imports: [
    CardComponent,
    ColorModComponent,
    FormularioRegistroFotoComponent,
    LoadSpinnerBlueComponent,
  ],
  templateUrl: './gestion-branding-empresa.component.html',
  styleUrl: './gestion-branding-empresa.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GestionBrandingEmpresaComponent implements OnInit {
  private readonly empresaApi = inject(EmpresaApiService);
  private readonly authSessionService = inject(AuthSessionService);
  private readonly brandingEmpresaService = inject(BrandingEmpresaService);
  private readonly toastAlert = inject(ToastAlertService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly logoUrl = this.authSessionService.companyLogoUrl;
  protected readonly paletaPersistida = this.brandingEmpresaService.paletaGuardada;
  protected readonly cargandoPaleta = signal(false);
  protected readonly guardandoPaleta = signal(false);
  protected readonly restableciendoPaleta = signal(false);
  protected readonly subiendoLogo = signal(false);
  protected readonly eliminandoLogo = signal(false);
  protected readonly confirmandoEliminacionLogo = signal(false);
  protected readonly procesandoLogo = computed(
    () => this.subiendoLogo() || this.eliminandoLogo() || this.confirmandoEliminacionLogo(),
  );
  protected readonly errorPaleta = signal('');
  protected readonly errorLogo = signal('');

  ngOnInit(): void {
    if (!this.puedeAdministrar()) return;

    this.cargandoPaleta.set(true);
    this.brandingEmpresaService.cargarPaletaEmpresaActiva()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cargandoPaleta.set(false)),
      )
      .subscribe({
        error: () => this.errorPaleta.set('No se pudieron cargar los colores de la empresa.'),
      });
  }

  protected guardarPaleta(paleta: PaletaGuardada): void {
    if (!this.validarPermiso('colores') || this.guardandoPaleta() || this.restableciendoPaleta()) {
      return;
    }

    this.errorPaleta.set('');
    this.guardandoPaleta.set(true);
    this.brandingEmpresaService.guardarPaleta(paleta)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.guardandoPaleta.set(false)),
      )
      .subscribe({
        error: () => this.errorPaleta.set('No se pudieron guardar los colores de la empresa.'),
      });
  }

  protected restablecerPaleta(paletaPredeterminada: PaletaGuardada): void {
    if (!this.validarPermiso('colores') || this.guardandoPaleta() || this.restableciendoPaleta()) {
      return;
    }

    this.errorPaleta.set('');
    this.restableciendoPaleta.set(true);
    this.brandingEmpresaService.guardarPaleta(paletaPredeterminada)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.restableciendoPaleta.set(false)),
      )
      .subscribe({
        error: () => this.errorPaleta.set('No se pudieron restablecer los colores de la empresa.'),
      });
  }

  protected subirLogo(valor: FormularioRegistroFotoValor): void {
    if (!this.validarPermiso('logo') || this.procesandoLogo()) return;

    const companyUuid = this.authSessionService.obtenerCompanyUuid().trim();
    if (!companyUuid) {
      this.errorLogo.set('Selecciona una empresa antes de reemplazar el logo.');
      return;
    }

    this.errorLogo.set('');
    this.subiendoLogo.set(true);
    this.empresaApi.subirLogo(companyUuid, valor.foto)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.subiendoLogo.set(false)),
      )
      .subscribe({
        next: (empresa) => {
          const logoUrl = empresa.logoUrl?.trim();
          if (!logoUrl) {
            this.errorLogo.set('El logo se guardo, pero la respuesta no incluyo su URL.');
            return;
          }
          this.authSessionService.actualizarCompanyLogoUrl(logoUrl);
        },
        error: () => this.errorLogo.set('No se pudo reemplazar el logo de la empresa.'),
      });
  }

  protected async eliminarLogo(): Promise<void> {
    if (!this.validarPermiso('logo') || this.procesandoLogo() || !this.logoUrl().trim()) return;

    const companyUuid = this.authSessionService.obtenerCompanyUuid().trim();
    if (!companyUuid) {
      this.errorLogo.set('Selecciona una empresa antes de borrar el logo.');
      return;
    }

    this.errorLogo.set('');
    this.confirmandoEliminacionLogo.set(true);
    const confirmado = await this.toastAlert.confirmDanger(
      'Esta accion eliminara el logo institucional de toda la aplicacion.',
      { titulo: 'Borrar logo', textoConfirmar: 'Borrar logo' },
    );
    this.confirmandoEliminacionLogo.set(false);

    if (!confirmado) return;

    this.eliminandoLogo.set(true);
    this.empresaApi.eliminarLogo(companyUuid)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.eliminandoLogo.set(false)),
      )
      .subscribe({
        next: () => this.authSessionService.actualizarCompanyLogoUrl(''),
        error: () => this.errorLogo.set('No se pudo borrar el logo de la empresa.'),
      });
  }

  private validarPermiso(recurso: 'colores' | 'logo'): boolean {
    if (this.puedeAdministrar()) return true;
    const mensaje = `Tu rol activo no puede modificar ${recurso === 'logo' ? 'el logo' : 'los colores'}.`;
    if (recurso === 'logo') this.errorLogo.set(mensaje);
    else this.errorPaleta.set(mensaje);
    return false;
  }

  private puedeAdministrar(): boolean {
    const rolActivo = this.authSessionService.obtenerRolActivo();
    return rolActivo !== null && ROLES_BRANDING.has(rolActivo);
  }
}
