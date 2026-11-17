import { MenuSolapasService } from '../../../../core/global-services/services/menu-solapas.service';
import '@angular/compiler';
import { EnvironmentInjector, Injector, createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PerfilEmpresaDto, PerfilEmpresaPayload } from '../../../../core/api/interfaces/empresa.interfaces';
import { EmpresaApiService } from '../../../../core/api/services/empresa-api.service';
import { AuthSessionService } from '../../../../core/global-services/services/auth-session.service';
import { ColorThemeService, PaletaGuardada } from '../../../ui/color-mod/color-theme.service';
import { CompletarPerfilPageComponent } from './completar-perfil-page.component';

const paleta: PaletaGuardada = {
  primario: '#4982fd', secundario: '#2563eb', terciario: '#06b6d4',
};

const perfilParcial: PerfilEmpresaDto = {
  nombreComercial: 'Club Norte', razonSocial: 'Club Norte SA', cuit: '20000000001',
  path: 'club-norte', emailFacturaElectronica: 'facturas@club.test',
  domicilio: null, domicilioFacturacion: null, telefono: null, emailInstitucional: null,
  logoUrl: null, colorPrimario: null, colorSecundario: null, cuotaSocialHabilitada: null,
  diasVencimientoCuota: 10,
  diasVencimientoMoroso: 31, diasInhabilitacion: 91,
};

type ControlWizard = CompletarPerfilPageComponent & {
  readonly contacto: { (): { domicilio: { direccion: string; codigoPostal: string; localidad: string }; domicilioFacturacion: { direccion: string; codigoPostal: string; localidad: string }; telefono: string; emailInstitucional: string }; set(valor: unknown): void };
  readonly cuotaSocialHabilitada: { (): boolean | null; set(valor: boolean): void };
  readonly plazos: { (): Record<string, number> };
  readonly paso: { (): number };
  readonly error: { (): string };
  avanzar(): void;
  volver(): void;
  enviar(): void;
};

describe('CompletarPerfilPageComponent', () => {
  const actualizarPerfil = vi.fn();
  const subirLogo = vi.fn();

  let inyector: ReturnType<typeof createEnvironmentInjector>;

  beforeEach(() => {
    actualizarPerfil.mockReset().mockReturnValue(of({ uuid: 'club-1' }));
    subirLogo.mockReset();
    inyector = createEnvironmentInjector([
        { provide: EmpresaApiService, useValue: { obtenerPerfil: () => of(perfilParcial), actualizarPerfil, subirLogo } },
        { provide: AuthSessionService, useValue: { obtenerCompanyUuid: () => 'club-1', actualizarCompanyLogoUrl: vi.fn() } },
        { provide: ColorThemeService, useValue: { obtenerPaletaPredeterminada: () => paleta, obtenerPaletaActual: () => paleta } },
        { provide: Router, useValue: { navigateByUrl: vi.fn().mockResolvedValue(true) } },
        {
          provide: MenuSolapasService,
          useValue: { asegurarCargado: () => of(new Set<string>()), guardar: () => of(new Set<string>()) },
        },
    ], Injector.NULL as EnvironmentInjector);
  });

  function crear(): ControlWizard {
    const componente = runInInjectionContext(inyector, () => new CompletarPerfilPageComponent());
    componente.ngOnInit();
    return componente as ControlWizard;
  }

  function completarContacto(componente: ControlWizard): void {
    const domicilio = { direccion: 'Av. Norte 1', codigoPostal: '1000', localidad: 'CABA' };
    componente.contacto.set({
      domicilio, domicilioFacturacion: { ...domicilio },
      telefono: '1140001000', emailInstitucional: 'info@club.test',
    });
  }

  it('carga los plazos por defecto y exige decidir la cuota social', () => {
    const componente = crear();
    expect(componente.plazos()).toEqual({
      diasVencimientoCuota: 10,
      diasVencimientoMoroso: 31, diasInhabilitacion: 91,
    });
    expect(componente.cuotaSocialHabilitada()).toBeNull();
    completarContacto(componente);
    componente.avanzar();
    componente.avanzar();
    componente.enviar();
    expect(actualizarPerfil).not.toHaveBeenCalled();
    expect(componente.error()).toContain('cuota social');
  });

  it('conserva el contacto entre pasos y envía el perfil completo sin exigir logo', () => {
    const componente = crear();
    completarContacto(componente);
    componente.avanzar();
    componente.volver();
    expect(componente.contacto().domicilio.direccion).toBe('Av. Norte 1');
    componente.avanzar();
    componente.avanzar();
    componente.cuotaSocialHabilitada.set(false);
    componente.enviar();

    expect(actualizarPerfil).toHaveBeenCalledOnce();
    const payload = actualizarPerfil.mock.calls[0][1] as PerfilEmpresaPayload;
    expect(payload).toMatchObject({
      nombreComercial: 'Club Norte', razonSocial: 'Club Norte SA', cuit: '20000000001',
      path: 'club-norte', emailFacturaElectronica: 'facturas@club.test',
      domicilio: { direccion: 'Av. Norte 1', codigoPostal: '1000', localidad: 'CABA' },
      telefono: '1140001000', emailInstitucional: 'info@club.test',
      colorPrimario: '#4982fd', colorSecundario: '#2563eb', cuotaSocialHabilitada: false,
      diasVencimientoCuota: 10,
      diasVencimientoMoroso: 31, diasInhabilitacion: 91,
    });
    expect(payload).not.toHaveProperty('logoUrl');
    expect(subirLogo).not.toHaveBeenCalled();
  });
});
