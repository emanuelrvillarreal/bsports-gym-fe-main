import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EmpresaApiService } from '../../../core/api/services/empresa-api.service';
import { AuthSessionService } from '../../../core/global-services/services/auth-session.service';
import { ColorThemeService, PaletaGuardada } from '../../ui/color-mod/color-theme.service';
import {
  BrandingEmpresaService,
} from './branding-empresa.service';

describe('BrandingEmpresaService', () => {
  const paletaBackend: PaletaGuardada = {
    primario: '#111111',
    secundario: '#222222',
    terciario: '#333333',
  };
  let companyUuid = 'empresa-a';
  const empresaApi = {
    obtenerPerfil: vi.fn(),
    actualizarPerfil: vi.fn(),
  };
  const colorThemeService = {
    establecerContextoEmpresa: vi.fn(),
    establecerPaleta: vi.fn(),
    obtenerPaletaActual: vi.fn(),
    obtenerPaletaPredeterminada: vi.fn(),
  };

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    companyUuid = 'empresa-a';
    empresaApi.obtenerPerfil.mockReturnValue(of(crearPerfil(paletaBackend)));
    empresaApi.actualizarPerfil.mockReturnValue(of({ uuid: companyUuid }));
    colorThemeService.obtenerPaletaActual.mockReturnValue({
      primario: '#aaaaaa',
      secundario: '#bbbbbb',
      terciario: '#cccccc',
    });
    colorThemeService.obtenerPaletaPredeterminada.mockReturnValue({
      primario: '#4982fd',
      secundario: '#2563eb',
      terciario: '#06b6d4',
    });

    TestBed.configureTestingModule({
      providers: [
        BrandingEmpresaService,
        { provide: EmpresaApiService, useValue: empresaApi },
        {
          provide: AuthSessionService,
          useValue: {
            obtenerCompanyUuid: () => companyUuid,
          },
        },
        { provide: ColorThemeService, useValue: colorThemeService },
      ],
    });
  });

  it('mapea los colores del perfil remoto sobre el cache de la empresa', () => {
    const servicio = TestBed.inject(BrandingEmpresaService);
    let resultado: PaletaGuardada | undefined;
    const paletaEsperada = { ...paletaBackend, terciario: '#06b6d4' };

    servicio.cargarPaletaEmpresaActiva().subscribe((paleta) => resultado = paleta);

    expect(empresaApi.obtenerPerfil).toHaveBeenCalledWith('empresa-a');
    expect(resultado).toEqual(paletaEsperada);
    expect(colorThemeService.establecerContextoEmpresa).toHaveBeenCalledWith('empresa-a');
    expect(colorThemeService.establecerPaleta).toHaveBeenLastCalledWith(paletaEsperada);
  });

  it('actualiza los colores dentro del perfil completo y confirma la paleta', () => {
    const servicio = TestBed.inject(BrandingEmpresaService);
    const { fax: _fax, ...perfilSinCamposNoAdmitidos } = crearPerfil(paletaBackend);

    servicio.guardarPaleta(paletaBackend).subscribe();

    expect(empresaApi.actualizarPerfil).toHaveBeenCalledWith('empresa-a', {
      ...perfilSinCamposNoAdmitidos,
      colorPrimario: paletaBackend.primario,
      colorSecundario: paletaBackend.secundario,
    });
    const payload = empresaApi.actualizarPerfil.mock.calls[0][1];
    expect(payload).not.toHaveProperty('status');
    expect(payload).not.toHaveProperty('fax');
    expect(servicio.paletaGuardada()).toEqual(paletaBackend);
  });

  it('no reutiliza el cache de otra empresa', () => {
    companyUuid = 'empresa-b';
    empresaApi.obtenerPerfil.mockReturnValue(of(crearPerfil({
      primario: 'invalido',
      secundario: '#222222',
      terciario: '#333333',
    } as unknown as PaletaGuardada)));
    const servicio = TestBed.inject(BrandingEmpresaService);
    let resultado: PaletaGuardada | undefined;

    servicio.cargarPaletaEmpresaActiva().subscribe((paleta) => resultado = paleta);

    expect(resultado).not.toEqual(paletaBackend);
    expect(colorThemeService.establecerContextoEmpresa).toHaveBeenCalledWith('empresa-b');
  });

  function crearPerfil(paleta: PaletaGuardada) {
    return {
      path: 'b-sports',
      nombreComercial: 'B Sports',
      razonSocial: 'B Sports SA',
      cuit: '30-12345678-9',
      domicilio: { direccion: 'Calle 1', codigoPostal: '1000', localidad: 'CABA' },
      domicilioFacturacion: { direccion: 'Calle 1', codigoPostal: '1000', localidad: 'CABA' },
      telefono: '1140000000',
      fax: '',
      emailFacturaElectronica: '',
      emailInstitucional: 'club@example.com',
      colorPrimario: paleta.primario,
      colorSecundario: paleta.secundario,
      cuotaSocialHabilitada: false,
    };
  }
});
