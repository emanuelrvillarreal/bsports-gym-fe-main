import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { MOSTRAR_TOAST_ERROR } from '../../interceptors/context/http-toast-context';
import { API_ROUTES } from '../api-routes';
import { crearApiUrl } from '../api-url';
import {
  ComparacionPeriodosDto,
  PeriodoComparacion,
  ReporteCuotasDto,
  ReporteCuotasFiltros,
  ReporteEconomicoDto,
  ReporteEconomicoFiltros,
} from '../interfaces/reportes-economicos.interfaces';
import { aFechaIso } from './seguimiento-asistencia-api.service';

/** Archivo descargado del backend con el nombre que sugiere (Content-Disposition). */
export interface ArchivoDescargado {
  readonly blob: Blob;
  readonly nombre: string;
}

/** Reportes económicos de Cobros (solo ADMIN). Todos sobre movimientos reales de caja. */
@Injectable({ providedIn: 'root' })
export class ReportesEconomicosApiService {
  private readonly http = inject(HttpClient);

  consultar(filtros: ReporteEconomicoFiltros): Observable<ReporteEconomicoDto> {
    return this.http
      .post<ReporteEconomicoDto>(crearApiUrl(API_ROUTES.reportesEconomicos.movimientos), limpiar(filtros), {
        context: this.contexto('Reporte económico'),
      })
      .pipe(
        map((reporte) => ({
          ...reporte,
          movimientos: {
            ...reporte.movimientos,
            content: reporte.movimientos.content.map((fila) => ({ ...fila, fecha: aFechaIso(fila.fecha) ?? '' })),
          },
        })),
      );
  }

  /** Descarga el XLSX con exactamente los mismos filtros (se ignora la paginación). */
  descargarExcel(filtros: ReporteEconomicoFiltros): Observable<ArchivoDescargado> {
    const { page: _pagina, size: _tamanio, ...sinPaginacion } = filtros;
    return this.http
      .post(crearApiUrl(API_ROUTES.reportesEconomicos.excel), limpiar(sinPaginacion), {
        observe: 'response',
        responseType: 'blob',
        context: this.contexto('Exportación a Excel'),
      })
      .pipe(
        map((respuesta: HttpResponse<Blob>) => ({
          blob: respuesta.body ?? new Blob(),
          nombre: nombreArchivo(respuesta.headers.get('Content-Disposition')) ?? 'reporte-economico.xlsx',
        })),
      );
  }

  comparar(
    periodoA: PeriodoComparacion,
    periodoB: PeriodoComparacion,
    filtros: ReporteEconomicoFiltros,
  ): Observable<ComparacionPeriodosDto> {
    const { desde: _desde, hasta: _hasta, page: _pagina, size: _tamanio, ...resto } = filtros;
    return this.http
      .post<ComparacionPeriodosDto>(
        crearApiUrl(API_ROUTES.reportesEconomicos.comparacion),
        { periodoA, periodoB, filtros: limpiar(resto) },
        { context: this.contexto('Comparación de períodos') },
      )
      .pipe(
        map((comparacion) => ({
          ...comparacion,
          periodoA: { ...comparacion.periodoA, desde: aFechaIso(comparacion.periodoA.desde) ?? '', hasta: aFechaIso(comparacion.periodoA.hasta) ?? '' },
          periodoB: { ...comparacion.periodoB, desde: aFechaIso(comparacion.periodoB.desde) ?? '', hasta: aFechaIso(comparacion.periodoB.hasta) ?? '' },
        })),
      );
  }

  consultarCuotas(filtros: ReporteCuotasFiltros): Observable<ReporteCuotasDto> {
    return this.http.post<ReporteCuotasDto>(crearApiUrl(API_ROUTES.reportesEconomicos.cuotas), limpiar(filtros), {
      context: this.contexto('Reporte de cuotas'),
    });
  }

  private contexto(titulo: string): HttpContext {
    return new HttpContext().set(MOSTRAR_TOAST_ERROR, { titulo });
  }
}

function limpiar<T extends object>(filtros: T): T {
  return Object.fromEntries(
    Object.entries(filtros).filter(
      ([, valor]) => valor !== null && valor !== undefined && valor !== '' && !(Array.isArray(valor) && !valor.length),
    ),
  ) as T;
}

/** Lee `filename*=UTF-8''...` o `filename="..."` del encabezado Content-Disposition. */
export function nombreArchivo(contentDisposition: string | null): string | null {
  if (!contentDisposition) return null;
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition);
  if (utf8) return decodeURIComponent(utf8[1].trim());
  const simple = /filename="?([^";]+)"?/i.exec(contentDisposition);
  return simple ? simple[1].trim() : null;
}
