import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import {
  PerfilEmpresaDto,
  PerfilEmpresaPayload,
} from '../../../../core/api/interfaces/empresa.interfaces';
import { AuthSessionService } from '../../../../core/global-services/services/auth-session.service';
import { PerfilEmpresaActivaService } from '../../../_compartido-perfiles/services/perfil-empresa-activa.service';
import { BotonComponent } from '../../../ui/boton/boton.component';
import { CardComponent } from '../../../ui/card/card.component';
import { LoadSpinnerBlueComponent } from '../../../ui/load-spinner-blue/load-spinner-blue.component';
import { ColorThemeService } from '../../../ui/color-mod/color-theme.service';
import {
  ActualizarPlazosOperativosPayload,
  FormularioPlazosOperativosComponent,
} from '../../forms/formulario-plazos-operativos/formulario-plazos-operativos.component';

const ROLES_PERMITIDOS = new Set(['ADMIN', 'SYSADMIN']);

@Component({
  selector: 'app-gestion-plazos-operativos',
  standalone: true,
  imports: [
    BotonComponent,
    CardComponent,
    FormularioPlazosOperativosComponent,
    LoadSpinnerBlueComponent,
  ],
  templateUrl: './gestion-plazos-operativos.component.html',
  styleUrl: './gestion-plazos-operativos.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GestionPlazosOperativosComponent implements OnInit {
  private readonly perfilEmpresaActiva = inject(PerfilEmpresaActivaService);
  private readonly sesion = inject(AuthSessionService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly colorTheme = inject(ColorThemeService);

  protected readonly perfil = signal<PerfilEmpresaDto | null>(null);
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly error = signal('');
  protected readonly bloqueado = computed(() => this.cargando() || this.guardando());

  ngOnInit(): void {
    this.cargarPerfil();
  }

  protected guardarPlazos(actualizacion: ActualizarPlazosOperativosPayload): void {
    if (this.bloqueado() || !this.validarPermiso()) return;

    const perfil = this.perfil();
    const companyUuid = this.sesion.obtenerCompanyUuid().trim();
    if (!perfil || !companyUuid) {
      this.error.set('No hay un perfil de empresa disponible para guardar los plazos.');
      return;
    }
    if (
      !perfil.domicilio ||
      !perfil.domicilioFacturacion ||
      !perfil.telefono ||
      !perfil.emailInstitucional
    ) {
      this.error.set('Completa el perfil del gimnasio antes de modificar sus plazos operativos.');
      return;
    }

    const payload = this.crearPayload(perfil, actualizacion);
    this.guardando.set(true);
    this.error.set('');
    this.perfilEmpresaActiva
      .actualizarPerfil(companyUuid, payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.guardando.set(false)),
      )
      .subscribe({
        next: () => this.perfil.set({ ...perfil, ...payload }),
        error: () => this.error.set('No se pudieron guardar los plazos operativos.'),
      });
  }

  protected reintentar(): void {
    if (!this.bloqueado()) this.cargarPerfil(true);
  }

  private cargarPerfil(forzar = false): void {
    if (!this.validarPermiso()) return;
    const companyUuid = this.sesion.obtenerCompanyUuid().trim();
    if (!companyUuid) {
      this.error.set('Selecciona una empresa antes de configurar sus plazos operativos.');
      return;
    }

    this.cargando.set(true);
    this.error.set('');
    this.perfilEmpresaActiva
      .obtenerPerfil(companyUuid, { forzar })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cargando.set(false)),
      )
      .subscribe({
        next: (perfil) => this.perfil.set(perfil),
        error: () => this.error.set('No se pudo cargar el perfil del gimnasio.'),
      });
  }

  private validarPermiso(): boolean {
    const rol = this.sesion.obtenerRolActivo();
    if (rol && ROLES_PERMITIDOS.has(rol)) return true;
    this.error.set('Tu rol activo no puede modificar los plazos operativos.');
    return false;
  }

  private crearPayload(
    perfil: PerfilEmpresaDto,
    actualizacion: ActualizarPlazosOperativosPayload,
  ): PerfilEmpresaPayload {
    const paleta = this.colorTheme.obtenerPaletaPredeterminada();
    const path =
      perfil.path?.trim() ||
      perfil.nombreComercial
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    return {
      path,
      nombreComercial: perfil.nombreComercial,
      razonSocial: perfil.razonSocial,
      cuit: perfil.cuit,
      domicilio: perfil.domicilio!,
      domicilioFacturacion: perfil.domicilioFacturacion!,
      telefono: perfil.telefono!,
      emailFacturaElectronica: perfil.emailFacturaElectronica,
      emailInstitucional: perfil.emailInstitucional!,
      colorPrimario: perfil.colorPrimario ?? paleta.primario,
      colorSecundario: perfil.colorSecundario ?? paleta.secundario,
      cuotaSocialHabilitada: perfil.cuotaSocialHabilitada ?? false,
      ...actualizacion,
    };
  }
}
