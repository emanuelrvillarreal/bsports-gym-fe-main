import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import { PerfilPortalDto } from '../../../../core/api/interfaces/portal.interfaces';
import { PortalSocioApiService } from '../../../../core/api/services/portal-socio-api.service';
import { CertificadosMedicosPortalComponent } from '../../components/certificados-medicos-portal/certificados-medicos-portal.component';
import { BotonComponent } from '../../../ui/boton/boton.component';
import { LoadSpinnerBlueComponent } from '../../../ui/load-spinner-blue/load-spinner-blue.component';
import { TituloHeroComponent } from '../../../ui/titulo-hero/titulo-hero.component';

@Component({
  selector: 'app-certificados-page',
  standalone: true,
  imports: [
    BotonComponent,
    CertificadosMedicosPortalComponent,
    LoadSpinnerBlueComponent,
    TituloHeroComponent,
  ],
  templateUrl: './certificados-page.component.html',
  styleUrl: './certificados-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CertificadosPageComponent {
  private readonly portalSocioApi = inject(PortalSocioApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly perfil = signal<PerfilPortalDto | null>(null);
  protected readonly cargando = signal(false);
  protected readonly error = signal('');

  constructor() {
    this.cargar();
  }

  protected cargar(): void {
    if (this.cargando()) return;

    this.cargando.set(true);
    this.error.set('');
    this.portalSocioApi
      .obtenerPerfil()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cargando.set(false)),
      )
      .subscribe({
        next: (perfil) => this.perfil.set(perfil),
        error: () => {
          this.perfil.set(null);
          this.error.set('No se pudieron cargar los certificados médicos.');
        },
      });
  }
}
