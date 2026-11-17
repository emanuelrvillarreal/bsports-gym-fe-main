import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { crearApiUrl } from '../api-url';
import { EventoActividadCommand } from '../interfaces/actividades.interfaces';
import { EventosActividadApiService } from './eventos-actividad-api.service';

describe('EventosActividadApiService', () => {
  let api: EventosActividadApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [EventosActividadApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(EventosActividadApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('pagina eventos filtrando por actividad sin enviar estado', () => {
    api.paginar({ page: 1, size: 5, search: 'torneo', actividadUuid: 'actividad-1' }).subscribe();

    const request = httpTesting.expectOne(crearApiUrl('evento-actividad/paginate'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      page: 1,
      size: 5,
      search: 'torneo',
      actividadUuid: 'actividad-1',
    });
    expect(request.request.body).not.toHaveProperty('estado');
    request.flush({ content: [], totalPages: 0 });
  });

  it('actualiza un evento sin reenviar la actividad', () => {
    const command: EventoActividadCommand = {
      actividadUuid: 'actividad-1',
      titulo: 'Torneo',
      descripcion: 'Final',
      ubicacion: 'Cancha 1',
      inicio: '24/07/2026 13:16:00',
      fin: '24/07/2026 14:16:00',
    };

    api.actualizar('evento-1', command).subscribe();

    const request = httpTesting.expectOne(crearApiUrl('evento-actividad/evento-1'));
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({
      titulo: command.titulo,
      descripcion: command.descripcion,
      ubicacion: command.ubicacion,
      inicio: command.inicio,
      fin: command.fin,
    });
    request.flush({});
  });

  it('cambia el estado del evento mediante el endpoint dedicado', () => {
    api.cambiarEstado('evento-1', 'CONFIRMADO').subscribe();

    const request = httpTesting.expectOne(crearApiUrl('evento-actividad/evento-1/estado'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ estado: 'CONFIRMADO' });
    request.flush({});
  });
});
