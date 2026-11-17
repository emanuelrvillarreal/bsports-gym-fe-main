import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, Observable } from 'rxjs';

import { ActualizarPerfilPortalPayload, PerfilPersonalDto, PerfilPortalDto } from '../../../../core/api/interfaces/portal.interfaces';
import { ProfesorDto } from '../../../../core/api/interfaces/usuarios-internos.interfaces';
import { PortalProfesorApiService } from '../../../../core/api/services/portal-profesor-api.service';
import { PortalSocioApiService } from '../../../../core/api/services/portal-socio-api.service';
import { AuthService } from '../../../../core/global-services/services/auth.service';
import { BotonComponent } from '../../../ui/boton/boton.component';
import { CardComponent } from '../../../ui/card/card.component';
import { LoadSpinnerBlueComponent } from '../../../ui/load-spinner-blue/load-spinner-blue.component';
import { FormularioDatosPersonalesComponent } from '../../forms/formulario-datos-personales/formulario-datos-personales.component';

type PerfilActual = PerfilPortalDto | ProfesorDto;

@Component({
  selector: 'app-gestion-mi-perfil',
  standalone: true,
  imports: [BotonComponent, CardComponent, FormularioDatosPersonalesComponent, LoadSpinnerBlueComponent],
  templateUrl: './gestion-mi-perfil.component.html',
  styleUrl: './gestion-mi-perfil.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GestionMiPerfilComponent {
  private readonly authService = inject(AuthService);
  private readonly portalSocioApi = inject(PortalSocioApiService);
  private readonly portalProfesorApi = inject(PortalProfesorApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly rolActivo = this.authService.obtenerRolUsuario();

  protected readonly perfil = signal<PerfilActual | null>(null);
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly errorCarga = signal('');
  protected readonly errorFormulario = signal('');
  protected readonly esSocio = computed(() => this.rolActivo === 'SOCIO_TITULAR' || this.rolActivo === 'FAMILIAR');
  protected readonly datosPersonales = computed<PerfilPersonalDto | null>(() => this.perfil());

  constructor() { this.cargar(); }

  protected cargar(): void {
    if (this.cargando()) return;
    this.cargando.set(true);
    this.errorCarga.set('');
    const solicitud: Observable<PerfilActual> = this.esSocio() ? this.portalSocioApi.obtenerPerfil() : this.portalProfesorApi.obtenerPerfil();
    solicitud.pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.cargando.set(false))).subscribe({
      next: (perfil) => this.perfil.set(perfil),
      error: () => { this.perfil.set(null); this.errorCarga.set('No se pudo cargar el perfil.'); },
    });
  }

  protected guardar(payload: ActualizarPerfilPortalPayload): void {
    if (this.guardando()) return;
    this.guardando.set(true);
    this.errorFormulario.set('');
    const solicitud: Observable<PerfilActual> = this.esSocio()
      ? this.portalSocioApi.actualizarPerfil(payload)
      : this.portalProfesorApi.actualizarPerfil({
          nombre: payload.nombre,
          apellido: payload.apellido,
          ...(payload.telefono ? { telefono: payload.telefono } : {}),
        });
    solicitud.pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.guardando.set(false))).subscribe({
      next: (perfilActualizado) => this.perfil.update((perfilAnterior) => perfilAnterior ? { ...perfilAnterior, ...perfilActualizado } : perfilActualizado),
      error: () => this.errorFormulario.set('No se pudo actualizar el perfil.'),
    });
  }
}
