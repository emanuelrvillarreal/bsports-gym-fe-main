import { TestBed } from '@angular/core/testing';
import { convertToParamMap, ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ConfiguracionApiService } from '../../../../core/api/services/configuracion-api.service';
import { AppRole } from '../../../../core/auth/auth-role';
import { AuthService } from '../../../../core/global-services/services/auth.service';
import { ColorThemeService } from '../../../ui/color-mod/color-theme.service';
import { SeleccionarEmpresaPageComponent } from './seleccionar-empresa-page.component';

interface EmpresaPrueba {
  uuid: string;
  nombre: string;
  cuit?: string;
  logoUrl?: string;
  roles: AppRole[];
}

interface ComponenteExpuesto {
  empresaSeleccionada: () => EmpresaPrueba | null;
  mostrandoRoles: () => boolean;
  mostrarAtras: () => boolean;
  seleccionarEmpresa: (uuid: string) => void;
  seleccionarRol: (rol: AppRole) => void;
  volverAEmpresas: () => void;
}

describe('SeleccionarEmpresaPageComponent', () => {
  const navegarPorUrl = vi.fn();
  const navegar = vi.fn();
  const seleccionarEmpresa = vi.fn(() => true);
  const seleccionarRol = vi.fn(() => true);

  beforeEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();
    simularMatchMedia();
  });

  it('muestra los roles en la misma page sin confirmar todavia la empresa', () => {
    const componente = crearComponente([
      empresa('club-a', ['ADMIN', 'ADM_RECEPCION']),
      empresa('club-b', ['PROFESOR']),
    ]);

    componente.seleccionarEmpresa('club-a');

    expect(componente.mostrandoRoles()).toBe(true);
    expect(componente.empresaSeleccionada()?.uuid).toBe('club-a');
    expect(componente.mostrarAtras()).toBe(true);
    expect(seleccionarEmpresa).not.toHaveBeenCalled();
    expect(navegarPorUrl).not.toHaveBeenCalled();
  });

  it('confirma empresa y rol juntos antes de navegar al perfil', () => {
    const componente = crearComponente([
      empresa('club-a', ['ADMIN', 'ADM_RECEPCION']),
      empresa('club-b', ['PROFESOR']),
    ]);
    componente.seleccionarEmpresa('club-a');

    componente.seleccionarRol('ADM_RECEPCION');

    expect(seleccionarEmpresa).toHaveBeenCalledWith('club-a');
    expect(seleccionarRol).toHaveBeenCalledWith('ADM_RECEPCION');
    expect(navegarPorUrl).toHaveBeenCalledWith('/adm-recepcion/accesos');
  });

  it('abre directamente los roles de la empresa unica y oculta Atras', () => {
    const componente = crearComponente([empresa('club-a', ['ADMIN', 'ADM_RECEPCION'])]);

    expect(componente.mostrandoRoles()).toBe(true);
    expect(componente.mostrarAtras()).toBe(false);
    expect(seleccionarEmpresa).not.toHaveBeenCalled();
  });

  it('abre los roles de la empresa activa al entrar desde Cambiar rol', () => {
    const componente = crearComponente(
      [empresa('club-a', ['ADMIN', 'ADM_RECEPCION']), empresa('club-b', ['PROFESOR'])],
      'roles',
      'club-a',
    );

    expect(componente.empresaSeleccionada()?.uuid).toBe('club-a');
    expect(componente.mostrarAtras()).toBe(true);
  });

  it('vuelve al listado sin cambiar el contexto activo y elimina el modo de la URL', () => {
    const componente = crearComponente(
      [empresa('club-a', ['ADMIN', 'ADM_RECEPCION']), empresa('club-b', ['PROFESOR'])],
      'roles',
      'club-a',
    );

    componente.volverAEmpresas();

    expect(componente.mostrandoRoles()).toBe(false);
    expect(seleccionarEmpresa).not.toHaveBeenCalled();
    expect(seleccionarRol).not.toHaveBeenCalled();
    expect(navegar).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: { modo: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      }),
    );
  });

  function crearComponente(
    empresas: EmpresaPrueba[],
    modo: string | null = null,
    companyUuidActivo = '',
  ): ComponenteExpuesto {
    const activatedRoute = {
      snapshot: { queryParamMap: convertToParamMap(modo ? { modo } : {}) },
    };
    const authService = {
      obtenerEmpresasDisponibles: () => empresas,
      obtenerUsuarioGuardado: () => ({ nombre: 'Ana', apellido: 'Pérez' }),
      obtenerCompanyUuidActivo: () => companyUuidActivo,
      seleccionarEmpresa,
      seleccionarRol,
      logout: () => of(undefined),
    };

    TestBed.configureTestingModule({
      imports: [SeleccionarEmpresaPageComponent],
      providers: [
        { provide: AuthService, useValue: authService },
        {
          provide: Router,
          useValue: { navigateByUrl: navegarPorUrl, navigate: navegar },
        },
        { provide: ActivatedRoute, useValue: activatedRoute },
        {
          provide: ConfiguracionApiService,
          useValue: { obtenerPorClave: () => of(null) },
        },
        {
          provide: ColorThemeService,
          useValue: {
            obtenerPaletaPredeterminada: () => ({
              primario: '#112233',
              secundario: '#445566',
              terciario: '#778899',
            }),
          },
        },
      ],
    });

    return TestBed.createComponent(SeleccionarEmpresaPageComponent)
      .componentInstance as unknown as ComponenteExpuesto;
  }

  function empresa(uuid: string, roles: AppRole[]): EmpresaPrueba {
    return { uuid, nombre: `Club ${uuid}`, roles };
  }

  function simularMatchMedia(): void {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockReturnValue({
        matches: false,
        media: '',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    });
  }
});
