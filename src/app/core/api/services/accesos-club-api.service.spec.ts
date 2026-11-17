import { HttpEventType, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { API_ROUTES } from '../api-routes';
import { crearApiUrl } from '../api-url';
import { AccesoClubLiveEvent } from '../interfaces/accesos-club.interfaces';
import { AccesosClubApiService } from './accesos-club-api.service';

describe('AccesosClubApiService', () => {
  let api: AccesosClubApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(AccesosClubApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('comparte el stream SSE y parsea los eventos update entre fragmentos', () => {
    const recibidosA: AccesoClubLiveEvent[] = [];
    const recibidosB: AccesoClubLiveEvent[] = [];
    const suscripcionA = api.observarEnVivo().subscribe((evento) => recibidosA.push(evento));
    const suscripcionB = api.observarEnVivo().subscribe((evento) => recibidosB.push(evento));

    const request = httpTesting.expectOne(crearApiUrl(API_ROUTES.accesosClub.observarEnVivo));
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('Accept')).toBe('text/event-stream');

    request.event({
      type: HttpEventType.DownloadProgress,
      loaded: 32,
      partialText: 'event: update\ndata: {"item":{"userUuid":"user-1",',
    });
    request.event({
      type: HttpEventType.DownloadProgress,
      loaded: 128,
      partialText:
        'event: update\ndata: {"item":{"userUuid":"user-1","tipo":"INGRESO","presente":true},"presenteCount":3}\n\n',
    });

    expect(recibidosA).toEqual([
      {
        item: { userUuid: 'user-1', tipo: 'INGRESO', presente: true },
        presenteCount: 3,
      },
    ]);
    expect(recibidosB).toEqual(recibidosA);

    suscripcionA.unsubscribe();
    suscripcionB.unsubscribe();
  });

  it('reintenta tres veces el stream ante un 500 y luego se detiene', async () => {
    vi.useFakeTimers();
    const errores: unknown[] = [];
    api.observarEnVivo().subscribe({ error: (error) => errores.push(error) });

    for (let intento = 0; intento < 3; intento += 1) {
      const request = httpTesting.expectOne(crearApiUrl(API_ROUTES.accesosClub.observarEnVivo));
      request.flush(null, { status: 500, statusText: 'Internal Server Error' });

      await vi.advanceTimersByTimeAsync(2_000);
    }

    const ultimoIntento = httpTesting.expectOne(crearApiUrl(API_ROUTES.accesosClub.observarEnVivo));
    ultimoIntento.flush(null, { status: 500, statusText: 'Internal Server Error' });

    expect(errores).toHaveLength(1);
    httpTesting.expectNone(crearApiUrl(API_ROUTES.accesosClub.observarEnVivo));
    vi.useRealTimers();
  });

  it('no reintenta errores distintos de 500', () => {
    const errores: unknown[] = [];
    api.observarEnVivo().subscribe({ error: (error) => errores.push(error) });

    const request = httpTesting.expectOne(crearApiUrl(API_ROUTES.accesosClub.observarEnVivo));
    request.flush(null, { status: 503, statusText: 'Service Unavailable' });

    expect(errores).toHaveLength(1);
    httpTesting.expectNone(crearApiUrl(API_ROUTES.accesosClub.observarEnVivo));
  });
});
