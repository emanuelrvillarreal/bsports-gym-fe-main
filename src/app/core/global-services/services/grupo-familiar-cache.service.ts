import { Injectable, inject } from '@angular/core';
import { Observable, catchError, shareReplay, throwError } from 'rxjs';

import { GrupoFamiliarPortalDto } from '../../api/interfaces/portal.interfaces';
import { PortalSocioApiService } from '../../api/services/portal-socio-api.service';

/**
 * Comparte el grupo familiar entre los consumidores de una misma página.
 * La instancia se provee en la página para descartar la caché al navegar.
 */
@Injectable()
export class GrupoFamiliarCacheService {
  private readonly portalApi = inject(PortalSocioApiService);
  private grupo$: Observable<GrupoFamiliarPortalDto> | null = null;

  obtener(): Observable<GrupoFamiliarPortalDto> {
    if (!this.grupo$) {
      this.grupo$ = this.portalApi.obtenerGrupoFamiliar().pipe(
        catchError((error: unknown) => {
          this.grupo$ = null;
          return throwError(() => error);
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    }

    return this.grupo$;
  }

  invalidar(): void {
    this.grupo$ = null;
  }
}
