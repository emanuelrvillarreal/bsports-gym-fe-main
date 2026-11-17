import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import {
  ActualizarPerfilPortalPayload,
  PerfilPortalDto,
} from '../../../../core/api/interfaces/portal.interfaces';
import { PortalSocioApiService } from '../../../../core/api/services/portal-socio-api.service';
import { BotonComponent } from '../../../ui/boton/boton.component';
import { CardComponent } from '../../../ui/card/card.component';
import { LoadSpinnerBlueComponent } from '../../../ui/load-spinner-blue/load-spinner-blue.component';
import { FormularioPerfilComponent } from '../../forms/formulario-perfil/formulario-perfil.component';
import { CertificadosMedicosPortalComponent } from '../certificados-medicos-portal/certificados-medicos-portal.component';

@Component({
  selector: 'app-perfil-portal',
  standalone: true,
  imports: [BotonComponent, CardComponent, CertificadosMedicosPortalComponent, FormularioPerfilComponent, LoadSpinnerBlueComponent],
  templateUrl: './perfil-portal.component.html',
  styleUrl: './perfil-portal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PerfilPortalComponent {
  private readonly portalApi = inject(PortalSocioApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly perfil = signal<PerfilPortalDto | null>(null);
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly errorCarga = signal('');
  protected readonly errorFormulario = signal('');

  constructor() {
    this.cargar();
  }

  protected cargar(): void {
    if (this.cargando()) {
      return;
    }

    this.cargando.set(true);
    this.errorCarga.set('');
    this.portalApi
      .obtenerPerfil()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cargando.set(false)),
      )
      .subscribe({
        next: (perfil) => this.perfil.set(perfil),
        error: () => {
          this.perfil.set(null);
          this.errorCarga.set('No se pudo cargar el perfil.');
        },
      });
  }

  protected guardar(payload: ActualizarPerfilPortalPayload): void {
    if (this.guardando()) {
      return;
    }

    this.guardando.set(true);
    this.errorFormulario.set('');
    this.portalApi
      .actualizarPerfil(payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.guardando.set(false)),
      )
      .subscribe({
        next: (perfil) => this.perfil.set(perfil),
        error: () => this.errorFormulario.set('No se pudo actualizar el perfil.'),
      });
  }
}
