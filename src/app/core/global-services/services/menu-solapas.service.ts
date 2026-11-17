import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, catchError, map, of, shareReplay, tap } from 'rxjs';

import { EmpresaApiService } from '../../api/services/empresa-api.service';
import { AuthSessionService } from './auth-session.service';

const SIN_OCULTAS: ReadonlySet<string> = new Set();

/**
 * Id que se guarda junto con las solapas ocultas para esconder el contador "N en el club" de la barra de
 * arriba. Ese contador solo tiene sentido si el club registra las entradas (QR o molinete).
 */
export const ID_CONTADOR_EN_CLUB = 'contador-en-club';

/**
 * Estado de las solapas que el club ocultó en el menú administrativo. Lo comparten el menú
 * lateral, las secciones con solapas y sus guards; se carga una vez por club activo.
 */
@Injectable({ providedIn: 'root' })
export class MenuSolapasService {
  private readonly empresaApi = inject(EmpresaApiService);
  private readonly authSession = inject(AuthSessionService);

  private readonly ocultasState = signal<ReadonlySet<string>>(SIN_OCULTAS);
  private companyCargada = '';
  private carga$: Observable<ReadonlySet<string>> | null = null;

  /** Identificadores ocultos del club activo; vacío mientras carga o si falla la lectura. */
  readonly ocultas = this.ocultasState.asReadonly();

  /**
   * Si se muestra el contador de personas en el club. Se oculta si el club lo apagó o si ocultó
   * "Registrar ingreso" (sin registrar entradas el contador siempre daría 0).
   */
  readonly mostrarContadorEnClub = computed(() => {
    const ocultas = this.ocultasState();
    return !ocultas.has(ID_CONTADOR_EN_CLUB) && !ocultas.has('accesos');
  });

  /** Carga (o reutiliza) la configuración del club activo. Nunca emite error. */
  asegurarCargado(): Observable<ReadonlySet<string>> {
    const companyUuid = this.authSession.obtenerCompanyUuid();
    if (!companyUuid) {
      return of(SIN_OCULTAS);
    }
    if (companyUuid === this.companyCargada && this.carga$) {
      return this.carga$;
    }

    this.companyCargada = companyUuid;
    // Al cambiar de club no se muestra el menú del anterior mientras llega el nuevo.
    this.ocultasState.set(SIN_OCULTAS);
    this.carga$ = this.empresaApi.obtenerMenuSolapas(companyUuid).pipe(
      map((dto): ReadonlySet<string> => new Set(dto.solapasOcultas)),
      // Si falla, se muestra el menú completo: ocultar es una preferencia, no un permiso.
      catchError(() => of(SIN_OCULTAS)),
      tap((ocultas) => this.ocultasState.set(ocultas)),
      shareReplay(1),
    );
    return this.carga$;
  }

  guardar(ocultas: readonly string[]): Observable<ReadonlySet<string>> {
    const companyUuid = this.authSession.obtenerCompanyUuid();
    return this.empresaApi.guardarMenuSolapas(companyUuid, { solapasOcultas: ocultas }).pipe(
      map((dto): ReadonlySet<string> => new Set(dto.solapasOcultas)),
      tap((guardadas) => {
        this.companyCargada = companyUuid;
        this.carga$ = of(guardadas);
        this.ocultasState.set(guardadas);
      }),
    );
  }
}
