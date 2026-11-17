import { Injectable, inject, signal } from '@angular/core';
import { Observable, defer, finalize, map, of, shareReplay, switchMap, tap, throwError } from 'rxjs';

import {
  PerfilEmpresaDto,
  PerfilEmpresaPayload,
} from '../../../core/api/interfaces/empresa.interfaces';
import { AuthSessionService } from '../../../core/global-services/services/auth-session.service';
import {
  ColorHex,
  ColorThemeService,
  PaletaGuardada,
} from '../../ui/color-mod/color-theme.service';
import { PerfilEmpresaActivaService } from './perfil-empresa-activa.service';

/** Coordina el perfil remoto y el motor visual de branding por empresa. */
@Injectable({ providedIn: 'root' })
export class BrandingEmpresaService {
  private readonly perfilEmpresaActiva = inject(PerfilEmpresaActivaService);
  private readonly authSessionService = inject(AuthSessionService);
  private readonly colorThemeService = inject(ColorThemeService);
  private cargaEnCurso: Observable<PaletaGuardada> | null = null;
  private uuidCargaEnCurso = '';
  private uuidCargado = '';

  private readonly paletaGuardadaState = signal<PaletaGuardada>(
    this.colorThemeService.obtenerPaletaPredeterminada(),
  );
  readonly paletaGuardada = this.paletaGuardadaState.asReadonly();

  cargarPaletaEmpresaActiva(options?: { readonly forzar?: boolean }): Observable<PaletaGuardada> {
    const companyUuid = this.authSessionService.obtenerCompanyUuid().trim();
    if (!companyUuid) {
      return of(this.aplicarPaletaSegura('', this.colorThemeService.obtenerPaletaPredeterminada()));
    }

    if (!options?.forzar && this.uuidCargado === companyUuid) {
      return of(this.paletaGuardadaState());
    }
    if (!options?.forzar && this.cargaEnCurso && this.uuidCargaEnCurso === companyUuid) {
      return this.cargaEnCurso;
    }

    const carga$ = defer(() => {
      this.colorThemeService.establecerContextoEmpresa(companyUuid);
      const paletaPredeterminada = this.colorThemeService.obtenerPaletaPredeterminada();
      this.paletaGuardadaState.set(paletaPredeterminada);

      return this.perfilEmpresaActiva.obtenerPerfil(companyUuid, options).pipe(
        map((perfil) => this.extraerPaletaDelPerfil(perfil) ?? paletaPredeterminada),
        tap((paleta) => {
          this.aplicarPaletaSegura(companyUuid, paleta);
          this.uuidCargado = companyUuid;
        }),
      );
    }).pipe(
      finalize(() => {
        if (this.uuidCargaEnCurso === companyUuid) {
          this.cargaEnCurso = null;
          this.uuidCargaEnCurso = '';
        }
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    this.uuidCargaEnCurso = companyUuid;
    this.cargaEnCurso = carga$;
    return carga$;
  }

  guardarPaleta(paleta: PaletaGuardada): Observable<void> {
    const companyUuid = this.authSessionService.obtenerCompanyUuid().trim();
    const normalizada = this.normalizarPaleta(paleta);

    if (!companyUuid) return throwError(() => new Error('No hay una empresa activa.'));
    if (!normalizada) return throwError(() => new Error('La paleta contiene colores invalidos.'));

    return this.perfilEmpresaActiva.obtenerPerfil(companyUuid).pipe(
      switchMap((perfil) =>
        this.perfilEmpresaActiva.actualizarPerfil(
          companyUuid,
          this.crearPayloadPerfilConPaleta(perfil, normalizada),
        ),
      ),
      map(() => void 0),
      tap(() => {
        this.aplicarPaletaSegura(companyUuid, normalizada);
        this.uuidCargado = companyUuid;
      }),
    );
  }

  restablecerPaleta(): Observable<void> {
    return this.guardarPaleta(this.colorThemeService.obtenerPaletaPredeterminada());
  }

  private aplicarPaletaSegura(companyUuid: string, paleta: PaletaGuardada): PaletaGuardada {
    this.colorThemeService.establecerContextoEmpresa(companyUuid || null);
    this.colorThemeService.establecerPaleta(paleta);
    this.paletaGuardadaState.set(paleta);
    return paleta;
  }

  private normalizarPaleta(valor: unknown): PaletaGuardada | null {
    if (typeof valor !== 'object' || valor === null) return null;
    const candidata = valor as Partial<Record<keyof PaletaGuardada, unknown>>;
    if (!this.esColorHex(candidata.primario) || !this.esColorHex(candidata.secundario)) return null;

    return {
      primario: candidata.primario,
      secundario: candidata.secundario,
      terciario: this.esColorHex(candidata.terciario)
        ? candidata.terciario
        : this.colorThemeService.obtenerPaletaPredeterminada().terciario,
    };
  }

  /**
   * `PUT /companies/profile` recibe el perfil institucional completo. Se parte del
   * snapshot remoto para modificar solo branding y no borrar campos no visibles.
   */
  private crearPayloadPerfilConPaleta(
    perfil: PerfilEmpresaDto,
    paleta: PaletaGuardada,
  ): PerfilEmpresaPayload {
    if (!perfil.domicilio || !perfil.domicilioFacturacion || !perfil.telefono ||
        !perfil.emailInstitucional || perfil.cuotaSocialHabilitada === null) {
      throw new Error('Completa el perfil del gimnasio antes de guardar sus colores.');
    }
    // El GET incluye metadatos de la empresa (por ejemplo, `status`) que el DTO
    // de actualizacion rechaza. Se permite solo el contrato documentado por backend.
    return {
      path: perfil.path,
      nombreComercial: perfil.nombreComercial,
      razonSocial: perfil.razonSocial,
      cuit: perfil.cuit,
      domicilio: perfil.domicilio,
      domicilioFacturacion: perfil.domicilioFacturacion,
      telefono: perfil.telefono,
      emailFacturaElectronica: perfil.emailFacturaElectronica,
      emailInstitucional: perfil.emailInstitucional,
      colorPrimario: paleta.primario,
      colorSecundario: paleta.secundario,
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
    };
  }

  /** Adapta los nombres del DTO de empresa al formato interno del tema. */
  private extraerPaletaDelPerfil(perfil: PerfilEmpresaDto): PaletaGuardada | null {
    return this.normalizarPaleta({
      primario: perfil.colorPrimario,
      secundario: perfil.colorSecundario,
    });
  }

  private esColorHex(valor: unknown): valor is ColorHex {
    return typeof valor === 'string' && /^#[\da-fA-F]{6}$/.test(valor);
  }

}
