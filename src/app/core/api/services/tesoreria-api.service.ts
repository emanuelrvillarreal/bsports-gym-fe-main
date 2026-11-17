import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { MOSTRAR_TOAST_ERROR, MOSTRAR_TOAST_EXITO } from '../../interceptors/context/http-toast-context';
import { API_ROUTES } from '../api-routes';
import { crearApiUrl } from '../api-url';
import {
  AnularCuotaPayload,
  AnularMovimientoPayload,
  BalanceActualDto,
  BalancePaginateRequest,
  BalancePaginateResponse,
  CobroCuotaResultDto,
  CobroCuotasMercadoPagoDto,
  CobrarCuotasManualPayload,
  CobrarCuotasMercadoPagoPayload,
  CuotaActividadGeneracionResultDto,
  CuotaDetalleDto,
  CuotaGrupoTitularDto,
  CuotaPaginateRequest,
  CuotaPaginateResponse,
  CuotaPersonaDto,
  CuotaSocialGeneracionResultDto,
  FiltrosCuotas,
  GeneracionCuotasDiariaDto,
  GenerarCuotasDiariasPayload,
  GenerarCuotasHastaPayload,
  MovimientoDetalleDto,
  MovimientoManualPayload,
  MovimientoPaginateRequest,
  MovimientoPaginateResponse,
} from '../interfaces/tesoreria.interfaces';

@Injectable({ providedIn: 'root' })
export class TesoreriaApiService {
  private readonly http = inject(HttpClient);

  obtenerBalanceActual(): Observable<BalanceActualDto> {
    return this.http.get<BalanceActualDto>(crearApiUrl(API_ROUTES.balances.obtenerMesActual), {
      context: new HttpContext().set(MOSTRAR_TOAST_ERROR, { titulo: 'Cobros' }),
    });
  }

  /**
   * Dispara el ciclo diario social y de actividades para el club actual.
   * El backend usa la fecha actual cuando no se informa una fecha.
   */
  generarCuotasDiarias(
    payload: GenerarCuotasDiariasPayload = {},
  ): Observable<GeneracionCuotasDiariaDto> {
    let params = new HttpParams();
    if (payload.fecha) params = params.set('fecha', payload.fecha);

    return this.http.post<GeneracionCuotasDiariaDto>(
      crearApiUrl(API_ROUTES.cuotas.generarDiario),
      null,
      { params, context: this.contextoMutacion('Ciclo de cuotas ejecutado') },
    );
  }

  /** Genera todas las cuotas de actividad pendientes hasta `hasta` (dd/MM/yyyy). */
  generarCuotasActividad(payload: GenerarCuotasHastaPayload): Observable<CuotaActividadGeneracionResultDto> {
    const params = new HttpParams().set('hasta', payload.hasta);
    return this.http.post<CuotaActividadGeneracionResultDto>(
      crearApiUrl(API_ROUTES.cuotas.generarActividad),
      null,
      { params, context: this.contextoMutacion('Cuotas de actividad generadas') },
    );
  }

  /** Genera todas las cuotas sociales pendientes hasta `hasta` (dd/MM/yyyy). */
  generarCuotasSociales(payload: GenerarCuotasHastaPayload): Observable<CuotaSocialGeneracionResultDto> {
    const params = new HttpParams().set('hasta', payload.hasta);
    return this.http.post<CuotaSocialGeneracionResultDto>(
      crearApiUrl(API_ROUTES.cuotas.generarSocial),
      null,
      { params, context: this.contextoMutacion('Cuotas sociales generadas') },
    );
  }

  paginarCuotas(payload: CuotaPaginateRequest): Observable<CuotaPaginateResponse> {
    return this.http.post<CuotaPaginateResponse>(crearApiUrl(API_ROUTES.cuotas.paginar), payload, {
      context: this.contextoConsulta(),
    });
  }

  obtenerCuota(cuotaUuid: string): Observable<CuotaDetalleDto> {
    return this.http.get<CuotaDetalleDto>(crearApiUrl(API_ROUTES.cuotas.obtenerPorUuid(cuotaUuid)), {
      context: this.contextoConsulta(),
    });
  }

  listarCuotasPersona(
    memberUuid: string,
    filtros: FiltrosCuotas = {},
  ): Observable<CuotaPersonaDto> {
    return this.http.get<CuotaPersonaDto>(
      crearApiUrl(API_ROUTES.cuotas.listarPorPersona(memberUuid)),
      { params: this.filtrosCuotas(filtros), context: this.contextoConsulta() },
    );
  }

  listarCuotasGrupo(
    titularMemberUuid: string,
    filtros: FiltrosCuotas = {},
  ): Observable<CuotaGrupoTitularDto> {
    return this.http.get<CuotaGrupoTitularDto>(
      crearApiUrl(API_ROUTES.cuotas.listarGrupoPorTitular(titularMemberUuid)),
      { params: this.filtrosCuotas(filtros), context: this.contextoConsulta() },
    );
  }

  cobrarManual(
    payload: CobrarCuotasManualPayload,
    opciones: { readonly mostrarToastExito?: boolean } = {},
  ): Observable<CobroCuotaResultDto> {
    return this.http.post<CobroCuotaResultDto>(crearApiUrl(API_ROUTES.cuotas.cobrar), payload, {
      context: opciones.mostrarToastExito === false
        ? this.contextoConsulta()
        : this.contextoMutacion('Cobro registrado'),
    });
  }

  iniciarCobroMercadoPago(
    payload: CobrarCuotasMercadoPagoPayload,
  ): Observable<CobroCuotasMercadoPagoDto> {
    return this.http.post<CobroCuotasMercadoPagoDto>(
      crearApiUrl(API_ROUTES.cuotas.cobrar),
      payload,
      { context: this.contextoMutacion('Cobro Mercado Pago iniciado') },
    );
  }

  anularCuota(cuotaUuid: string, payload: AnularCuotaPayload): Observable<CuotaDetalleDto> {
    return this.http.post<CuotaDetalleDto>(crearApiUrl(API_ROUTES.cuotas.anular(cuotaUuid)), payload, {
      context: this.contextoMutacion('Cuota anulada'),
    });
  }

  paginarBalances(payload: BalancePaginateRequest): Observable<BalancePaginateResponse> {
    return this.http.post<BalancePaginateResponse>(
      crearApiUrl(API_ROUTES.balances.paginarHistoricos),
      payload,
      { context: this.contextoConsulta() },
    );
  }

  paginarMovimientos(payload: MovimientoPaginateRequest): Observable<MovimientoPaginateResponse> {
    return this.http.post<MovimientoPaginateResponse>(
      crearApiUrl(API_ROUTES.movimientos.paginar),
      payload,
      { context: this.contextoConsulta() },
    );
  }

  obtenerMovimiento(movimientoUuid: string): Observable<MovimientoDetalleDto> {
    return this.http.get<MovimientoDetalleDto>(
      crearApiUrl(API_ROUTES.movimientos.obtenerPorUuid(movimientoUuid)),
      { context: this.contextoConsulta() },
    );
  }

  crearMovimiento(payload: MovimientoManualPayload): Observable<MovimientoDetalleDto> {
    return this.http.post<MovimientoDetalleDto>(crearApiUrl(API_ROUTES.movimientos.crear), payload, {
      context: this.contextoMutacion(
        payload.tipo === 'INGRESO' ? 'Ingreso registrado' : 'Egreso registrado',
      ),
    });
  }

  anularMovimiento(
    movimientoUuid: string,
    payload: AnularMovimientoPayload,
  ): Observable<MovimientoDetalleDto> {
    return this.http.post<MovimientoDetalleDto>(
      crearApiUrl(API_ROUTES.movimientos.anular(movimientoUuid)),
      payload,
      { context: this.contextoMutacion('Movimiento anulado') },
    );
  }

  private filtrosCuotas(filtros: FiltrosCuotas): HttpParams {
    let params = new HttpParams();
    filtros.estados?.forEach((estado) => (params = params.append('estado', estado)));
    filtros.tipos?.forEach((tipo) => (params = params.append('tipo', tipo)));
    if (filtros.soloImpagas !== undefined) {
      params = params.set('soloImpagas', filtros.soloImpagas);
    }
    return params;
  }

  private contextoConsulta(): HttpContext {
    return new HttpContext().set(MOSTRAR_TOAST_ERROR, { titulo: 'Cobros' });
  }

  private contextoMutacion(titulo: string): HttpContext {
    return new HttpContext()
      .set(MOSTRAR_TOAST_EXITO, { titulo })
      .set(MOSTRAR_TOAST_ERROR, { titulo: 'Cobros' });
  }
}
