import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { AuthSessionService } from '../../global-services/services/auth-session.service';
import { conCompanyUuid } from '../../interceptors/context/http-headers-context';
import {
  MOSTRAR_TOAST_ERROR,
  MOSTRAR_TOAST_EXITO,
} from '../../interceptors/context/http-toast-context';
import { API_ROUTES } from '../api-routes';
import { crearApiUrl } from '../api-url';
import {
  ConfiguracionDto,
  ConfiguracionGuardarPayload,
} from '../interfaces/configuracion.interfaces';

@Injectable({ providedIn: 'root' })
export class ConfiguracionApiService {
  private readonly http = inject(HttpClient);
  private readonly authSessionService = inject(AuthSessionService);

  listar(): Observable<readonly ConfiguracionDto[]> {
    return this.http
      .get<unknown>(crearApiUrl(API_ROUTES.configuraciones.listar), {
        params: this.crearParametrosCompany(),
        context: this.crearContextoCompany().set(MOSTRAR_TOAST_ERROR, { titulo: 'Configuración' }),
      })
      .pipe(map((respuesta) => this.extraerLista(respuesta)));
  }

  obtenerPorClave(clave: string, companyUuid?: string): Observable<ConfiguracionDto | null> {
    return this.http
      .get<unknown>(crearApiUrl(API_ROUTES.configuraciones.obtenerPorClave(clave)), {
        params: this.crearParametrosCompany(companyUuid),
        context: this.crearContextoCompany(companyUuid).set(MOSTRAR_TOAST_ERROR, {
          titulo: 'Configuración',
        }),
      })
      .pipe(map((respuesta) => this.extraerConfiguracion(respuesta)));
  }

  guardar(payload: readonly ConfiguracionGuardarPayload[]): Observable<void> {
    return this.http
      .post<unknown>(crearApiUrl(API_ROUTES.configuraciones.guardar), payload, {
        params: this.crearParametrosCompany(),
        context: this.crearContextoCompany()
          .set(MOSTRAR_TOAST_EXITO, { titulo: 'Configuración' })
          .set(MOSTRAR_TOAST_ERROR, { titulo: 'Configuración' }),
      })
      .pipe(map(() => void 0));
  }

  private extraerLista(respuesta: unknown): readonly ConfiguracionDto[] {
    if (Array.isArray(respuesta)) return respuesta as ConfiguracionDto[];
    if (typeof respuesta !== 'object' || respuesta === null) return [];

    const data = (respuesta as { data?: unknown }).data;
    return Array.isArray(data) ? (data as ConfiguracionDto[]) : [];
  }

  private extraerConfiguracion(respuesta: unknown): ConfiguracionDto | null {
    if (this.esConfiguracionDto(respuesta)) return respuesta;
    if (typeof respuesta !== 'object' || respuesta === null) return null;

    const data = (respuesta as { data?: unknown }).data;
    return this.esConfiguracionDto(data) ? data : null;
  }

  private esConfiguracionDto(valor: unknown): valor is ConfiguracionDto {
    if (typeof valor !== 'object' || valor === null) return false;

    const configuracion = valor as Partial<ConfiguracionDto>;
    return (
      typeof configuracion.name === 'string' &&
      typeof configuracion.value === 'string' &&
      typeof configuracion.global === 'boolean'
    );
  }

  private crearContextoCompany(companyUuid?: string): HttpContext {
    const uuid = companyUuid?.trim() || this.authSessionService.obtenerCompanyUuid();
    return uuid ? conCompanyUuid(new HttpContext(), uuid) : new HttpContext();
  }

  /** Postman: `companyUuid` (query) scopea la config al club activo. */
  private crearParametrosCompany(companyUuid?: string): HttpParams | undefined {
    const uuid = companyUuid?.trim() || this.authSessionService.obtenerCompanyUuid().trim();
    return uuid ? new HttpParams().set('companyUuid', uuid) : undefined;
  }
}
