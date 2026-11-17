import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuthService } from '../global-services/services/auth.service';
import { AppRole } from './auth-role';
import { VisibleParaRolesDirective } from './visible-para-roles.directive';

@Component({
  imports: [VisibleParaRolesDirective],
  template: '<span *appVisibleParaRoles="rolesPermitidos" data-testid="contenido">Visible</span>',
})
class ComponentePrueba {
  readonly rolesPermitidos: readonly AppRole[] = ['ADMIN'];
}

describe('VisibleParaRolesDirective', () => {
  let rolActivo: AppRole | null;
  let rolesAsignados: readonly AppRole[];

  async function crearComponente(): Promise<ComponentFixture<ComponentePrueba>> {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ComponentePrueba],
      providers: [
        {
          provide: AuthService,
          useValue: {
            obtenerRolUsuario: () => rolActivo,
            obtenerUsuarioGuardado: () => ({ roles: rolesAsignados }),
          },
        },
      ],
    });
    await TestBed.compileComponents();

    const fixture = TestBed.createComponent(ComponentePrueba);
    fixture.detectChanges();
    return fixture;
  }

  it('renderiza el bloque cuando el rol activo está permitido', async () => {
    rolActivo = 'ADMIN';
    rolesAsignados = ['ADMIN'];
    const fixture = await crearComponente();
    expect(fixture.nativeElement.querySelector('[data-testid="contenido"]')).not.toBeNull();
  });

  it('no renderiza el bloque cuando el rol activo no está permitido', async () => {
    rolActivo = 'ADM_RECEPCION';
    rolesAsignados = ['ADM_RECEPCION'];
    const fixture = await crearComponente();
    expect(fixture.nativeElement.querySelector('[data-testid="contenido"]')).toBeNull();
  });

  it('se basa en el rol activo aunque el usuario tenga otros roles asignados', async () => {
    rolActivo = 'ADM_RECEPCION';
    rolesAsignados = ['ADMIN', 'ADM_RECEPCION'];
    const fixture = await crearComponente();
    expect(fixture.nativeElement.querySelector('[data-testid="contenido"]')).toBeNull();
  });
});
