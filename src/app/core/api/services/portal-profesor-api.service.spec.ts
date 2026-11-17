import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { crearApiUrl } from '../api-url';
import { EventoActividadCommand } from '../interfaces/actividades.interfaces';
import { PortalProfesorApiService } from './portal-profesor-api.service';

describe('PortalProfesorApiService eventos y asistencia', () => {
  let api: PortalProfesorApiService;
  let httpTesting: HttpTestingController;
  const command: EventoActividadCommand = {
    actividadUuid: 'actividad-1',
    titulo: 'Clase especial',
    descripcion: 'Repaso',
    ubicacion: 'Sala 2',
    inicio: '20/06/2026 10:00:00',
    fin: '20/06/2026 12:00:00',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PortalProfesorApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(PortalProfesorApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('obtiene el perfil desde el endpoint propio del profesor', () => {
    api.obtenerPerfil().subscribe();

    const request = httpTesting.expectOne(crearApiUrl('portal/profesor/perfil'));
    expect(request.request.method).toBe('GET');
    request.flush({
      profesorUuid: 'profesor-1',
      nombre: 'Ana',
      apellido: 'López',
      email: 'ana@example.com',
    });
  });

  it('actualiza el perfil desde el endpoint propio del profesor', () => {
    const payload = {
      nombre: 'Ana',
      apellido: 'López',
      telefono: '1140002000',
    };

    api.actualizarPerfil(payload).subscribe();

    const request = httpTesting.expectOne(crearApiUrl('portal/profesor/perfil'));
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(payload);
    request.flush({
      profesorUuid: 'profesor-1',
      email: 'ana@example.com',
      ...payload,
    });
  });

  it('crea eventos mediante el portal del profesor', () => {
    api.crearEvento(command).subscribe();
    const request = httpTesting.expectOne(crearApiUrl('portal/profesor/evento-actividad'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(command);
    request.flush({});
  });

  it('edita sin reenviar la actividad', () => {
    api.actualizarEvento('evento-1', command).subscribe();
    const request = httpTesting.expectOne(crearApiUrl('portal/profesor/evento-actividad/evento-1'));
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).not.toHaveProperty('actividadUuid');
    request.flush({});
  });

  it('guarda una asistencia parcial por slot', () => {
    api
      .guardarAsistencia('slot-1', {
        items: [{ memberUuid: 'socio-1', estado: 'AUSENTE' }],
      })
      .subscribe();
    const request = httpTesting.expectOne(crearApiUrl('portal/profesor/asistencia/slot/slot-1'));
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({
      items: [{ memberUuid: 'socio-1', estado: 'AUSENTE' }],
    });
    request.flush({
      slotUuid: 'slot-1',
      actividadUuid: 'actividad-1',
      actividadNombre: 'Yoga',
      fecha: '28/07/2026',
      inicio: '28/07/2026 10:00:00',
      fin: '28/07/2026 11:00:00',
      alumnos: [],
    });
  });

  it('pagina el historial del profesor filtrando por una actividad obligatoria', () => {
    const payload = { page: 2, size: 5, actividadUuid: 'actividad-1' };

    api.paginarAsistencias(payload).subscribe();

    const request = httpTesting.expectOne(crearApiUrl('portal/profesor/asistencia/paginate'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    request.flush({ content: [], totalPages: 1 });
  });

  it('normaliza los alumnos de la planilla para la tabla del profesor', () => {
    let respuesta: readonly {
      readonly memberUuid: string;
      readonly nombre: string;
      readonly apellido: string;
      readonly estado: 'PRESENTE' | 'AUSENTE' | 'AUSENTE_JUSTIFICADO' | null;
    }[] = [];

    api.obtenerPlanillaAsistencia('slot-1').subscribe((planilla) => (respuesta = planilla));

    const request = httpTesting.expectOne(crearApiUrl('portal/profesor/asistencia/slot/slot-1'));
    expect(request.request.method).toBe('GET');
    request.flush({
      slotUuid: 'slot-1',
      actividadUuid: 'actividad-1',
      actividadNombre: 'Yoga',
      fecha: '28/07/2026',
      inicio: '28/07/2026 10:00:00',
      fin: '28/07/2026 11:00:00',
      alumnos: [
        {
          memberUuid: 'socio-1',
          memberNombre: 'Ana',
          memberApellido: 'Pérez',
          fechaInscripcion: '24/07/2026',
          estado: null,
        },
      ],
    });

    expect(respuesta).toEqual([
      { memberUuid: 'socio-1', nombre: 'Ana', apellido: 'Pérez', estado: null },
    ]);
  });

  it('da de baja mediante el endpoint del portal', () => {
    api.eliminarEvento('evento-1').subscribe();
    const request = httpTesting.expectOne(crearApiUrl('portal/profesor/evento-actividad/evento-1'));
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
  });
});
