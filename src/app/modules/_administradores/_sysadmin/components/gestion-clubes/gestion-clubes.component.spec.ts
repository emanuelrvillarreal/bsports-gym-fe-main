import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { describe, expect, it, afterEach, beforeEach, vi } from 'vitest';

import { crearApiUrl } from '../../../../../core/api/api-url';
import { AuthSessionService } from '../../../../../core/global-services/services/auth-session.service';
import { HEADER_COMPANY_UUID } from '../../../../../core/interceptors/context/http-headers-context';
import { ToastAlertService } from '../../../../ui/toast-alert/services/toast-alert.service';
import { GestionClubesComponent } from './gestion-clubes.component';

describe('GestionClubesComponent', () => {
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((media: string) => ({
        matches: false,
        media,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
    TestBed.configureTestingModule({
      imports: [GestionClubesComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ToastAlertService,
          useValue: { confirmDanger: vi.fn(() => Promise.resolve(true)) },
        },
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('carga clubes con size 15 y reserva siete filas visibles', async () => {
    const fixture = TestBed.createComponent(GestionClubesComponent);
    fixture.detectChanges();
    await Promise.resolve();
    fixture.detectChanges();

    const request = httpTesting.expectOne(crearApiUrl('companies/paginate-club'));
    expect(request.request.body).toEqual({ page: 1, size: 15, search: '' });
    request.flush({ content: [], totalPages: 0 });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-tabla-responsive')).not.toBeNull();
    expect(
      (fixture.componentInstance as unknown as { filasVisibles: number }).filasVisibles,
    ).toBe(7);
  });

  it('abre la edicion de empresa con el UUID seleccionado', async () => {
    const fixture = TestBed.createComponent(GestionClubesComponent);
    fixture.detectChanges();
    await Promise.resolve();
    const clubes = httpTesting.expectOne(crearApiUrl('companies/paginate-club'));
    clubes.flush({
      content: [
        {
          uuid: 'club-1',
          nombreComercial: 'Club Norte',
          razonSocial: 'Club Norte SA',
          cuit: '20000000001',
          suscripcionCrm: null,
          status: 0,
        },
      ],
      totalPages: 1,
    });
    fixture.detectChanges();

    (
      fixture.componentInstance as unknown as { manejarAccionFila(evento: unknown): void }
    ).manejarAccionFila({
      accion: 'editar-empresa',
      fila: {
        uuid: 'club-1',
        nombreComercial: 'Club Norte',
        razonSocial: 'Club Norte SA',
        cuit: '20000000001',
        suscripcionCrm: null,
        status: 0,
      },
    });

    const perfil = httpTesting.expectOne(crearApiUrl('companies/current'));
    perfil.flush({
      nombreComercial: 'Club Norte',
      razonSocial: 'Club Norte SA',
      cuit: '20000000001',
      telefono: '1140001000',
      fax: '',
      emailFacturaElectronica: 'facturas@clubnorte.com',
      emailInstitucional: 'info@clubnorte.com',
      colorPrimario: '#003366',
      colorSecundario: '#FFCC00',
      cuotaSocialHabilitada: true,
      domicilio: { direccion: '', codigoPostal: '', localidad: '' },
      domicilioFacturacion: { direccion: '', codigoPostal: '', localidad: '' },
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-popup')).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('app-tabla-responsive').length).toBe(2);
  });

  it('abre el popup de administradores y pagina con el UUID del club', async () => {
    const fixture = TestBed.createComponent(GestionClubesComponent);
    fixture.detectChanges();
    await Promise.resolve();
    const clubes = httpTesting.expectOne(crearApiUrl('companies/paginate-club'));
    clubes.flush({
      content: [{ uuid: 'club-2', nombreComercial: 'Club Sur', suscripcionCrm: null, status: 0 }],
      totalPages: 1,
    });
    fixture.detectChanges();

    (
      fixture.componentInstance as unknown as { manejarAccionFila(evento: unknown): void }
    ).manejarAccionFila({
      accion: 'administradores',
      fila: { uuid: 'club-2', nombreComercial: 'Club Sur', suscripcionCrm: null, status: 0 },
    });

    const administradores = httpTesting.expectOne(crearApiUrl('admin/paginate'));
    expect(administradores.request.body).toEqual({ page: 1, size: 15, search: '' });
    expect(administradores.request.context.get(HEADER_COMPANY_UUID)).toBe('club-2');
    administradores.flush({ content: [], totalPages: 0 });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('app-tabla-responsive').length).toBe(2);
  });

  it('permite entrar al club como ADMIN solo con rol SYSADMIN', async () => {
    TestBed.inject(AuthSessionService).guardarUsuario({
      userCompanyRoles: [{ companyUuid: 'club-global', roles: [{ name: 'SYSADMIN' }] }],
    });
    const fixture = TestBed.createComponent(GestionClubesComponent);
    fixture.detectChanges();
    await Promise.resolve();

    const clubes = httpTesting.expectOne(crearApiUrl('companies/paginate-club'));
    clubes.flush({ content: [], totalPages: 1 });
    fixture.detectChanges();

    const router = TestBed.inject(Router);
    const navegar = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    await (
      fixture.componentInstance as unknown as {
        entrarAlClub(club: { uuid: string }): Promise<void>;
      }
    ).entrarAlClub({ uuid: 'club-sysadmin' });

    expect(TestBed.inject(ToastAlertService).confirmDanger).toHaveBeenCalledWith(
      'Cualquier cambio que realices va a impactar en la empresa de manera permanente.',
      { titulo: 'Atención', textoConfirmar: 'Ingresar', textoCancelar: 'Cancelar' },
    );
    expect(navegar).toHaveBeenCalledWith('/admin/dashboard');
    expect(TestBed.inject(AuthSessionService).obtenerCompanyUuidActivo()).toBe('club-sysadmin');
    expect(TestBed.inject(AuthSessionService).obtenerRolActivo()).toBe('ADMIN');
  });
});
