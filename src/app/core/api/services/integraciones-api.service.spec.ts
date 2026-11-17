import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { crearApiUrl } from '../api-url';
import { ActividadesApiService } from './actividades-api.service';
import { PortalProfesorApiService } from './portal-profesor-api.service';
import { PortalSocioApiService } from './portal-socio-api.service';
import { ProfesoresApiService } from './profesores-api.service';
import { RecepcionistasApiService } from './recepcionistas-api.service';
import { TesoreriaApiService } from './tesoreria-api.service';

describe('Servicios API de integraciones progresivas', () => {
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ActividadesApiService,
        PortalProfesorApiService,
        PortalSocioApiService,
        ProfesoresApiService,
        RecepcionistasApiService,
        TesoreriaApiService,
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('pagina actividades y crea con el command completo', () => {
    const servicio = TestBed.inject(ActividadesApiService);
    servicio.paginar({ page: 1, size: 10, search: 'yoga', completa: false }).subscribe();
    const listado = httpTesting.expectOne(crearApiUrl('actividad/paginate'));
    expect(listado.request.method).toBe('POST');
    expect(listado.request.body).toEqual({ page: 1, size: 10, search: 'yoga', completa: false });
    listado.flush({ content: [], totalElements: 0, totalPages: 0, size: 10, number: 0, first: true, last: true, numberOfElements: 0, empty: true });

    const payload = { nombre: 'Yoga', ubicacion: 'Sala 1', horarios: [{ diaSemana: 'LUNES' as const, horaInicio: '18:00:00', horaFin: '19:00:00', cupoMaximo: 20 }], importeCuota: 15000, diaVencimientoFijo: null, categoriaUuids: ['categoria-1'] };
    servicio.crear(payload).subscribe();
    const alta = httpTesting.expectOne(crearApiUrl('actividad'));
    expect(alta.request.body).toEqual(payload);
    expect(alta.request.body).toHaveProperty('categoriaUuids', ['categoria-1']);
    alta.flush({ actividadUuid: 'a-1', ...payload, completa: false, profesores: [] });
  });

  it('usa los endpoints separados de profesores y recepcionistas', () => {
    TestBed.inject(ProfesoresApiService).paginar({ page: 1, size: 10, search: '', estados: ['ACTIVO'] }).subscribe();
    const profesores = httpTesting.expectOne(crearApiUrl('profesor/paginate'));
    expect(profesores.request.method).toBe('POST');
    profesores.flush({ content: [], totalElements: 0, totalPages: 0, size: 10, number: 0, first: true, last: true, numberOfElements: 0, empty: true });

    TestBed.inject(RecepcionistasApiService).darDeBaja('r-1').subscribe();
    const baja = httpTesting.expectOne(crearApiUrl('recepcionista/r-1'));
    expect(baja.request.method).toBe('DELETE');
    baja.flush(null);
  });

  it('actualiza profesores y recepcionistas por UUID', () => {
    const payload = { nombre: 'Ana', telefono: '' };

    TestBed.inject(ProfesoresApiService).actualizar('p-1', payload).subscribe();
    const profesor = httpTesting.expectOne(crearApiUrl('profesor/uuid/p-1'));
    expect(profesor.request.method).toBe('PUT');
    expect(profesor.request.body).toEqual(payload);
    profesor.flush({ profesorUuid: 'p-1', apellido: 'Pérez', email: 'ana@example.com', ...payload });

    TestBed.inject(RecepcionistasApiService).actualizar('r-1', payload).subscribe();
    const recepcionista = httpTesting.expectOne(crearApiUrl('recepcionista/uuid/r-1'));
    expect(recepcionista.request.method).toBe('PUT');
    expect(recepcionista.request.body).toEqual(payload);
    recepcionista.flush({ recepcionistaUuid: 'r-1', apellido: 'Pérez', email: 'ana@example.com', ...payload });
  });

  it('actualiza el perfil de un familiar pasando memberUuid como query', () => {
    const payload = {
      nombre: 'Ana',
      apellido: 'Pérez',
      dni: '30111222',
      email: 'ana@example.com',
      telefono: '111',
      fechaNacimiento: '1990-01-01',
    };
    TestBed.inject(PortalSocioApiService).actualizarPerfil(payload, 'familiar-1').subscribe();
    const request = httpTesting.expectOne(crearApiUrl('portal/member/perfil?memberUuid=familiar-1'));
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({
      nombre: 'Ana',
      apellido: 'Pérez',
      telefono: '111',
      fechaNacimiento: '1990-01-01',
    });
    request.flush(payload);
  });

  it('consulta y actualiza el perfil del profesor por sesión', () => {
    const servicio = TestBed.inject(PortalProfesorApiService);
    const payload = { nombre: 'Ana', apellido: 'Pérez', dni: '30111222', email: 'ana@example.com', fechaNacimiento: '1990-01-01' };

    servicio.obtenerPerfil().subscribe();
    let request = httpTesting.expectOne(crearApiUrl('portal/member/perfil'));
    expect(request.request.method).toBe('GET');
    request.flush({ profesorUuid: 'p-1', ...payload });

    servicio.actualizarPerfil(payload).subscribe();
    request = httpTesting.expectOne(crearApiUrl('portal/member/perfil'));
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({
      nombre: 'Ana',
      apellido: 'Pérez',
      fechaNacimiento: '1990-01-01',
    });
    request.flush({ profesorUuid: 'p-1', ...payload });
  });

  it('consulta cuotas y amenities disponibles del portal', () => {
    const servicio = TestBed.inject(PortalSocioApiService);

    servicio.listarMisCuotas({ soloImpagas: true, ultimosMeses: 6 }).subscribe();
    let request = httpTesting.expectOne(
      crearApiUrl('portal/cuota/mias?soloImpagas=true&ultimosMeses=6'),
    );
    expect(request.request.method).toBe('GET');
    request.flush({ cuotas: [] });

    servicio.listarAmenities().subscribe();
    request = httpTesting.expectOne(crearApiUrl('portal/amenities'));
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('sube un certificado propio desde el portal como multipart', () => {
    const archivo = new File(['certificado'], 'aptitud.pdf', { type: 'application/pdf' });
    TestBed.inject(PortalSocioApiService).subirCertificado('member-1', archivo).subscribe();

    const request = httpTesting.expectOne(crearApiUrl('portal/member/uuid/member-1/certificado'));
    expect(request.request.method).toBe('POST');
    expect((request.request.body as FormData).get('file')).toBe(archivo);
    request.flush({ certificadoUuid: 'cert-1', memberUuid: 'member-1', estado: 'PENDIENTE_VALIDACION' });
  });

  it('consulta calendario de profesor con rango dd/MM/yyyy', () => {
    TestBed.inject(PortalProfesorApiService).consultarCalendario({ desde: '01/07/2026', hasta: '31/07/2026' }).subscribe();
    const request = httpTesting.expectOne(crearApiUrl('portal/profesor/calendario'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ desde: '01/07/2026', hasta: '31/07/2026' });
    request.flush([]);
  });
});
