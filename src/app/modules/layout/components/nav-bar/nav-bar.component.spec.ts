import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../../../core/global-services/services/auth.service';
import { AuthSessionService } from '../../../../core/global-services/services/auth-session.service';
import { ColorThemeService } from '../../../ui/color-mod/color-theme.service';
import { PerformanceModeService } from '../../../ui/performance-mode.service';
import { MenuSolapasService } from '../../../../core/global-services/services/menu-solapas.service';

import {
  crearOpcionesPrincipales,
  crearOpcionesSeccionesAdministracion,
  crearOpcionesProfesor,
  NavBarComponent,
} from './nav-bar.component';
import { OpcionNavegacion } from './interfaces/navbar.interface';

const menuSolapasStub = {
  ocultas: signal<ReadonlySet<string>>(new Set()),
  asegurarCargado: () => of(new Set<string>()),
};

describe('crearOpcionesPrincipales', () => {
  it('expone Panel únicamente para ADMIN', () => {
    const [dashboard] = crearOpcionesPrincipales('/admin/dashboard');

    expect(dashboard).toEqual({
      etiqueta: 'Panel',
      icono: 'dashboard',
      ruta: '/admin/dashboard',
      roles: ['ADMIN'],
    });
  });

  it('no agrega Inicio para profesor entre las opciones principales', () => {
    const opciones = crearOpcionesPrincipales('/profesor/eventos');
    expect(opciones.some((opcion) => opcion.roles?.includes('PROFESOR'))).toBe(false);
  });

  it('expone Eventos, Mis actividades, Credencial, Calendario, Asistencias, Seguimiento y Perfil para profesor', () => {
    const opciones = crearOpcionesProfesor();
    expect(opciones.map((opcion) => opcion.etiqueta)).toEqual([
      'Eventos',
      'Mis actividades',
      'Mi credencial',
      'Mi calendario',
      'Asistencias',
      'Seguimiento de alumnos',
      'Entrenamiento',
      'Evaluaciones físicas',
      'Mis equipos',
      'Mi perfil',
    ]);
    expect(opciones.some((opcion) => opcion.ruta?.endsWith('/inicio'))).toBe(false);
    expect(opciones.some((opcion) => opcion.ruta?.endsWith('/configuracion'))).toBe(false);
  });

  it('no asigna Dashboard ni Inicio a SYSADMIN', () => {
    const opcionesSysadmin = crearOpcionesPrincipales('/sysadmin/nueva-empresa').filter((opcion) =>
      opcion.roles?.includes('SYSADMIN'),
    );

    expect(opcionesSysadmin).toEqual([]);
  });
});

describe('crearOpcionesSeccionesAdministracion', () => {
  it('agrupa el menú de ADMIN en secciones en lugar de pantallas sueltas', () => {
    const opciones = crearOpcionesSeccionesAdministracion('ADMIN', new Set());

    expect(opciones.map((opcion) => [opcion.etiqueta, opcion.ruta])).toEqual([
      ['Socios', '/admin/socios'],
      ['Actividades', '/admin/actividades'],
      ['Cobros', '/admin/tesoreria'],
      ['Accesos', '/admin/accesos'],
      ['Instalaciones', '/admin/amenities'],
      ['Competencias', '/admin/competencias'],
      ['Equipamiento', '/admin/equipamiento'],
      ['Equipo', '/admin/equipo'],
      ['Configuración', '/admin/configuracion'],
    ]);
    expect(opciones.every((opcion) => opcion.roles?.join() === 'ADMIN')).toBe(true);
  });

  it('no muestra a recepción las secciones exclusivas de administración', () => {
    const etiquetas = crearOpcionesSeccionesAdministracion('ADM_RECEPCION', new Set()).map(
      (opcion) => opcion.etiqueta,
    );

    expect(etiquetas).toEqual(['Socios', 'Actividades', 'Cobros', 'Accesos', 'Instalaciones']);
  });

  it('quita la sección cuando el club oculta todas sus solapas', () => {
    const etiquetas = crearOpcionesSeccionesAdministracion(
      'ADMIN',
      new Set(['amenities', 'profesores', 'recepcion']),
    ).map((opcion) => opcion.etiqueta);

    expect(etiquetas).not.toContain('Instalaciones');
    expect(etiquetas).not.toContain('Equipo');
    expect(etiquetas).toContain('Configuración');
  });
});

describe('cambio de contexto desde el nav-bar', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
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
  });

  it('abre Cambiar rol en seleccionar-empresa con el modo roles', () => {
    const opciones = crearNavBarConContextoMultiple();

    expect(opciones.find((opcion) => opcion.etiqueta === 'Cambiar rol')).toMatchObject({
      ruta: '/seleccionar-empresa',
      queryParams: { modo: 'roles' },
    });
    const cambiarEmpresa = opciones.find((opcion) => opcion.etiqueta === 'Cambiar empresa');
    expect(cambiarEmpresa?.ruta).toBe('/seleccionar-empresa');
    expect(cambiarEmpresa?.queryParams).toBeUndefined();
  });

  it('muestra Actividades para el socio titular', () => {
    const usuario = {
      userCompanyRoles: [
        {
          companyUuid: 'club-a',
          companyName: 'Club A',
          roles: [{ name: 'SOCIO_TITULAR' }],
        },
      ],
    };

    TestBed.configureTestingModule({
      imports: [NavBarComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            obtenerUsuarioGuardado: () => usuario,
            obtenerRutaPrincipalUsuario: () => '/socio-titular/credencial',
            obtenerEmpresasDisponibles: () => usuario.userCompanyRoles,
            obtenerRolesEmpresaActiva: () => ['SOCIO_TITULAR'],
            obtenerRolUsuario: () => 'SOCIO_TITULAR',
          },
        },
        {
          provide: AuthSessionService,
          useValue: { companyLogoUrl: signal(''), companyName: signal('Club A') },
        },
        { provide: PerformanceModeService, useValue: { desactivado: signal(true) } },
        { provide: MenuSolapasService, useValue: menuSolapasStub },
        { provide: ColorThemeService, useValue: { colorPrimario: signal('#112233') } },
      ],
    });

    const componente = TestBed.createComponent(NavBarComponent).componentInstance as unknown as {
      opcionesNavegacion: () => readonly OpcionNavegacion[];
    };

    expect(componente.opcionesNavegacion()).toContainEqual({
      etiqueta: 'Actividades',
      icono: 'actividades',
      ruta: '/socio-titular/actividades',
      roles: ['SOCIO_TITULAR'],
    });
  });

  it('muestra Actividades para el socio familiar', () => {
    const usuario = {
      userCompanyRoles: [
        {
          companyUuid: 'club-a',
          companyName: 'Club A',
          roles: [{ name: 'FAMILIAR' }],
        },
      ],
    };

    TestBed.configureTestingModule({
      imports: [NavBarComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            obtenerUsuarioGuardado: () => usuario,
            obtenerRutaPrincipalUsuario: () => '/socio-familiar/credencial',
            obtenerEmpresasDisponibles: () => usuario.userCompanyRoles,
            obtenerRolesEmpresaActiva: () => ['FAMILIAR'],
            obtenerRolUsuario: () => 'FAMILIAR',
          },
        },
        {
          provide: AuthSessionService,
          useValue: { companyLogoUrl: signal(''), companyName: signal('Club A') },
        },
        { provide: PerformanceModeService, useValue: { desactivado: signal(true) } },
        { provide: MenuSolapasService, useValue: menuSolapasStub },
        { provide: ColorThemeService, useValue: { colorPrimario: signal('#112233') } },
      ],
    });

    const componente = TestBed.createComponent(NavBarComponent).componentInstance as unknown as {
      opcionesNavegacion: () => readonly OpcionNavegacion[];
    };

    expect(componente.opcionesNavegacion()).toContainEqual({
      etiqueta: 'Actividades',
      icono: 'actividades',
      ruta: '/socio-familiar/actividades',
      roles: ['FAMILIAR'],
    });
  });

  function crearNavBarConContextoMultiple(): readonly OpcionNavegacion[] {
    const usuario = {
      userCompanyRoles: [
        {
          companyUuid: 'club-a',
          companyName: 'Club A',
          roles: [{ name: 'ADMIN' }, { name: 'ADM_RECEPCION' }],
        },
        { companyUuid: 'club-b', companyName: 'Club B', roles: [{ name: 'PROFESOR' }] },
      ],
    };

    TestBed.configureTestingModule({
      imports: [NavBarComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            obtenerUsuarioGuardado: () => usuario,
            obtenerRutaPrincipalUsuario: () => '/admin/dashboard',
            obtenerEmpresasDisponibles: () => usuario.userCompanyRoles,
            obtenerRolesEmpresaActiva: () => ['ADMIN', 'ADM_RECEPCION'],
            obtenerRolUsuario: () => 'ADMIN',
          },
        },
        {
          provide: AuthSessionService,
          useValue: { companyLogoUrl: signal(''), companyName: signal('Club A') },
        },
        { provide: PerformanceModeService, useValue: { desactivado: signal(true) } },
        { provide: MenuSolapasService, useValue: menuSolapasStub },
        { provide: ColorThemeService, useValue: { colorPrimario: signal('#112233') } },
      ],
    });

    const componente = TestBed.createComponent(NavBarComponent).componentInstance as unknown as {
      opcionesNavegacion: () => readonly OpcionNavegacion[];
    };
    return componente.opcionesNavegacion();
  }
});
