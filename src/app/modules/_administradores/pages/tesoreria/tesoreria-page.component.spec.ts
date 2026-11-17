import { Component, input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppRole } from '../../../../core/auth/auth-role';
import { VisibleParaRolesDirective } from '../../../../core/auth/visible-para-roles.directive';
import { AuthService } from '../../../../core/global-services/services/auth.service';
import { TesoreriaPageComponent } from './tesoreria-page.component';

let resumenesConstruidos = 0;
let historicosConstruidos = 0;

@Component({ selector: 'app-titulo-hero', template: '' })
class TituloHeroStubComponent {
  readonly icono = input('');
  readonly titulo = input('');
  readonly subtitulo = input('');
}

@Component({
  selector: 'app-tesoreria-resumen',
  template: '<span data-testid="resumen-tesoreria"></span>',
})
class TesoreriaResumenStubComponent {
  constructor() {
    resumenesConstruidos += 1;
  }
}

@Component({
  selector: 'app-gestion-cuotas',
  template: '<span data-testid="gestion-cuotas"></span>',
})
class GestionCuotasStubComponent {}

@Component({
  selector: 'app-historico-balances',
  template: '<span data-testid="historico-balances"></span>',
})
class HistoricoBalancesStubComponent {
  constructor() {
    historicosConstruidos += 1;
  }
}

describe('TesoreriaPageComponent', () => {
  let rolActivo: AppRole;

  async function crearPagina(rol: AppRole): Promise<ComponentFixture<TesoreriaPageComponent>> {
    rolActivo = rol;
    resumenesConstruidos = 0;
    historicosConstruidos = 0;
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [TesoreriaPageComponent],
      providers: [
        {
          provide: AuthService,
          useValue: { obtenerRolUsuario: () => rolActivo },
        },
      ],
    });
    TestBed.overrideComponent(TesoreriaPageComponent, {
      set: {
        imports: [
          GestionCuotasStubComponent,
          HistoricoBalancesStubComponent,
          TesoreriaResumenStubComponent,
          TituloHeroStubComponent,
          VisibleParaRolesDirective,
        ],
      },
    });
    await TestBed.compileComponents();

    const fixture = TestBed.createComponent(TesoreriaPageComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('muestra resumen, cuotas e histórico para ADMIN', async () => {
    const fixture = await crearPagina('ADMIN');
    expect(fixture.nativeElement.querySelector('[data-testid="resumen-tesoreria"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="gestion-cuotas"]')).not.toBeNull();
    expect(
      fixture.nativeElement.querySelector('[data-testid="historico-balances"]'),
    ).not.toBeNull();
    expect(resumenesConstruidos).toBe(1);
    expect(historicosConstruidos).toBe(1);
  });

  it('muestra solo la gestión de cuotas para ADM_RECEPCION', async () => {
    const fixture = await crearPagina('ADM_RECEPCION');
    expect(fixture.nativeElement.querySelector('[data-testid="resumen-tesoreria"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="gestion-cuotas"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="historico-balances"]')).toBeNull();
    expect(resumenesConstruidos).toBe(0);
    expect(historicosConstruidos).toBe(0);
  });
});
