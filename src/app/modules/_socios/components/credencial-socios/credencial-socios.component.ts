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

import { PortalSocioApiService } from '../../../../core/api/services/portal-socio-api.service';
import { AuthSessionService } from '../../../../core/global-services/services/auth-session.service';
import { formatearDni } from '../../../../helpers/dni-formato';
import { formatearFechaCorta } from '../../../../helpers/fecha-formato';
import { BotonComponent } from '../../../ui/boton/boton.component';
import { CarnetCampo, CarnetComponent } from '../../../ui/carnet/carnet.component';
import { PerformanceModeService } from '../../../ui/performance-mode.service';

interface DatosCarnetSocio {
  readonly foto: string;
  readonly nombre: string;
  readonly apellido: string;
  readonly campos: readonly CarnetCampo[];
  readonly qrContenido: string;
  readonly qrImagen: string;
}

@Component({
  selector: 'app-credencial-socios',
  standalone: true,
  imports: [BotonComponent, CarnetComponent],
  templateUrl: './credencial-socios.component.html',
  styleUrl: './credencial-socios.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CredencialSociosComponent implements OnInit {
  private readonly portalSocioApi = inject(PortalSocioApiService);
  private readonly authSessionService = inject(AuthSessionService);
  private readonly performanceModeService = inject(PerformanceModeService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly datosCarnet = signal<DatosCarnetSocio | null>(null);
  protected readonly cargando = signal(false);
  protected readonly error = signal('');
  protected readonly altoRendimiento = computed(() => !this.performanceModeService.desactivado());
  protected readonly logoEmpresa = computed(() => this.authSessionService.companyLogoUrl().trim());
  protected readonly fotoCarnet = computed(() =>
    this.authSessionService.obtenerUrlFotoPerfilActualizada(this.datosCarnet()?.foto ?? ''),
  );

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    if (this.cargando()) {
      return;
    }

    this.cargando.set(true);
    this.error.set('');
    this.portalSocioApi
      .obtenerCredencial()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cargando.set(false)),
      )
      .subscribe({
        next: (credencial) => {
          const socio = credencial.member;

          if (!socio) {
            this.datosCarnet.set(null);
            return;
          }

          this.datosCarnet.set({
            foto: socio.imageUrl ?? '',
            nombre: socio.nombre,
            apellido: socio.apellido,
            campos: [
              { etiqueta: 'N.º de socio', valor: socio.numeroSocio?.trim() || '-' },
              { etiqueta: 'DNI', valor: formatearDni(socio.dni ?? '') || '-' },
              { etiqueta: 'Mail', valor: socio.email?.trim() || '-' },
              { etiqueta: 'Alta', valor: formatearFechaCorta(socio.fechaAlta) },
            ],
            qrContenido: credencial.userUuid,
            qrImagen: credencial.qr,
          });
        },
        error: () => {
          this.datosCarnet.set(null);
          this.error.set('No se pudo cargar el carnet. Intentá nuevamente.');
        },
      });
  }
}
