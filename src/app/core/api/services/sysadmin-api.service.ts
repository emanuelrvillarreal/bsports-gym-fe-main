import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { sinCompanyUuid } from '../../interceptors/context/http-headers-context';
import {
  MOSTRAR_TOAST_ERROR,
  MOSTRAR_TOAST_EXITO,
} from '../../interceptors/context/http-toast-context';
import { API_ROUTES } from '../api-routes';
import { crearApiUrl } from '../api-url';
import {
  BajaSuscripcionEmpresaCrmDto,
  CambiarPlanCrmPayload,
  CondicionImpositivaCrmDto,
  PlanCrmDto,
  ProvinciaCrmDto,
  SuscripcionEmpresaCrmDto,
  SuscribirEmpresaCrmPayload,
} from '../interfaces/crm.interfaces';
import {
  ConfiguracionMercadoPagoDto,
  GuardarConfiguracionMercadoPagoPayload,
  RegistroEmpresaPayload,
  RegistroEmpresaResponse,
} from '../interfaces/empresa.interfaces';

@Injectable({ providedIn: 'root' })
export class SysadminApiService {
  private readonly http = inject(HttpClient);

  registrarClub(payload: RegistroEmpresaPayload): Observable<RegistroEmpresaResponse> {
    return this.http.post<RegistroEmpresaResponse>(
      crearApiUrl(API_ROUTES.sysadmin.registrarClub),
      payload,
      {
        context: new HttpContext()
          .set(MOSTRAR_TOAST_EXITO, { titulo: 'Gimnasio registrado' })
          .set(MOSTRAR_TOAST_ERROR, { titulo: 'Registro de gimnasio' }),
      },
    );
  }

  sincronizarRoles(): Observable<void> {
    return this.http.post<void>(crearApiUrl(API_ROUTES.sysadmin.sincronizarRoles), null, {
      context: new HttpContext()
        .set(MOSTRAR_TOAST_EXITO, { titulo: 'Roles sincronizados' })
        .set(MOSTRAR_TOAST_ERROR, { titulo: 'Sincronización de roles' }),
    });
  }

  obtenerPlanesCrm(): Observable<readonly PlanCrmDto[]> {
    return this.http.get<readonly PlanCrmDto[]>(crearApiUrl(API_ROUTES.sysadmin.obtenerPlanesCrm), {
      context: sinCompanyUuid().set(MOSTRAR_TOAST_ERROR, { titulo: 'Planes CRM' }),
    });
  }

  obtenerProvinciasCrm(): Observable<readonly ProvinciaCrmDto[]> {
    return this.http.get<readonly ProvinciaCrmDto[]>(
      crearApiUrl(API_ROUTES.sysadmin.obtenerProvinciasCrm),
      { context: sinCompanyUuid().set(MOSTRAR_TOAST_ERROR, { titulo: 'Provincias CRM' }) },
    );
  }

  obtenerCondicionesImpositivasCrm(): Observable<readonly CondicionImpositivaCrmDto[]> {
    return this.http.get<readonly CondicionImpositivaCrmDto[]>(
      crearApiUrl(API_ROUTES.sysadmin.obtenerCondicionesImpositivasCrm),
      {
        context: sinCompanyUuid().set(MOSTRAR_TOAST_ERROR, {
          titulo: 'Condiciones impositivas CRM',
        }),
      },
    );
  }

  suscribirEmpresaCrm(
    companyUuid: string,
    payload: SuscribirEmpresaCrmPayload,
  ): Observable<SuscripcionEmpresaCrmDto> {
    return this.http.post<SuscripcionEmpresaCrmDto>(
      crearApiUrl(API_ROUTES.sysadmin.suscribirEmpresaCrm(companyUuid.trim())),
      payload,
      { context: this.crearContextoMutacionCrm('Empresa suscripta al CRM') },
    );
  }

  cambiarPlanEmpresaCrm(
    companyUuid: string,
    payload: CambiarPlanCrmPayload,
  ): Observable<SuscripcionEmpresaCrmDto> {
    return this.http.post<SuscripcionEmpresaCrmDto>(
      crearApiUrl(API_ROUTES.sysadmin.cambiarPlanEmpresaCrm(companyUuid.trim())),
      payload,
      { context: this.crearContextoMutacionCrm('Plan CRM actualizado') },
    );
  }

  desuscribirEmpresaCrm(companyUuid: string): Observable<BajaSuscripcionEmpresaCrmDto> {
    return this.http.post<BajaSuscripcionEmpresaCrmDto>(
      crearApiUrl(API_ROUTES.sysadmin.desuscribirEmpresaCrm(companyUuid.trim())),
      null,
      { context: this.crearContextoMutacionCrm('Empresa dada de baja del CRM') },
    );
  }

  obtenerConfiguracionMercadoPago(companyUuid: string): Observable<ConfiguracionMercadoPagoDto> {
    return this.http.get<ConfiguracionMercadoPagoDto>(
      crearApiUrl(API_ROUTES.sysadmin.obtenerMercadoPago(companyUuid.trim())),
      { context: sinCompanyUuid().set(MOSTRAR_TOAST_ERROR, { titulo: 'Mercado Pago' }) },
    );
  }

  guardarConfiguracionMercadoPago(
    companyUuid: string,
    payload: GuardarConfiguracionMercadoPagoPayload,
  ): Observable<ConfiguracionMercadoPagoDto> {
    return this.http.put<ConfiguracionMercadoPagoDto>(
      crearApiUrl(API_ROUTES.sysadmin.guardarMercadoPago(companyUuid.trim())),
      payload,
      {
        context: sinCompanyUuid()
          .set(MOSTRAR_TOAST_EXITO, { titulo: 'Configuración Mercado Pago guardada' })
          .set(MOSTRAR_TOAST_ERROR, { titulo: 'Mercado Pago' }),
      },
    );
  }

  private crearContextoMutacionCrm(tituloExito: string): HttpContext {
    return sinCompanyUuid()
      .set(MOSTRAR_TOAST_EXITO, { titulo: tituloExito })
      .set(MOSTRAR_TOAST_ERROR, { titulo: 'CRM', fondoPeligro4xx: true });
  }
}
