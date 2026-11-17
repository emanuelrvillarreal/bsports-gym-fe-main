import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { MOSTRAR_TOAST_ERROR, MOSTRAR_TOAST_EXITO } from '../../interceptors/context/http-toast-context';
import { API_ROUTES } from '../api-routes';
import { crearApiUrl } from '../api-url';
import {
  CambiarPlanPayload,
  ConfigMembresiasDto,
  CongelarPayload,
  ContratarPayload,
  DashboardMembresiasDto,
  FiltrosMembresias,
  LegajoMembresiasDto,
  MembresiaDto,
  PaginaMembresias,
  PaseDto,
  PasePayload,
  PortalContratarPayload,
  PortalMembresiasDto,
} from '../interfaces/membresias.interfaces';
import { ArchivoDescargado, nombreArchivo } from './reportes-economicos-api.service';
import { aFechaIso } from './seguimiento-asistencia-api.service';

/** Campos de fecha (LocalDate) que Jackson manda como arreglo y se pasan a ISO. */
const FECHAS = new Set([
  'fechaInicio',
  'fechaFin',
  'fechaFinOriginal',
  'fechaBaja',
  'vencimiento',
  'fechaPago',
  'desde',
  'hasta',
  'ventaDesde',
  'ventaHasta',
]);

export function normalizarMembresias<T>(valor: T): T {
  if (Array.isArray(valor)) return valor.map((item) => normalizarMembresias(item)) as T;
  if (!valor || typeof valor !== 'object') return valor;
  const resultado: Record<string, unknown> = {};
  for (const [clave, dato] of Object.entries(valor as Record<string, unknown>)) {
    resultado[clave] = FECHAS.has(clave) ? aFechaIso(dato) : typeof dato === 'object' ? normalizarMembresias(dato) : dato;
  }
  return resultado as T;
}

/** Pases (oferta del club) y membresías (pases contratados). */
@Injectable({ providedIn: 'root' })
export class MembresiasApiService {
  private readonly http = inject(HttpClient);
  private readonly rutas = API_ROUTES.membresias;

  // ---------------------------------------------------------------- Pases

  pases(): Observable<readonly PaseDto[]> {
    return this.http
      .get<PaseDto[]>(crearApiUrl(this.rutas.pases), { context: this.lectura() })
      .pipe(map(normalizarMembresias));
  }

  pasesDisponibles(): Observable<readonly PaseDto[]> {
    return this.http
      .get<PaseDto[]>(crearApiUrl(this.rutas.pasesDisponibles), { context: this.lectura() })
      .pipe(map(normalizarMembresias));
  }

  crearPase(payload: PasePayload): Observable<PaseDto> {
    return this.http
      .post<PaseDto>(crearApiUrl(this.rutas.pases), payload, { context: this.mutacion('Pase creado') })
      .pipe(map(normalizarMembresias));
  }

  editarPase(uuid: string, payload: PasePayload): Observable<PaseDto> {
    return this.http
      .put<PaseDto>(crearApiUrl(this.rutas.pase(uuid)), payload, { context: this.mutacion('Pase actualizado') })
      .pipe(map(normalizarMembresias));
  }

  eliminarPase(uuid: string): Observable<void> {
    return this.http.delete<void>(crearApiUrl(this.rutas.pase(uuid)), { context: this.mutacion('Pase eliminado') });
  }

  config(): Observable<ConfigMembresiasDto> {
    return this.http.get<ConfigMembresiasDto>(crearApiUrl(this.rutas.config), { context: this.lectura() });
  }

  guardarConfig(config: ConfigMembresiasDto): Observable<ConfigMembresiasDto> {
    return this.http.put<ConfigMembresiasDto>(crearApiUrl(this.rutas.config), config, {
      context: this.mutacion('Configuración guardada'),
    });
  }

  // ---------------------------------------------------------------- Legajo y operaciones

  legajo(memberUuid: string): Observable<LegajoMembresiasDto> {
    return this.http
      .get<LegajoMembresiasDto>(crearApiUrl(this.rutas.socio(memberUuid)), { context: this.lectura() })
      .pipe(map(normalizarMembresias));
  }

  contratar(payload: ContratarPayload): Observable<MembresiaDto> {
    return this.http
      .post<MembresiaDto>(crearApiUrl(this.rutas.base), payload, { context: this.mutacion('Pase contratado') })
      .pipe(map(normalizarMembresias));
  }

  renovar(uuid: string): Observable<MembresiaDto> {
    return this.http
      .post<MembresiaDto>(crearApiUrl(this.rutas.renovar(uuid)), {}, { context: this.mutacion('Pase renovado') })
      .pipe(map(normalizarMembresias));
  }

  cambiarPlan(uuid: string, payload: CambiarPlanPayload): Observable<MembresiaDto> {
    return this.http
      .post<MembresiaDto>(crearApiUrl(this.rutas.cambiarPlan(uuid)), payload, { context: this.mutacion('Plan cambiado') })
      .pipe(map(normalizarMembresias));
  }

  congelar(uuid: string, payload: CongelarPayload): Observable<MembresiaDto> {
    return this.http
      .post<MembresiaDto>(crearApiUrl(this.rutas.congelar(uuid)), payload, { context: this.mutacion('Pase congelado') })
      .pipe(map(normalizarMembresias));
  }

  anularCongelamiento(uuid: string): Observable<MembresiaDto> {
    return this.http
      .delete<MembresiaDto>(crearApiUrl(this.rutas.congelamiento(uuid)), { context: this.mutacion('Congelamiento anulado') })
      .pipe(map(normalizarMembresias));
  }

  darDeBaja(uuid: string, motivo: string): Observable<MembresiaDto> {
    return this.http
      .post<MembresiaDto>(crearApiUrl(this.rutas.baja(uuid)), { motivo }, { context: this.mutacion('Pase dado de baja') })
      .pipe(map(normalizarMembresias));
  }

  // ---------------------------------------------------------------- Reportes

  listar(filtros: FiltrosMembresias): Observable<PaginaMembresias> {
    return this.http
      .post<PaginaMembresias>(crearApiUrl(this.rutas.paginar), filtros, { context: this.lectura() })
      .pipe(map(normalizarMembresias));
  }

  dashboard(): Observable<DashboardMembresiasDto> {
    return this.http.get<DashboardMembresiasDto>(crearApiUrl(this.rutas.dashboard), { context: this.lectura() });
  }

  descargarExcel(filtros: FiltrosMembresias): Observable<ArchivoDescargado> {
    return this.http
      .post(crearApiUrl(this.rutas.excel), { ...filtros, page: 0, size: 200 }, {
        observe: 'response',
        responseType: 'blob',
        context: this.lectura(),
      })
      .pipe(
        map((respuesta: HttpResponse<Blob>) => ({
          blob: respuesta.body ?? new Blob(),
          nombre: nombreArchivo(respuesta.headers.get('Content-Disposition')) ?? 'membresias.xlsx',
        })),
      );
  }

  // ---------------------------------------------------------------- Portal

  portal(): Observable<PortalMembresiasDto> {
    return this.http
      .get<PortalMembresiasDto>(crearApiUrl(this.rutas.portal), { context: this.lectura() })
      .pipe(map(normalizarMembresias));
  }

  portalContratar(payload: PortalContratarPayload): Observable<MembresiaDto> {
    return this.http
      .post<MembresiaDto>(crearApiUrl(this.rutas.portal), payload, { context: this.mutacion('Pase contratado') })
      .pipe(map(normalizarMembresias));
  }

  portalRenovar(uuid: string): Observable<MembresiaDto> {
    return this.http
      .post<MembresiaDto>(crearApiUrl(this.rutas.portalRenovar(uuid)), {}, { context: this.mutacion('Pase renovado') })
      .pipe(map(normalizarMembresias));
  }

  private lectura(): HttpContext {
    return new HttpContext().set(MOSTRAR_TOAST_ERROR, { titulo: 'Membresías' });
  }

  private mutacion(exito: string): HttpContext {
    return new HttpContext()
      .set(MOSTRAR_TOAST_EXITO, { titulo: exito })
      .set(MOSTRAR_TOAST_ERROR, { titulo: 'Membresías', fondoPeligro4xx: true });
  }
}
