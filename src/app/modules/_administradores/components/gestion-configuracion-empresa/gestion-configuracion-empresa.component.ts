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
import {
  ActualizarContactoEmpresaPayload,
  FormularioConfiguracionEmpresaComponent,
} from '../../forms/formulario-configuracion-empresa/formulario-configuracion-empresa.component';
import { BotonComponent } from '../../../ui/boton/boton.component';
import { CardComponent } from '../../../ui/card/card.component';
import { LoadSpinnerBlueComponent } from '../../../ui/load-spinner-blue/load-spinner-blue.component';
import { ColorThemeService } from '../../../ui/color-mod/color-theme.service';

const ROLES_PERMITIDOS = new Set(['ADMIN', 'SYSADMIN']);

@Component({
  selector: 'app-gestion-configuracion-empresa',
  standalone: true,
  imports: [
    BotonComponent,
    CardComponent,
    FormularioConfiguracionEmpresaComponent,
    LoadSpinnerBlueComponent,
  ],
  templateUrl: './gestion-configuracion-empresa.component.html',
  styleUrl: './gestion-configuracion-empresa.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GestionConfiguracionEmpresaComponent implements OnInit {
  private readonly perfilEmpresaActiva = inject(PerfilEmpresaActivaService);
  private readonly authSessionService = inject(AuthSessionService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly colorThemeService = inject(ColorThemeService);

  protected readonly perfil = signal<PerfilEmpresaDto | null>(null);
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly error = signal('');
  protected readonly bloqueado = computed(() => this.cargando() || this.guardando());

  ngOnInit(): void {
    this.cargarPerfil();
  }

  protected guardarConfiguracion(actualizacion: ActualizarContactoEmpresaPayload): void {
    this.guardar(actualizacion);
  }

  protected reintentar(): void {
    if (!this.bloqueado()) this.cargarPerfil();
  }

  private cargarPerfil(): void {
    if (!this.validarPermiso()) return;

    const companyUuid = this.authSessionService.obtenerCompanyUuid().trim();
    if (!companyUuid) {
      this.error.set('Selecciona una empresa antes de configurar su perfil.');
      return;
    }

    this.cargando.set(true);
    this.error.set('');
    this.perfilEmpresaActiva
      .obtenerPerfil(companyUuid)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cargando.set(false)),
      )
      .subscribe({
        next: (perfil) => this.perfil.set(perfil),
        error: () => this.error.set('No se pudo cargar el perfil institucional del gimnasio.'),
      });
  }

  private guardar(actualizacion: ActualizarContactoEmpresaPayload): void {
    if (this.bloqueado() || !this.validarPermiso()) return;

    const perfil = this.perfil();
    const companyUuid = this.authSessionService.obtenerCompanyUuid().trim();
    if (!perfil || !companyUuid) {
      this.error.set('No hay un perfil de empresa disponible para guardar los cambios.');
      return;
    }
    if (
      !perfil.domicilio ||
      !perfil.domicilioFacturacion ||
      !perfil.telefono ||
      !perfil.emailInstitucional ||
      perfil.cuotaSocialHabilitada === null
    ) {
      this.error.set('Completa el perfil del gimnasio antes de modificar su configuración.');
      return;
    }

    const payload = this.crearPayloadActualizado(perfil, actualizacion);
    this.guardando.set(true);
    this.error.set('');
    this.perfilEmpresaActiva
      .actualizarPerfil(companyUuid, payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.guardando.set(false)),
      )
      .subscribe({
        // La respuesta de PUT puede ser resumida; se conserva el snapshot completo enviado.
        next: () => this.perfil.set(payload),
        error: () => this.error.set('No se pudieron guardar los cambios del perfil institucional.'),
      });
  }

  private validarPermiso(): boolean {
    const rolActivo = this.authSessionService.obtenerRolActivo();
    if (rolActivo !== null && ROLES_PERMITIDOS.has(rolActivo)) return true;

    this.error.set('Tu rol activo no puede modificar la configuración institucional.');
    return false;
  }

  private extraerPayload(perfil: PerfilEmpresaDto): PerfilEmpresaPayload {
    const paleta = this.colorThemeService.obtenerPaletaPredeterminada();
    // GET puede devolver metadatos, como status, que no pertenecen al contrato del PUT.
    return {
      path: this.obtenerPath(perfil),
      nombreComercial: perfil.nombreComercial,
      razonSocial: perfil.razonSocial,
      cuit: perfil.cuit,
      domicilio: perfil.domicilio,
      domicilioFacturacion: perfil.domicilioFacturacion,
      telefono: perfil.telefono,
      emailFacturaElectronica: perfil.emailFacturaElectronica,
      emailInstitucional: perfil.emailInstitucional,
      colorPrimario: perfil.colorPrimario ?? paleta.primario,
      colorSecundario: perfil.colorSecundario ?? paleta.secundario,
      cuotaSocialHabilitada: perfil.cuotaSocialHabilitada,
      ...(perfil.periodicidadCuotaSocial !== undefined
        ? { periodicidadCuotaSocial: perfil.periodicidadCuotaSocial }
        : {}),
      ...(perfil.diasVencimientoCuota !== undefined
        ? { diasVencimientoCuota: perfil.diasVencimientoCuota }
        : {}),
      ...(perfil.diasVencimientoMoroso !== undefined
        ? { diasVencimientoMoroso: perfil.diasVencimientoMoroso }
        : {}),
      ...(perfil.diasInhabilitacion !== undefined
        ? { diasInhabilitacion: perfil.diasInhabilitacion }
        : {}),
    } as PerfilEmpresaPayload;
  }

  private obtenerPath(perfil: PerfilEmpresaDto): string {
    const pathActual = perfil.path?.trim();
    if (pathActual) return pathActual;

    return perfil.nombreComercial
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private crearPayloadActualizado(
    perfil: PerfilEmpresaDto,
    actualizacion: ActualizarContactoEmpresaPayload,
  ): PerfilEmpresaPayload {
    const payloadActual = this.extraerPayload(perfil);
    return { ...payloadActual, ...actualizacion };
  }
}
