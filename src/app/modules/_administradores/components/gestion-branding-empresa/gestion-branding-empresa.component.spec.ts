import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EmpresaApiService } from '../../../../core/api/services/empresa-api.service';
import { AuthSessionService } from '../../../../core/global-services/services/auth-session.service';
import { FormularioRegistroFotoValor } from '../../../auth/components/formulario-registro-foto/formulario-registro-foto.component';
import { BrandingEmpresaService } from '../../../_compartido-perfiles/services/branding-empresa.service';
import { ThemeModeService } from '../../../ui/dark-mode/theme-mode.service';
import { ToastAlertService } from '../../../ui/toast-alert/services/toast-alert.service';
import { GestionBrandingEmpresaComponent } from './gestion-branding-empresa.component';

describe('GestionBrandingEmpresaComponent', () => {
  const actualizarCompanyLogoUrl = vi.fn();
  const subirLogo = vi.fn();
  const eliminarLogo = vi.fn();
  const confirmarBorrado = vi.fn();
  let rolActivo = 'ADMIN';
  let fixture: ComponentFixture<GestionBrandingEmpresaComponent>;

  beforeEach(async () => {
    vi.clearAllMocks();
    rolActivo = 'ADMIN';
    subirLogo.mockReturnValue(of({
      uuid: 'empresa-uuid',
      logoUrl: 'https://cdn.example/logo-nuevo.png',
    }));
    eliminarLogo.mockReturnValue(of(void 0));
    confirmarBorrado.mockResolvedValue(false);

    await TestBed.configureTestingModule({
      imports: [GestionBrandingEmpresaComponent],
      providers: [
        { provide: EmpresaApiService, useValue: { subirLogo, eliminarLogo } },
        {
          provide: AuthSessionService,
          useValue: {
            companyLogoUrl: signal('https://cdn.example/logo-anterior.png'),
            obtenerCompanyUuid: () => 'empresa-uuid',
            obtenerRolActivo: () => rolActivo,
            actualizarCompanyLogoUrl,
          },
        },
        {
          provide: BrandingEmpresaService,
          useValue: {
            paletaGuardada: signal({
              primario: '#4982fd',
              secundario: '#2563eb',
              terciario: '#06b6d4',
            }),
            cargarPaletaEmpresaActiva: () => of(null),
            guardarPaleta: () => of(void 0),
          },
        },
        {
          provide: ThemeModeService,
          useValue: { resolvedMode: signal<'dark' | 'light'>('light') },
        },
        { provide: ToastAlertService, useValue: { confirmDanger: confirmarBorrado } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GestionBrandingEmpresaComponent);
    fixture.detectChanges();
  });

  it('reemplaza el logo y actualiza la sesion activa', () => {
    const archivo = new File(['logo'], 'logo.png', { type: 'image/png' });

    ejecutarSubida({ foto: archivo, fotoPreview: 'blob:logo', ancho: 600, alto: 300 });

    expect(subirLogo).toHaveBeenCalledWith('empresa-uuid', archivo);
    expect(actualizarCompanyLogoUrl).toHaveBeenCalledWith(
      'https://cdn.example/logo-nuevo.png',
    );
  });

  it('no invoca el backend si el rol activo no administra branding', () => {
    rolActivo = 'ADM_RECEPCION';
    const archivo = new File(['logo'], 'logo.png', { type: 'image/png' });

    ejecutarSubida({ foto: archivo, fotoPreview: 'blob:logo', ancho: 600, alto: 300 });

    expect(subirLogo).not.toHaveBeenCalled();
    expect(actualizarCompanyLogoUrl).not.toHaveBeenCalled();
  });

  it('pide confirmacion, borra el logo y limpia la sesion activa', async () => {
    confirmarBorrado.mockResolvedValue(true);

    await ejecutarEliminacion();

    expect(confirmarBorrado).toHaveBeenCalledWith(
      'Esta accion eliminara el logo institucional de toda la aplicacion.',
      { titulo: 'Borrar logo', textoConfirmar: 'Borrar logo' },
    );
    expect(eliminarLogo).toHaveBeenCalledWith('empresa-uuid');
    expect(actualizarCompanyLogoUrl).toHaveBeenCalledWith('');
  });

  it('no borra el logo si se cancela la confirmacion', async () => {
    await ejecutarEliminacion();

    expect(eliminarLogo).not.toHaveBeenCalled();
  });

  function ejecutarSubida(valor: FormularioRegistroFotoValor): void {
    const componente = fixture.componentInstance as unknown as {
      subirLogo(valor: FormularioRegistroFotoValor): void;
    };
    componente.subirLogo(valor);
  }

  function ejecutarEliminacion(): Promise<void> {
    const componente = fixture.componentInstance as unknown as {
      eliminarLogo(): Promise<void>;
    };
    return componente.eliminarLogo();
  }
});
