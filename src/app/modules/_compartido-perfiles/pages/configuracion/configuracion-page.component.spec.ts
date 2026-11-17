import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { beforeEach, vi } from 'vitest';

import { TituloHeroComponent } from '../../../ui/titulo-hero/titulo-hero.component';
import { BotonComponent } from '../../../ui/boton/boton.component';
import { CardComponent } from '../../../ui/card/card.component';
import { LoadSpinnerBlueComponent } from '../../../ui/load-spinner-blue/load-spinner-blue.component';
import { ConfiguracionPageComponent } from './configuracion-page.component';

@Component({
  selector: 'app-gestion-branding-empresa',
  standalone: true,
  template: '<span data-testid="branding-empresa">Branding</span>',
})
class GestionBrandingEmpresaStubComponent {}

@Component({
  selector: 'app-gestion-configuracion-empresa',
  standalone: true,
  template: '<span data-testid="configuracion-empresa">Configuración institucional</span>',
})
class GestionConfiguracionEmpresaStubComponent {}

describe('ConfiguracionPageComponent', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    });
  });

  async function crearPagina(
    puedeGestionarBranding: boolean,
    puedeGestionarPerfilEmpresa = false,
    puedeAccederCrmManager = false,
  ) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ConfiguracionPageComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              data: {
                puedeGestionarBranding,
                puedeGestionarPerfilEmpresa,
                puedeAccederCrmManager,
              },
            },
          },
        },
        { provide: Router, useValue: { navigateByUrl: vi.fn() } },
      ],
    });
    TestBed.overrideComponent(ConfiguracionPageComponent, {
      set: {
        imports: [
          GestionBrandingEmpresaStubComponent,
          GestionConfiguracionEmpresaStubComponent,
          TituloHeroComponent,
          BotonComponent,
          CardComponent,
          LoadSpinnerBlueComponent,
        ],
      },
    });
    await TestBed.compileComponents();

    const fixture = TestBed.createComponent(ConfiguracionPageComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('muestra la gestion de branding cuando la ruta la habilita', async () => {
    const fixture = await crearPagina(true);

    expect(fixture.nativeElement.querySelector('[data-testid="branding-empresa"]')).not.toBeNull();
  });

  it('no monta la gestion de branding cuando la ruta no la habilita', async () => {
    const fixture = await crearPagina(false);

    expect(fixture.nativeElement.querySelector('[data-testid="branding-empresa"]')).toBeNull();
  });

  it('muestra la configuración institucional cuando la ruta la habilita', async () => {
    const fixture = await crearPagina(false, true);

    expect(
      fixture.nativeElement.querySelector('[data-testid="configuracion-empresa"]'),
    ).not.toBeNull();
  });

  it('muestra el acceso a CRM Manager solo cuando la ruta lo habilita', async () => {
    const fixtureAdmin = await crearPagina(false, false, true);
    expect(fixtureAdmin.nativeElement.textContent).toContain('Abrir CRM Manager');

    const fixtureOtroRol = await crearPagina(false, false, false);
    expect(fixtureOtroRol.nativeElement.textContent).not.toContain('Abrir CRM Manager');
  });
});
