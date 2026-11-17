import { Injectable, inject } from '@angular/core';
import { Observable, defer, of, shareReplay, tap } from 'rxjs';

import {
  EmpresaDto,
  PerfilEmpresaDto,
  PerfilEmpresaPayload,
} from '../../../core/api/interfaces/empresa.interfaces';
import { EmpresaApiService } from '../../../core/api/services/empresa-api.service';

/**
 * Mantiene un único snapshot del perfil por empresa durante la sesión.
 * Evita que los widgets de una misma ruta repitan `GET /companies/current`.
 */
@Injectable({ providedIn: 'root' })
export class PerfilEmpresaActivaService {
  private readonly empresaApi = inject(EmpresaApiService);
  private readonly perfiles = new Map<string, PerfilEmpresaDto>();
  private readonly cargasEnCurso = new Map<string, Observable<PerfilEmpresaDto>>();

  obtenerPerfil(
    companyUuid: string,
    opciones?: { readonly forzar?: boolean },
  ): Observable<PerfilEmpresaDto> {
    const uuid = companyUuid.trim();
    if (!uuid) {
      throw new Error('Se requiere una empresa activa para obtener su perfil.');
    }

    const perfilCacheado = this.perfiles.get(uuid);
    if (perfilCacheado && !opciones?.forzar) {
      return of(perfilCacheado);
    }

    const cargaActual = this.cargasEnCurso.get(uuid);
    if (cargaActual && !opciones?.forzar) {
      return cargaActual;
    }

    const carga$ = defer(() => this.empresaApi.obtenerPerfil(uuid)).pipe(
      tap((perfil) => this.perfiles.set(uuid, perfil)),
      tap({ finalize: () => this.cargasEnCurso.delete(uuid) }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    this.cargasEnCurso.set(uuid, carga$);
    return carga$;
  }

  actualizarPerfil(companyUuid: string, payload: PerfilEmpresaPayload): Observable<EmpresaDto> {
    const uuid = companyUuid.trim();
    return this.empresaApi.actualizarPerfil(uuid, payload).pipe(
      tap(() => this.actualizarSnapshot(uuid, payload)),
    );
  }

  private actualizarSnapshot(companyUuid: string, payload: PerfilEmpresaPayload): void {
    const perfilActual = this.perfiles.get(companyUuid);
    if (!perfilActual) return;

    this.perfiles.set(companyUuid, { ...perfilActual, ...payload });
  }
}
