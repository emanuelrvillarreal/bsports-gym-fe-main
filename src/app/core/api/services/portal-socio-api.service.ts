import { MemberDescuentosDto } from '../interfaces/descuentos.interfaces';
import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { MOSTRAR_TOAST_ERROR, MOSTRAR_TOAST_EXITO } from '../../interceptors/context/http-toast-context';
import { API_ROUTES } from '../api-routes';
import { crearApiUrl } from '../api-url';
import { crearPayloadPerfilPortal } from '../perfil-portal-payload';
import {
  ActualizarPerfilPortalPayload,
  CalendarioConsultaPayload,
  CalendarioSlotDto,
  CredencialPortalDto,
  GrupoFamiliarPortalDto,
  PerfilPortalDto,
} from '../interfaces/portal.interfaces';
import {
  AmenityDto,
  PaginaReservasAmenityDto,
  PaginarMisReservasAmenityCommand,
  ReintentarPagoReservaAmenityPortalCommand,
  ReservaAmenityCobroResultDto,
  ReservarAmenityPortalCommand,
} from '../interfaces/amenities.interfaces';
import {
  CuotaGrupoTitularDto,
  CuotaPersonaDto,
  FiltrosCuotasPortal,
} from '../interfaces/tesoreria.interfaces';
import { CertificadoMedicoDto } from '../interfaces/certificados-medicos.interfaces';
import {
  PortalInscripcionActividadDto,
  PortalInscripcionActividadPayload,
  PortalInscripcionActividadResponse,
} from '../interfaces/actividades.interfaces';

@Injectable({ providedIn: 'root' })
export class PortalSocioApiService {
  private readonly http = inject(HttpClient);

  obtenerPerfil(): Observable<PerfilPortalDto> {
    return this.http.get<PerfilPortalDto>(crearApiUrl(API_ROUTES.portalSocio.obtenerPerfil), {
      context: this.contextoLectura('Perfil'),
    });
  }

  actualizarPerfil(
    payload: ActualizarPerfilPortalPayload,
    memberUuid?: string,
  ): Observable<PerfilPortalDto> {
    const params = memberUuid ? new HttpParams().set('memberUuid', memberUuid) : undefined;
    return this.http.put<PerfilPortalDto>(
      crearApiUrl(API_ROUTES.portalSocio.actualizarPerfil),
      crearPayloadPerfilPortal(payload),
      {
        params,
        context: this.contextoMutacion('Perfil actualizado'),
      },
    );
  }

  obtenerCredencial(): Observable<CredencialPortalDto<PerfilPortalDto>> {
    return this.http.get<CredencialPortalDto<PerfilPortalDto>>(crearApiUrl(API_ROUTES.portalSocio.obtenerCredencial), {
      context: this.contextoLectura('Credencial'),
    });
  }

  /** Descuentos vigentes y futuros del socio (y de su grupo, si es titular). */
  misDescuentos(): Observable<readonly MemberDescuentosDto[]> {
    return this.http.get<readonly MemberDescuentosDto[]>(crearApiUrl(API_ROUTES.portalSocio.misDescuentos), {
      context: this.contextoLectura('Mis descuentos'),
    });
  }

  obtenerGrupoFamiliar(): Observable<GrupoFamiliarPortalDto> {
    return this.http.get<GrupoFamiliarPortalDto>(crearApiUrl(API_ROUTES.portalSocio.obtenerGrupoFamiliar), {
      context: this.contextoLectura('Grupo familiar'),
    });
  }

  listarMisCuotas(filtros: FiltrosCuotasPortal = {}): Observable<CuotaPersonaDto> {
    return this.http.get<CuotaPersonaDto>(crearApiUrl(API_ROUTES.portalSocio.listarMisCuotas), {
      params: this.crearParametrosCuotas(filtros),
      context: this.contextoLectura('Mis cuotas'),
    });
  }

  listarCuotasGrupoFamiliar(
    filtros: FiltrosCuotasPortal = {},
  ): Observable<CuotaGrupoTitularDto> {
    return this.http.get<CuotaGrupoTitularDto>(
      crearApiUrl(API_ROUTES.portalSocio.listarCuotasGrupoFamiliar),
      { params: this.crearParametrosCuotas(filtros), context: this.contextoLectura('Cuotas del grupo') },
    );
  }

  listarAmenities(): Observable<readonly AmenityDto[]> {
    return this.http.get<readonly AmenityDto[]>(crearApiUrl(API_ROUTES.portalSocio.listarAmenities), {
      context: this.contextoLectura('Comodidades'),
    });
  }

  paginarMisReservasAmenities(
    payload: PaginarMisReservasAmenityCommand,
  ): Observable<PaginaReservasAmenityDto> {
    return this.http.post<PaginaReservasAmenityDto>(
      crearApiUrl(API_ROUTES.portalSocio.paginarMisReservasAmenities),
      payload,
      { context: this.contextoLectura('Mis reservas') },
    );
  }

  /**
   * Inscribe al titular de la sesión o a uno de sus familiares en una actividad.
   * Los mensajes de éxito y error los controla el flujo de UI para evitar toasts duplicados.
   */
  inscribirActividad(
    payload: PortalInscripcionActividadPayload,
  ): Observable<PortalInscripcionActividadResponse> {
    return this.http.post<PortalInscripcionActividadResponse>(
      crearApiUrl(API_ROUTES.portalSocio.inscribirActividad),
      payload,
    );
  }

  /** Cambia los horarios del titular o de un familiar en una actividad, sin darlo de baja. */
  cambiarHorariosActividad(
    payload: PortalInscripcionActividadPayload,
  ): Observable<PortalInscripcionActividadResponse> {
    return this.http.put<PortalInscripcionActividadResponse>(
      crearApiUrl(API_ROUTES.portalSocio.cambiarHorariosActividad),
      payload,
    );
  }

  listarMisInscripcionesActividades(): Observable<readonly PortalInscripcionActividadDto[]> {
    return this.http.get<readonly PortalInscripcionActividadDto[]>(
      crearApiUrl(API_ROUTES.portalSocio.listarMisInscripcionesActividades),
      { context: this.contextoLectura('Mis actividades') },
    );
  }

  listarInscripcionesActividadesFamiliar(
    memberUuid: string,
  ): Observable<readonly PortalInscripcionActividadDto[]> {
    return this.http.get<readonly PortalInscripcionActividadDto[]>(
      crearApiUrl(API_ROUTES.portalSocio.listarInscripcionesActividadesFamiliar(memberUuid)),
      { context: this.contextoLectura('Actividades del familiar') },
    );
  }

  reservarAmenity(
    amenityUuid: string,
    payload: ReservarAmenityPortalCommand,
  ): Observable<ReservaAmenityCobroResultDto> {
    return this.http.post<ReservaAmenityCobroResultDto>(
      crearApiUrl(API_ROUTES.portalSocio.reservarAmenity(amenityUuid)),
      payload,
    );
  }

  reintentarPagoReservaAmenity(
    reservaUuid: string,
    payload?: ReintentarPagoReservaAmenityPortalCommand,
  ): Observable<ReservaAmenityCobroResultDto> {
    return this.http.post<ReservaAmenityCobroResultDto>(
      crearApiUrl(API_ROUTES.portalSocio.pagarReservaAmenity(reservaUuid)),
      payload ?? {},
    );
  }

  subirCertificado(memberUuid: string, archivo: File): Observable<CertificadoMedicoDto> {
    const formData = new FormData();
    formData.append('file', archivo);

    return this.http.post<CertificadoMedicoDto>(
      crearApiUrl(API_ROUTES.portalSocio.subirCertificado(memberUuid)),
      formData,
      { context: this.contextoMutacion('Certificado enviado para validación') },
    );
  }

  consultarCalendario(payload: CalendarioConsultaPayload): Observable<readonly CalendarioSlotDto[]> {
    return this.http.post<readonly CalendarioSlotDto[]>(crearApiUrl(API_ROUTES.portalSocio.consultarCalendario), payload, {
      context: this.contextoLectura('Calendario'),
    });
  }

  private contextoLectura(titulo: string): HttpContext {
    return new HttpContext().set(MOSTRAR_TOAST_ERROR, { titulo });
  }

  private crearParametrosCuotas(filtros: FiltrosCuotasPortal): HttpParams {
    let params = new HttpParams();
    filtros.estados?.forEach((estado) => (params = params.append('estado', estado)));
    filtros.tipos?.forEach((tipo) => (params = params.append('tipo', tipo)));
    if (filtros.soloImpagas !== undefined) params = params.set('soloImpagas', filtros.soloImpagas);
    if (filtros.ultimosMeses !== undefined) params = params.set('ultimosMeses', filtros.ultimosMeses);
    return params;
  }

  private contextoMutacion(titulo: string): HttpContext {
    return new HttpContext()
      .set(MOSTRAR_TOAST_EXITO, { titulo })
      .set(MOSTRAR_TOAST_ERROR, { titulo: 'Perfil' });
  }
}
