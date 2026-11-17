import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { LoginService } from '../../services/login.service';
import { FinishLoginPageComponent } from './finish-login-page.component';

describe('FinishLoginPageComponent', () => {
  const completarLoginSinContrasena = vi.fn();
  const reemplazarUrl = vi.fn();
  const navegar = vi.fn();

  async function crearFixture(code: string | null, platformId = 'browser') {
    completarLoginSinContrasena.mockReset();
    reemplazarUrl.mockReset();
    navegar.mockReset();

    await TestBed.configureTestingModule({
      imports: [FinishLoginPageComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => code } } } },
        { provide: PLATFORM_ID, useValue: platformId },
        { provide: Router, useValue: { navigateByUrl: navegar } },
        { provide: Location, useValue: { replaceState: reemplazarUrl } },
        { provide: LoginService, useValue: { completarLoginSinContrasena } },
      ],
    }).compileComponents();

    return TestBed.createComponent(FinishLoginPageComponent);
  }

  it('no llama al backend si falta el código y limpia la URL', async () => {
    const fixture = await crearFixture(null);
    fixture.detectChanges();

    expect(completarLoginSinContrasena).not.toHaveBeenCalled();
    expect(reemplazarUrl).toHaveBeenCalledWith('/auth/finish-login');
    expect(fixture.nativeElement.textContent).toContain('El enlace no es válido o expiró.');
  });

  it('no consume el código durante el renderizado del servidor', async () => {
    const fixture = await crearFixture('codigo-unico', 'server');
    fixture.detectChanges();

    expect(completarLoginSinContrasena).not.toHaveBeenCalled();
    expect(reemplazarUrl).not.toHaveBeenCalled();
  });

  it('canjea una sola vez y navega al destino después de iniciar sesión', async () => {
    const fixture = await crearFixture('codigo-unico');
    completarLoginSinContrasena.mockReturnValue(of('/socio-titular/inicio'));
    fixture.detectChanges();
    fixture.detectChanges();

    expect(completarLoginSinContrasena).toHaveBeenCalledTimes(1);
    expect(completarLoginSinContrasena).toHaveBeenCalledWith('codigo-unico');
    expect(navegar).toHaveBeenCalledWith('/socio-titular/inicio');
  });

  it('muestra un estado recuperable si el enlace fue rechazado', async () => {
    const fixture = await crearFixture('codigo-vencido');
    completarLoginSinContrasena.mockReturnValue(throwError(() => new Error('Código vencido')));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('El enlace no es válido o expiró.');
    expect(fixture.nativeElement.querySelector('a[href="/login"]')).not.toBeNull();
  });
});
