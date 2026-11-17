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

import { PortalProfesorApiService } from '../../../../core/api/services/portal-profesor-api.service';
import { AuthSessionService } from '../../../../core/global-services/services/auth-session.service';
import { formatearDni } from '../../../../helpers/dni-formato';
import { formatearFechaCorta } from '../../../../helpers/fecha-formato';
import { BotonComponent } from '../../../ui/boton/boton.component';
import { CarnetCampo, CarnetComponent } from '../../../ui/carnet/carnet.component';
import { PerformanceModeService } from '../../../ui/performance-mode.service';

interface DatosCarnetProfesor {
  readonly foto: string;
  readonly nombre: string;
  readonly apellido: string;
  readonly campos: readonly CarnetCampo[];
  readonly qrContenido: string;
  readonly qrImagen: string;
}

@Component({
  selector: 'app-credencial-profesor',
  standalone: true,
  imports: [BotonComponent, CarnetComponent],
  templateUrl: './credencial-profesor.component.html',
  styleUrl: './credencial-profesor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CredencialProfesorComponent implements OnInit {
  private readonly portalProfesorApi = inject(PortalProfesorApiService);
  private readonly authSessionService = inject(AuthSessionService);
  private readonly performanceModeService = inject(PerformanceModeService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly datosCarnet = signal<DatosCarnetProfesor | null>(null);
  protected readonly datosCarnetVacio: DatosCarnetProfesor = {
    foto: '',
    nombre: '',
    apellido: '',
    campos: [],
    qrContenido: '',
    qrImagen: '',
  };
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
    this.portalProfesorApi
      .obtenerCredencial()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cargando.set(false)),
      )
      .subscribe({
        next: (credencial) => {
          const profesor = credencial.profesor;

          if (!profesor) {
            this.datosCarnet.set(null);
            return;
          }

          this.datosCarnet.set({
            foto: profesor.imageUrl ?? '',
            nombre: profesor.nombre,
            apellido: profesor.apellido,
            campos: [
              { etiqueta: 'DNI', valor: formatearDni(profesor.dni ?? '') || '-' },
              { etiqueta: 'Mail', valor: profesor.email?.trim() || '-' },
              { etiqueta: 'Alta', valor: formatearFechaCorta(profesor.fechaAlta) },
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
