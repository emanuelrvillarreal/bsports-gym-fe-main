import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, tap, throwError } from 'rxjs';

import { EmpresaPublicaDto } from '../../api/interfaces/empresa.interfaces';
import { EmpresaApiService } from '../../api/services/empresa-api.service';

const PATRON_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Contexto efímero para las pantallas públicas asociadas a un club.
 *
 * No persiste datos ni reutiliza `AuthSessionService`: navegar entre clubes o
 * volver a una ruta plana no debe filtrar el UUID ni el branding anterior.
 */
@Injectable({ providedIn: 'root' })
export class EmpresaPublicaContextService {
  private readonly empresaApiService = inject(EmpresaApiService);
  private readonly empresaState = signal<EmpresaPublicaDto | null>(null);
  private secuenciaCarga = 0;

  readonly empresa = this.empresaState.asReadonly();
  readonly uuid = computed(() => this.empresaState()?.uuid ?? '');
  readonly nombreComercial = computed(() => this.empresaState()?.nombreComercial ?? '');
  readonly logoUrl = computed(() => this.empresaState()?.logoUrl?.trim() ?? '');
  readonly colorPrimario = computed(() => this.empresaState()?.colorPrimario?.trim() ?? '');
  readonly colorSecundario = computed(() => this.empresaState()?.colorSecundario?.trim() ?? '');
  readonly path = computed(() => this.empresaState()?.path ?? '');
  readonly empresaDisponible = computed(() => this.empresaState() !== null);

  cargarPorPath(path: string): Observable<EmpresaPublicaDto> {
    const pathNormalizado = path.trim();
    const cargaActual = ++this.secuenciaCarga;
    this.empresaState.set(null);

    if (!pathNormalizado) {
      return throwError(() => new Error('El path del gimnasio es obligatorio.'));
    }

    return this.empresaApiService.obtenerPublicaPorPath(pathNormalizado).pipe(
      map((empresa) => this.validarEmpresa(empresa, pathNormalizado)),
      tap((empresa) => {
        if (cargaActual === this.secuenciaCarga) {
          this.empresaState.set(empresa);
        }
      }),
      catchError((error: unknown) => {
        if (cargaActual === this.secuenciaCarga) {
          this.empresaState.set(null);
        }
        return throwError(() => error);
      }),
    );
  }

  limpiar(): void {
    this.secuenciaCarga += 1;
    this.empresaState.set(null);
  }

  private validarEmpresa(empresa: EmpresaPublicaDto, pathSolicitado: string): EmpresaPublicaDto {
    const uuid = typeof empresa?.uuid === 'string' ? empresa.uuid.trim() : '';
    if (!PATRON_UUID.test(uuid)) {
      throw new Error('La respuesta del gimnasio no contiene un UUID válido.');
    }

    const nombreComercial = typeof empresa.nombreComercial === 'string'
      ? empresa.nombreComercial.trim()
      : '';
    if (!nombreComercial) {
      throw new Error('La respuesta del gimnasio no contiene datos públicos válidos.');
    }

    return {
      uuid,
      nombreComercial,
      logoUrl: this.limpiarTextoOpcional(empresa.logoUrl),
      colorPrimario: this.limpiarTextoOpcional(empresa.colorPrimario),
      colorSecundario: this.limpiarTextoOpcional(empresa.colorSecundario),
      // El endpoint se consulta por path, pero el backend no siempre lo incluye en CompanyDTO.
      path: pathSolicitado,
    };
  }

  private limpiarTextoOpcional(valor: string | null | undefined): string | null {
    const limpio = typeof valor === 'string' ? valor.trim() : '';
    if (!limpio) return null;

    // Tolera respuestas serializadas como enlace Markdown: [texto](https://...).
    const enlaceMarkdown = /^\[[^\]]*\]\((https?:\/\/[^\s)]+)\)$/.exec(limpio);
    return enlaceMarkdown?.[1] ?? limpio;
  }
}
