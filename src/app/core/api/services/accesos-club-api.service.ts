import {
  HttpClient,
  HttpContext,
  HttpDownloadProgressEvent,
  HttpErrorResponse,
  HttpEvent,
  HttpEventType,
  HttpParams,
} from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  Observable,
  ReplaySubject,
  defer,
  filter,
  map,
  mergeMap,
  retry,
  share,
  throwError,
  timer,
} from 'rxjs';

import {
  MOSTRAR_TOAST_ERROR,
} from '../../interceptors/context/http-toast-context';
import { API_ROUTES } from '../api-routes';
import { crearApiUrl } from '../api-url';
import {
  AccesoClubLiveEvent,
  AccesoClubDto,
  PresentesClubResponse,
  RegistrarAccesoClubCommand,
} from '../interfaces/accesos-club.interfaces';

const REINTENTOS_LIVE_ANTE_ERROR_500 = 3;
const DEMORA_REINTENTO_LIVE_MS = 2_000;

@Injectable({ providedIn: 'root' })
export class AccesosClubApiService {
  private readonly http = inject(HttpClient);
  private readonly eventosLive$ = defer(() => this.crearStreamLive()).pipe(
    retry({
      count: REINTENTOS_LIVE_ANTE_ERROR_500,
      delay: (error: unknown) =>
        error instanceof HttpErrorResponse && error.status === 500
          ? timer(DEMORA_REINTENTO_LIVE_MS)
          : throwError(() => error),
    }),
    share({
      connector: () => new ReplaySubject<AccesoClubLiveEvent>(1),
      resetOnError: true,
      resetOnComplete: true,
      resetOnRefCountZero: true,
    }),
  );

  registrar(command: RegistrarAccesoClubCommand): Observable<AccesoClubDto> {
    return this.http.post<AccesoClubDto>(crearApiUrl(API_ROUTES.accesosClub.registrar), command, {
      context: this.contextoConsulta(),
    });
  }

  listarPresentes(): Observable<PresentesClubResponse> {
    return this.http.get<PresentesClubResponse>(
      crearApiUrl(API_ROUTES.accesosClub.listarPresentes),
      { context: this.contextoConsulta() },
    );
  }

  obtenerHistorial(desde: string, hasta: string): Observable<readonly AccesoClubDto[]> {
    const params = new HttpParams().set('desde', desde).set('hasta', hasta);
    return this.http.get<readonly AccesoClubDto[]>(
      crearApiUrl(API_ROUTES.accesosClub.obtenerHistorial),
      { params, context: this.contextoConsulta() },
    );
  }

  /**
   * Comparte una unica conexion SSE entre el header y las vistas activas.
   * HttpClient conserva los interceptores de autenticacion y empresa, que un
   * EventSource nativo no permite expresar mediante headers.
   */
  observarEnVivo(): Observable<AccesoClubLiveEvent> {
    return this.eventosLive$;
  }

  private contextoConsulta(): HttpContext {
    return new HttpContext().set(MOSTRAR_TOAST_ERROR, { titulo: 'Accesos' });
  }

  private crearStreamLive(): Observable<AccesoClubLiveEvent> {
    let longitudProcesada = 0;
    let buffer = '';

    return this.http
      .get(crearApiUrl(API_ROUTES.accesosClub.observarEnVivo), {
        observe: 'events',
        reportProgress: true,
        responseType: 'text',
        headers: { Accept: 'text/event-stream' },
      })
      .pipe(
        filter(
          (evento: HttpEvent<string>): evento is HttpDownloadProgressEvent =>
            evento.type === HttpEventType.DownloadProgress &&
            typeof evento.partialText === 'string',
        ),
        map((evento) => {
          const textoCompleto = evento.partialText ?? '';
          const fragmento = textoCompleto.slice(longitudProcesada);
          longitudProcesada = textoCompleto.length;
          buffer += fragmento;

          const eventos: AccesoClubLiveEvent[] = [];
          let separador = buffer.search(/\r?\n\r?\n/);
          while (separador >= 0) {
            const bloque = buffer.slice(0, separador);
            const coincidencia = buffer.slice(separador).match(/^\r?\n\r?\n/);
            buffer = buffer.slice(separador + (coincidencia?.[0].length ?? 2));
            const eventoLive = this.parsearEventoLive(bloque);
            if (eventoLive) eventos.push(eventoLive);
            separador = buffer.search(/\r?\n\r?\n/);
          }

          return eventos;
        }),
        mergeMap((eventos) => eventos),
      );
  }

  private parsearEventoLive(bloque: string): AccesoClubLiveEvent | null {
    let tipo = 'message';
    const lineasData: string[] = [];

    for (const linea of bloque.split(/\r?\n/)) {
      if (!linea || linea.startsWith(':')) continue;
      if (linea.startsWith('event:')) tipo = linea.slice(6).trim();
      if (linea.startsWith('data:')) lineasData.push(linea.slice(5).trimStart());
    }

    if (tipo !== 'update' || lineasData.length === 0) return null;

    try {
      const valor = JSON.parse(lineasData.join('\n')) as Partial<AccesoClubLiveEvent>;
      if (
        !valor.item ||
        typeof valor.item !== 'object' ||
        typeof valor.item.userUuid !== 'string' ||
        !['INGRESO', 'EGRESO'].includes(valor.item.tipo) ||
        typeof valor.presenteCount !== 'number' ||
        !Number.isFinite(valor.presenteCount)
      ) {
        return null;
      }

      return {
        item: valor.item,
        presenteCount: Math.max(0, Math.floor(valor.presenteCount)),
      };
    } catch {
      return null;
    }
  }
}
