import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { PortalSocioApiService } from '../../../../../core/api/services/portal-socio-api.service';
import { SociosApiService } from '../../../../../core/api/services/socios-api.service';
import { AuthSessionService } from '../../../../../core/global-services/services/auth-session.service';
import { CarnetComponent } from '../../../../ui/carnet/carnet.component';
import { PerformanceModeService } from '../../../../ui/performance-mode.service';
import { ToastAlertService } from '../../../../ui/toast-alert/services/toast-alert.service';
import { GrupoFamiliarPortalComponent } from './grupo-familiar-portal.component';

describe('GrupoFamiliarPortalComponent', () => {
  const respuestaGrupo = {
    titularMemberUuid: 'titular-1',
    integrantes: [
      {
        userUuid: 'user-titular',
        qr: 'qr-titular',
        member: {
          memberUuid: 'titular-1',
          titular: true,
          titularMemberUuid: null,
          parentesco: null,
          estado: 'ACTIVO',
          nombre: 'Ana',
          apellido: 'Titular',
          dni: '12345678',
          email: 'ana@example.com',
        },
      },
      {
        userUuid: 'user-familiar',
        qr: 'qr-familiar-base64',
        member: {
          memberUuid: 'familiar-1',
          titular: false,
          titularMemberUuid: 'titular-1',
          parentesco: 'HIJO',
          estado: 'ACTIVO',
          fechaAlta: '17/07/2026',
          nombre: 'Luis',
          apellido: 'Familiar',
          dni: '47444606',
          email: 'luis@example.com',
          imageUrl: null,
        },
      },
    ],
  } as const;

  function crear() {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({ matches: false })),
    });
    TestBed.configureTestingModule({
      imports: [GrupoFamiliarPortalComponent],
      providers: [
        {
          provide: PortalSocioApiService,
          useValue: { obtenerGrupoFamiliar: vi.fn(() => of(respuestaGrupo)) },
        },
        {
          provide: SociosApiService,
          useValue: { crearFamiliarDesdePortal: vi.fn() },
        },
        {
          provide: PerformanceModeService,
          useValue: { desactivado: () => true },
        },
        {
          provide: AuthSessionService,
          useValue: { companyLogoUrl: signal('') },
        },
        { provide: ToastAlertService, useValue: { encolarInfo: vi.fn() } },
      ],
    });

    const fixture = TestBed.createComponent(GrupoFamiliarPortalComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('adapta integrantes[].member y muestra solamente los familiares', () => {
    const fixture = crear();

    expect(fixture.nativeElement.textContent).toContain('Luis');
    expect(fixture.nativeElement.textContent).toContain('Familiar');
    expect(fixture.nativeElement.textContent).not.toContain('Titular');
  });

  it('abre la credencial reutilizable con el QR del familiar', async () => {
    const fixture = crear();
    const botonCredencial = fixture.nativeElement.querySelector(
      'button[aria-label="Ver credencial"]',
    ) as HTMLButtonElement;

    botonCredencial.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const carnet = fixture.debugElement.query(By.directive(CarnetComponent))
      .componentInstance as CarnetComponent;
    expect(carnet.nombre()).toBe('Luis');
    expect(carnet.qrContenido()).toBe('user-familiar');
    expect(carnet.qrImagen()).toBe('qr-familiar-base64');
    expect(carnet.campos()).toEqual([
      { etiqueta: 'DNI', valor: '47.444.606' },
      { etiqueta: 'Parentesco', valor: 'HIJO' },
      { etiqueta: 'Mail', valor: 'luis@example.com' },
      { etiqueta: 'Alta', valor: '17/07/2026' },
    ]);
  });

  it('muestra pendiente de confirmación y bloquea las tres acciones para status -2', () => {
    const respuestaPendiente = {
      ...respuestaGrupo,
      integrantes: respuestaGrupo.integrantes.map((integrante) =>
        integrante.member.memberUuid === 'familiar-1'
          ? { ...integrante, member: { ...integrante.member, status: -2 } }
          : integrante,
      ),
    };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [GrupoFamiliarPortalComponent],
      providers: [
        {
          provide: PortalSocioApiService,
          useValue: { obtenerGrupoFamiliar: vi.fn(() => of(respuestaPendiente)) },
        },
        { provide: SociosApiService, useValue: { crearFamiliarDesdePortal: vi.fn() } },
        { provide: PerformanceModeService, useValue: { desactivado: () => true } },
        { provide: AuthSessionService, useValue: { companyLogoUrl: signal('') } },
        { provide: ToastAlertService, useValue: { encolarInfo: vi.fn() } },
      ],
    });
    const fixture = TestBed.createComponent(GrupoFamiliarPortalComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Pendiente de confirmación');
    // Con tres acciones queda una a la vista y el resto en el menú ⋯: todas deben estar bloqueadas.
    const elemento = fixture.nativeElement as HTMLElement;
    elemento.querySelector<HTMLButtonElement>('button[aria-label="Más acciones"]')?.click();
    fixture.detectChanges();
    const accionBloqueada = (texto: string) =>
      [
        ...Array.from(elemento.querySelectorAll<HTMLButtonElement>(`button[aria-label="${texto}"]`)),
        ...Array.from(elemento.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')).filter(
          (item) => item.textContent?.trim().startsWith(texto),
        ),
      ].some((boton) => boton.disabled);

    expect(accionBloqueada('Ver credencial')).toBe(true);
    expect(accionBloqueada('Certificados')).toBe(true);
    expect(accionBloqueada('Editar')).toBe(true);
  });

  it('encola el aviso de confirmación al crear la solicitud', () => {
    const crearFamiliarDesdePortal = vi.fn(() => of({ memberUuid: 'familiar-2' }));
    const encolarInfo = vi.fn();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [GrupoFamiliarPortalComponent],
      providers: [
        { provide: PortalSocioApiService, useValue: { obtenerGrupoFamiliar: vi.fn(() => of(respuestaGrupo)) } },
        { provide: SociosApiService, useValue: { crearFamiliarDesdePortal } },
        { provide: PerformanceModeService, useValue: { desactivado: () => true } },
        { provide: AuthSessionService, useValue: { companyLogoUrl: signal('') } },
        { provide: ToastAlertService, useValue: { encolarInfo } },
      ],
    });
    const fixture = TestBed.createComponent(GrupoFamiliarPortalComponent);
    fixture.detectChanges();

    fixture.componentInstance['guardar']({
      modo: 'alta',
      datos: {
        nombre: 'Ana',
        apellido: 'Pérez',
        email: 'ana@example.com',
        parentesco: 'HIJA',
        password: 'secreto',
      },
    });

    expect(encolarInfo).toHaveBeenCalledWith('El familiar aparecerá cuando se confirme la solicitud.', {
      titulo: 'Solicitud pendiente',
    });
  });
});
