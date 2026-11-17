import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';

import { PortalSocioApiService } from '../../../../core/api/services/portal-socio-api.service';
import { AuthSessionService } from '../../../../core/global-services/services/auth-session.service';
import { GrupoFamiliarCacheService } from '../../../../core/global-services/services/grupo-familiar-cache.service';
import { MisActividadesPortalComponent } from './mis-actividades-portal.component';

const INSCRIPCION_TITULAR = {
  inscripcionUuid: 'inscripcion-1',
  actividadUuid: 'actividad-1',
  actividadNombre: 'Natación',
  memberUuid: 'titular-1',
  memberNombre: 'Juana',
  memberApellido: 'Pérez',
  fechaInscripcion: '26/08/2026',
  actividadCompleta: false,
  cuotaGenerada: false,
  cuotaUuid: null,
  cuotaAdvertencia: null,
};

const GRUPO_FAMILIAR = {
  titularMemberUuid: 'titular-1',
  integrantes: [
    {
      userUuid: 'user-titular',
      qr: '',
      member: {
        memberUuid: 'titular-1',
        nombre: 'Juana',
        apellido: 'Pérez',
        titular: true,
        estado: 'ACTIVO',
      },
    },
    {
      userUuid: 'user-familiar',
      qr: '',
      member: {
        memberUuid: 'familiar-1',
        nombre: 'Ana',
        apellido: 'Pérez',
        titular: false,
        estado: 'ACTIVO',
      },
    },
  ],
};

describe('MisActividadesPortalComponent', () => {
  const portalApi = {
    listarMisInscripcionesActividades: vi.fn(),
    listarInscripcionesActividadesFamiliar: vi.fn(),
    obtenerGrupoFamiliar: vi.fn(),
  };
  let rolActivo = 'SOCIO_TITULAR';

  beforeEach(() => {
    rolActivo = 'SOCIO_TITULAR';
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
    portalApi.listarMisInscripcionesActividades.mockReset();
    portalApi.listarInscripcionesActividadesFamiliar.mockReset();
    portalApi.obtenerGrupoFamiliar.mockReset();
    portalApi.listarMisInscripcionesActividades.mockReturnValue(of([INSCRIPCION_TITULAR]));
    portalApi.listarInscripcionesActividadesFamiliar.mockReturnValue(of([]));
    portalApi.obtenerGrupoFamiliar.mockReturnValue(of(GRUPO_FAMILIAR));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [MisActividadesPortalComponent],
      providers: [
        { provide: PortalSocioApiService, useValue: portalApi },
        GrupoFamiliarCacheService,
        { provide: AuthSessionService, useValue: { obtenerRolActivo: () => rolActivo } },
      ],
    });
  });

  it('lista las inscripciones propias del socio logueado', () => {
    const fixture = TestBed.createComponent(MisActividadesPortalComponent);
    fixture.detectChanges();

    expect(portalApi.listarMisInscripcionesActividades).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.textContent).toContain('Natación');
    expect(fixture.nativeElement.textContent).toContain('Juana Pérez');
  });

  it('arma el selector de familiares solo para el titular', () => {
    const fixture = TestBed.createComponent(MisActividadesPortalComponent);
    fixture.detectChanges();

    expect(portalApi.obtenerGrupoFamiliar).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.textContent).toContain('Ver actividades de');
  });

  it('consulta las inscripciones del familiar elegido', () => {
    const fixture = TestBed.createComponent(MisActividadesPortalComponent);
    const componente = fixture.componentInstance as unknown as {
      cambiarMiembro(memberUuid: string): void;
    };
    fixture.detectChanges();

    componente.cambiarMiembro('familiar-1');

    expect(portalApi.listarInscripcionesActividadesFamiliar).toHaveBeenCalledWith('familiar-1');
  });

  it('no pide el grupo ni el listado de familiares si el logueado es familiar', () => {
    rolActivo = 'FAMILIAR';
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [MisActividadesPortalComponent],
      providers: [
        { provide: PortalSocioApiService, useValue: portalApi },
        GrupoFamiliarCacheService,
        { provide: AuthSessionService, useValue: { obtenerRolActivo: () => rolActivo } },
      ],
    });
    const fixture = TestBed.createComponent(MisActividadesPortalComponent);
    fixture.detectChanges();

    expect(portalApi.listarMisInscripcionesActividades).toHaveBeenCalledOnce();
    expect(portalApi.obtenerGrupoFamiliar).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).not.toContain('Ver actividades de');
  });

  it('vuelve a Yo y refresca el grupo cuando el familiar deja de pertenecer', () => {
    portalApi.listarInscripcionesActividadesFamiliar.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 403 })),
    );
    const fixture = TestBed.createComponent(MisActividadesPortalComponent);
    const componente = fixture.componentInstance as unknown as {
      cambiarMiembro(memberUuid: string): void;
      miembroSeleccionado: { (): string };
    };
    fixture.detectChanges();
    portalApi.obtenerGrupoFamiliar.mockClear();

    componente.cambiarMiembro('familiar-1');
    fixture.detectChanges();

    expect(componente.miembroSeleccionado()).toBe('');
    expect(portalApi.obtenerGrupoFamiliar).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.textContent).toContain('no pertenece a tu grupo familiar');
  });
});
