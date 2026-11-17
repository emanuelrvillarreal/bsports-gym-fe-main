import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';

import { ActividadesApiService } from '../../../../../core/api/services/actividades-api.service';
import { PortalSocioApiService } from '../../../../../core/api/services/portal-socio-api.service';
import { GrupoFamiliarCacheService } from '../../../../../core/global-services/services/grupo-familiar-cache.service';
import { ToastAlertService } from '../../../../ui/toast-alert/services/toast-alert.service';
import { ActividadesPortalComponent } from './actividades-portal.component';

describe('ActividadesPortalComponent', () => {
  const actividadesApi = {
    paginar: vi.fn(),
  };
  const portalApi = {
    obtenerGrupoFamiliar: vi.fn(),
    inscribirActividad: vi.fn(),
  };
  const toast = {
    confirm: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    encolarInfo: vi.fn(),
  };

  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
    actividadesApi.paginar.mockReturnValue(
      of({ content: [], totalPages: 1, totalElements: 0, size: 20, number: 1, first: true, last: true, numberOfElements: 0, empty: true }),
    );
    portalApi.obtenerGrupoFamiliar.mockReturnValue(of({ titularMemberUuid: 'titular-1', integrantes: [] }));
    portalApi.inscribirActividad.mockReset();
    toast.confirm.mockResolvedValue(true);
    toast.success.mockReset();
    toast.error.mockReset();
    toast.encolarInfo.mockReset();

    TestBed.configureTestingModule({
      imports: [ActividadesPortalComponent],
      providers: [
        { provide: ActividadesApiService, useValue: actividadesApi },
        { provide: PortalSocioApiService, useValue: portalApi },
        GrupoFamiliarCacheService,
        { provide: ToastAlertService, useValue: toast },
      ],
    });
  });

  it('pagina todas las actividades por defecto', () => {
    TestBed.createComponent(ActividadesPortalComponent);

    expect(actividadesApi.paginar).toHaveBeenCalledWith({
      page: 1,
      size: 20,
      search: '',
      completa: null,
    });
  });

  it('inscribe a un familiar con su UUID y muestra la confirmación', async () => {
    portalApi.inscribirActividad.mockReturnValue(
      of({
        inscripcionUuid: 'inscripcion-1', actividadUuid: 'actividad-1', actividadNombre: 'Natación',
        memberUuid: 'familiar-1', memberNombre: 'Ana', memberApellido: 'Pérez', fechaInscripcion: '26/08/2026',
        actividadCompleta: false, cuotaGenerada: false, cuotaUuid: null, cuotaAdvertencia: 'La cuota se generará luego.',
      }),
    );
    const fixture = TestBed.createComponent(ActividadesPortalComponent);
    const componente = fixture.componentInstance as unknown as {
      actividadSeleccionada: { set(value: unknown): void };
      integranteSeleccionado: { set(value: string): void };
      horariosSeleccionados: { set(value: readonly string[]): void };
      confirmarInscripcion(): Promise<void>;
    };
    componente.actividadSeleccionada.set({ actividadUuid: 'actividad-1', nombre: 'Natación' });
    componente.integranteSeleccionado.set('familiar-1');
    componente.horariosSeleccionados.set(['horario-lunes-12']);

    await componente.confirmarInscripcion();

    expect(portalApi.inscribirActividad).toHaveBeenCalledWith({
      actividadUuid: 'actividad-1',
      memberUuid: 'familiar-1',
      horarioUuids: ['horario-lunes-12'],
    });
    expect(toast.success).toHaveBeenCalledWith('Ana Pérez quedó inscripto/a en Natación.', { titulo: 'Inscripción confirmada' });
    expect(toast.encolarInfo).toHaveBeenCalledWith('La cuota se generará luego.', { titulo: 'Cuota de actividad' });
  });

  it('muestra el mensaje de negocio enviado por el backend', async () => {
    portalApi.inscribirActividad.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 400, error: { userMessage: 'Ya está inscripto.' } })),
    );
    const fixture = TestBed.createComponent(ActividadesPortalComponent);
    const componente = fixture.componentInstance as unknown as {
      actividadSeleccionada: { set(value: unknown): void };
      horariosSeleccionados: { set(value: readonly string[]): void };
      confirmarInscripcion(): Promise<void>;
    };
    componente.actividadSeleccionada.set({ actividadUuid: 'actividad-1', nombre: 'Natación' });
    componente.horariosSeleccionados.set(['horario-lunes-12']);

    await componente.confirmarInscripcion();

    expect(toast.error).toHaveBeenCalledWith('Ya está inscripto.', { titulo: 'Inscripción a actividad' });
  });

  it('no inscribe sin al menos un horario elegido', async () => {
    const fixture = TestBed.createComponent(ActividadesPortalComponent);
    const componente = fixture.componentInstance as unknown as {
      actividadSeleccionada: { set(value: unknown): void };
      confirmarInscripcion(): Promise<void>;
    };
    componente.actividadSeleccionada.set({ actividadUuid: 'actividad-1', nombre: 'Natación', horarios: [] });

    await componente.confirmarInscripcion();

    expect(portalApi.inscribirActividad).not.toHaveBeenCalled();
  });
});
