import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Observable, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AmenityDto,
  PaginaReservasAmenityDto,
} from '../../../../../core/api/interfaces/amenities.interfaces';
import { PortalSocioApiService } from '../../../../../core/api/services/portal-socio-api.service';
import { AuthSessionService } from '../../../../../core/global-services/services/auth-session.service';
import { PaginacionComponent } from '../../../../ui/paginacion/paginacion.component';
import { TablaResponsiveComponent } from '../../../../ui/tabla-responsive/tabla-responsive.component';
import { AmenitiesPortalComponent } from './amenities-portal.component';

describe('AmenitiesPortalComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  function crear(
    listarAmenities: () => Observable<readonly AmenityDto[]> = vi.fn(() => of([])),
    paginarMisReservasAmenities: () => Observable<PaginaReservasAmenityDto> = vi.fn(() => of({
      content: [], totalElements: 0, totalPages: 0, size: 50, number: 0,
      first: true, last: true, numberOfElements: 0, empty: true,
    })),
    rolActivo = 'SOCIO_TITULAR',
  ) {
    TestBed.configureTestingModule({
      imports: [AmenitiesPortalComponent],
      providers: [
        { provide: PortalSocioApiService, useValue: { listarAmenities, paginarMisReservasAmenities } },
        { provide: AuthSessionService, useValue: { obtenerRolActivo: () => rolActivo } },
      ],
    });
    const fixture = TestBed.createComponent(AmenitiesPortalComponent);
    fixture.detectChanges();
    return { fixture, listarAmenities, paginarMisReservasAmenities };
  }

  it('consulta los amenities del portal y muestra su disponibilidad', () => {
    const listarAmenities = vi.fn(() => of([{
      amenityUuid: 'amenity-1', nombre: 'Quincho', montoHora: 1500, porcentajeSena: 30,
      diasSemana: 'VIERNES;SABADO', horaInicio: '10:00:00', horaFin: '22:00:00',
    }]));
    const { fixture } = crear(listarAmenities);

    expect(listarAmenities).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.textContent).toContain('Quincho');
    expect(fixture.nativeElement.textContent).toContain('Viernes');
    expect(fixture.nativeElement.textContent).toContain('Sabado');
    expect(fixture.nativeElement.textContent).toContain('$1.500');
  });

  it('muestra un estado recuperable cuando falla la consulta', () => {
    const { fixture } = crear(vi.fn(() => throwError(() => new Error('Error de red'))));
    expect(fixture.nativeElement.textContent).toContain('No se pudieron cargar los amenities.');
    expect(fixture.nativeElement.querySelector('button')).not.toBeNull();
  });

  it('agrupa los siete días de la semana en un único chip', () => {
    const listarAmenities = vi.fn(() => of([{
      amenityUuid: 'amenity-2', nombre: 'Pileta', montoHora: 0, porcentajeSena: 0,
      diasSemana: 'LUNES,MARTES,MIERCOLES,JUEVES,VIERNES,SABADO,DOMINGO',
      horaInicio: '09:00:00', horaFin: '20:00:00',
    }]));
    const { fixture } = crear(listarAmenities);

    expect(fixture.nativeElement.textContent).toContain('Todos los días');
    expect(fixture.nativeElement.textContent).not.toContain('Lunes Martes');
  });

  it('pagina las reservas propias de a 50 y permite pagar una seña pendiente', () => {
    const paginarMisReservasAmenities = vi.fn(() => of({
      content: [{
        reservaUuid: 'reserva-1', amenityUuid: 'amenity-1', amenityNombre: 'Quincho',
        memberUuid: 'member-1', inicio: '2026-08-20T18:00:00', fin: '2026-08-20T20:00:00',
        estado: 'CONFIRMADA' as const, montoTotal: 4000, montoSena: 1000, saldoPendiente: 3000,
        venceSenaAt: '28/08/2026 12:01:27',
      }],
      totalElements: 51, totalPages: 2, size: 50, number: 0,
      first: true, last: false, numberOfElements: 1, empty: false,
    }));
    const { fixture } = crear(vi.fn(() => of([])), paginarMisReservasAmenities);

    expect(paginarMisReservasAmenities).toHaveBeenCalledWith({ page: 1, size: 50 });
    expect(fixture.nativeElement.textContent).toContain('Quincho');
    expect(fixture.nativeElement.textContent).toContain('$4.000');
    expect(fixture.nativeElement.textContent).toContain('$1.000');
    expect(fixture.nativeElement.textContent).toContain('-$3.000');
    expect(fixture.nativeElement.textContent).toContain('28/08/2026 12:01:27');
    const tablas = fixture.debugElement.queryAll(By.directive(TablaResponsiveComponent));
    const tablaReservas = tablas[1].componentInstance as TablaResponsiveComponent<object>;
    expect(tablaReservas.tbodyRows()).toBe(4);
    expect(tablaReservas.mostrarAcciones()).toBe(true);
    const paginacion = fixture.debugElement.query(By.directive(PaginacionComponent))
      .componentInstance as PaginacionComponent;
    expect(paginacion.cantidadBotonesVisibles()).toBe(5);
  });

  it('oculta la paginación cuando las reservas entran en una página', () => {
    const { fixture } = crear();

    expect(fixture.debugElement.query(By.directive(PaginacionComponent))).toBeNull();
  });

  it('no consulta ni muestra reservas para el rol familiar', () => {
    const paginarMisReservasAmenities = vi.fn(() => of({
      content: [], totalElements: 0, totalPages: 0, size: 50, number: 0,
      first: true, last: true, numberOfElements: 0, empty: true,
    }));
    const { fixture } = crear(vi.fn(() => of([])), paginarMisReservasAmenities, 'FAMILIAR');

    expect(paginarMisReservasAmenities).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).not.toContain('Mis reservas');
  });
});
