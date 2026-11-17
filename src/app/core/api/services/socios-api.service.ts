import { FichaSocioDto } from '../interfaces/ficha-socio.interfaces';
import { normalizarMembresias } from './membresias-api.service';
import { HttpClient, HttpContext } from '@angular/common/http';
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
  ActualizarEstadoSocioPayload,
  ActualizarSocioPayload,
  AprobarSolicitudRegistroPayload,
  AltaFamiliarPayload,
  AltaFamiliarPortalPayload,
  AltaFamiliarPortalResponse,
  AltaTitularPayload,
  ErrorImportacionSociosDto,
  EventoSeguimientoImportacionSociosDto,
  InicioImportacionSociosDto,
  ProgresoImportacionSociosDto,
  ResultadoImportacionSociosDetalleDto,
  ResultadosImportacionSociosPageDto,
  SocioDto,
  SociosPaginateRequest,
  SociosPaginateResponse,
  SolicitudesSociosPaginateRequest,
  SolicitudesSociosPaginateResponse,
} from '../interfaces/socios.interfaces';
import {
  ActualizarEstadoCertificadoMedicoPayload,
  CertificadoMedicoDto,
  CertificadosResumenRequest,
  CertificadosResumenResponse,
} from '../interfaces/certificados-medicos.interfaces';

@Injectable({ providedIn: 'root' })
export class SociosApiService {
  private readonly http = inject(HttpClient);
  private readonly authSessionService = inject(AuthSessionService);

  paginar(payload: SociosPaginateRequest): Observable<SociosPaginateResponse> {
    return this.http.post<SociosPaginateResponse>(crearApiUrl(API_ROUTES.socios.paginar), payload, {
      context: this.crearContextoCompany().set(MOSTRAR_TOAST_ERROR, { titulo: 'Socios' }),
    });
  }

  /** Consulta el grupo por UUID del titular seleccionado en el backoffice. */
  listarFamiliares(titularMemberUuid: string): Observable<readonly SocioDto[]> {
    return this.http.get<readonly SocioDto[]>(
      crearApiUrl(API_ROUTES.socios.listarFamiliares(titularMemberUuid)),
      {
        context: this.crearContextoCompany().set(MOSTRAR_TOAST_ERROR, { titulo: 'Grupo familiar' }),
      },
    );
  }

  /** Número que se asignará al próximo socio si no se elige otro. */
  /** Ficha del socio: estado de cuenta, actividades con historial, membresías y últimas cuotas. */
  obtenerFicha(memberUuid: string): Observable<FichaSocioDto> {
    return this.http
      .get<FichaSocioDto>(crearApiUrl(API_ROUTES.socios.ficha(memberUuid)), {
        context: this.crearContextoCompany().set(MOSTRAR_TOAST_ERROR, { titulo: 'Ficha del socio' }),
      })
      .pipe(map((ficha) => normalizarMembresias(ficha)));
  }

  /** El admin cambia la foto de perfil del socio (es la misma que ve el socio en su credencial). */
  subirFoto(memberUuid: string, archivo: File): Observable<SocioDto> {
    const formData = new FormData();
    formData.append('file', archivo);
    return this.http.post<SocioDto>(crearApiUrl(API_ROUTES.socios.foto(memberUuid)), formData, {
      context: this.crearContextoCompany()
        .set(MOSTRAR_TOAST_EXITO, { titulo: 'Foto actualizada' })
        .set(MOSTRAR_TOAST_ERROR, { titulo: 'Foto del socio' }),
    });
  }

  eliminarFoto(memberUuid: string): Observable<SocioDto> {
    return this.http.delete<SocioDto>(crearApiUrl(API_ROUTES.socios.foto(memberUuid)), {
      context: this.crearContextoCompany()
        .set(MOSTRAR_TOAST_EXITO, { titulo: 'Foto quitada' })
        .set(MOSTRAR_TOAST_ERROR, { titulo: 'Foto del socio' }),
    });
  }

  obtenerSiguienteNumeroSocio(): Observable<string> {
    return this.http
      .get<{ numeroSocio: string }>(crearApiUrl(API_ROUTES.socios.siguienteNumeroSocio), {
        context: this.crearContextoCompany(),
      })
      .pipe(map((respuesta) => respuesta.numeroSocio));
  }

  crearTitular(payload: AltaTitularPayload): Observable<SocioDto> {
    return this.http.post<SocioDto>(crearApiUrl(API_ROUTES.socios.crearTitular), payload, {
      context: this.crearContextoMutacion('Socio titular creado'),
    });
  }

  crearFamiliar(payload: AltaFamiliarPayload): Observable<SocioDto> {
    return this.http.post<SocioDto>(crearApiUrl(API_ROUTES.socios.crearFamiliar), payload, {
      context: this.crearContextoMutacion('Familiar creado'),
    });
  }

  crearFamiliarDesdePortal(
    payload: AltaFamiliarPortalPayload,
  ): Observable<AltaFamiliarPortalResponse> {
    return this.http.post<AltaFamiliarPortalResponse>(
      crearApiUrl(API_ROUTES.socios.crearFamiliarDesdePortal),
      payload,
      {
        context: this.crearContextoMutacion('Solicitud de familiar creada'),
      },
    );
  }

  actualizar(memberUuid: string, payload: ActualizarSocioPayload): Observable<SocioDto> {
    return this.http.put<SocioDto>(crearApiUrl(API_ROUTES.socios.actualizar(memberUuid)), payload, {
      context: this.crearContextoMutacion('Socio actualizado'),
    });
  }

  darDeBaja(memberUuid: string): Observable<void> {
    return this.http
      .post<unknown>(crearApiUrl(API_ROUTES.socios.darDeBaja(memberUuid)), null, {
        context: this.crearContextoMutacion('Socio dado de baja'),
      })
      .pipe(map(() => void 0));
  }

  actualizarEstado(
    memberUuid: string,
    payload: ActualizarEstadoSocioPayload,
  ): Observable<SocioDto> {
    return this.http.put<SocioDto>(
      crearApiUrl(API_ROUTES.socios.actualizarEstado(memberUuid)),
      payload,
      { context: this.crearContextoMutacion('Estado del socio actualizado') },
    );
  }

  subirCertificado(memberUuid: string, archivo: File): Observable<CertificadoMedicoDto> {
    const formData = new FormData();
    formData.append('file', archivo);

    return this.http.post<CertificadoMedicoDto>(
      crearApiUrl(API_ROUTES.socios.subirCertificado(memberUuid)),
      formData,
      { context: this.crearContextoMutacion('Certificado médico cargado') },
    );
  }

  /** Situación del certificado médico de cada socio del club, con conteos por situación. */
  resumenCertificados(payload: CertificadosResumenRequest): Observable<CertificadosResumenResponse> {
    return this.http.post<CertificadosResumenResponse>(
      crearApiUrl(API_ROUTES.socios.resumenCertificados),
      payload,
      { context: this.crearContextoCompany().set(MOSTRAR_TOAST_ERROR, { titulo: 'Certificados médicos' }) },
    );
  }

  listarCertificados(memberUuid: string): Observable<readonly CertificadoMedicoDto[]> {
    return this.http.get<readonly CertificadoMedicoDto[]>(
      crearApiUrl(API_ROUTES.socios.listarCertificados(memberUuid)),
      {
        context: this.crearContextoCompany().set(MOSTRAR_TOAST_ERROR, {
          titulo: 'Certificados médicos',
        }),
      },
    );
  }

  actualizarEstadoCertificado(
    certificadoUuid: string,
    payload: ActualizarEstadoCertificadoMedicoPayload,
  ): Observable<CertificadoMedicoDto> {
    return this.http.put<CertificadoMedicoDto>(
      crearApiUrl(API_ROUTES.socios.actualizarEstadoCertificado(certificadoUuid)),
      payload,
      { context: this.crearContextoMutacion('Certificado médico actualizado') },
    );
  }

  iniciarImportacion(archivo: File): Observable<InicioImportacionSociosDto> {
    const formData = new FormData();
    formData.append('file', archivo);

    return this.http.post<InicioImportacionSociosDto>(
      crearApiUrl(API_ROUTES.socios.importar),
      formData,
      {
        context: this.crearContextoCompany().set(MOSTRAR_TOAST_ERROR, {
          titulo: 'Importación de socios',
          fondoPeligro4xx: true,
        }),
      },
    );
  }

  listarResultadosImportacion(
    page = 0,
    size = 10,
  ): Observable<ResultadosImportacionSociosPageDto> {
    return this.http.get<ResultadosImportacionSociosPageDto>(
      crearApiUrl(API_ROUTES.socios.resultadosImportacion),
      {
        params: { page, size },
        context: this.crearContextoCompany().set(MOSTRAR_TOAST_ERROR, {
          titulo: 'Resultados de importación',
        }),
      },
    );
  }

  obtenerResultadoImportacion(
    importId: string,
  ): Observable<ResultadoImportacionSociosDetalleDto> {
    return this.http.get<ResultadoImportacionSociosDetalleDto>(
      crearApiUrl(API_ROUTES.socios.resultadoImportacion(importId)),
      {
        context: this.crearContextoCompany().set(MOSTRAR_TOAST_ERROR, {
          titulo: 'Resultado de importación',
        }),
      },
    );
  }

  observarProgresoImportacion(importId: string): Observable<EventoSeguimientoImportacionSociosDto> {
    return new Observable((suscriptor) => {
      if (typeof EventSource === 'undefined') {
        suscriptor.error(new Error('El seguimiento en vivo no está disponible.'));
        return;
      }

      const fuente = new EventSource(crearApiUrl(API_ROUTES.socios.progresoImportacion(importId)));
      let cerrada = false;

      const cerrar = (): void => {
        if (cerrada) return;
        cerrada = true;
        fuente.close();
      };

      const emitirProgreso = (evento: Event, tipo: 'progreso' | 'completada'): void => {
        try {
          const datos = this.parsearProgresoImportacion(evento);
          suscriptor.next({ tipo, datos });
          if (tipo === 'completada') {
            cerrar();
            suscriptor.complete();
          }
        } catch (error) {
          cerrar();
          suscriptor.error(error);
        }
      };

      fuente.addEventListener('open', () => suscriptor.next({ tipo: 'conectado' }));
      fuente.addEventListener('progress', (evento) => emitirProgreso(evento, 'progreso'));
      fuente.addEventListener('completed', (evento) => emitirProgreso(evento, 'completada'));
      fuente.addEventListener('error', (evento) => {
        const data = this.obtenerDataEvento(evento);
        if (data !== null) {
          try {
            const datos = this.parsearErrorImportacion(data);
            suscriptor.next({ tipo: 'error', datos });
            cerrar();
            suscriptor.complete();
          } catch (error) {
            cerrar();
            suscriptor.error(error);
          }
          return;
        }

        if (fuente.readyState === EventSource.CONNECTING) {
          suscriptor.next({ tipo: 'reconectando' });
          return;
        }

        cerrar();
        suscriptor.error(new Error('No se pudo mantener la conexión de seguimiento.'));
      });

      return cerrar;
    });
  }

  listarSolicitudes(
    payload: SolicitudesSociosPaginateRequest,
  ): Observable<SolicitudesSociosPaginateResponse> {
    return this.http.post<SolicitudesSociosPaginateResponse>(
      crearApiUrl(API_ROUTES.socios.paginarSolicitudes),
      payload,
      {
        context: this.crearContextoCompany().set(MOSTRAR_TOAST_ERROR, {
          titulo: 'Solicitudes de socios',
        }),
      },
    );
  }

  aprobarSolicitud(
    memberUuid: string,
    payload: AprobarSolicitudRegistroPayload = {},
  ): Observable<void> {
    return this.http
      .post<unknown>(crearApiUrl(API_ROUTES.socios.aprobarRegistro(memberUuid)), payload, {
        context: this.crearContextoMutacion('Solicitud aprobada'),
      })
      .pipe(map(() => void 0));
  }

  rechazarSolicitud(memberUuid: string, motivo: string): Observable<void> {
    const motivoNormalizado = motivo.trim();
    return this.http
      .post<unknown>(
        crearApiUrl(API_ROUTES.socios.rechazarRegistro(memberUuid)),
        motivoNormalizado ? { motivo: motivoNormalizado } : {},
        { context: this.crearContextoMutacion('Solicitud rechazada') },
      )
      .pipe(map(() => void 0));
  }

  private crearContextoCompany(): HttpContext {
    const companyUuid = this.authSessionService.obtenerCompanyUuid();
    return companyUuid ? conCompanyUuid(new HttpContext(), companyUuid) : new HttpContext();
  }

  private crearContextoMutacion(tituloExito: string): HttpContext {
    return this.crearContextoCompany()
      .set(MOSTRAR_TOAST_EXITO, { titulo: tituloExito })
      .set(MOSTRAR_TOAST_ERROR, { titulo: 'Socios', fondoPeligro4xx: true });
  }

  private parsearProgresoImportacion(evento: Event): ProgresoImportacionSociosDto {
    const data = this.obtenerDataEvento(evento);
    if (data === null) throw new Error('El servidor envió un evento de progreso inválido.');

    return this.validarProgresoImportacion(JSON.parse(data) as unknown);
  }

  private parsearErrorImportacion(data: string): ErrorImportacionSociosDto {
    const valor = JSON.parse(data) as unknown;
    const progreso = this.validarProgresoImportacion(valor);
    const errorMessage =
      valor &&
      typeof valor === 'object' &&
      typeof (valor as { errorMessage?: unknown }).errorMessage === 'string'
        ? (valor as { errorMessage: string }).errorMessage.trim()
        : '';

    if (!errorMessage) throw new Error('El servidor envió un error de importación inválido.');
    return { ...progreso, errorMessage };
  }

  private validarProgresoImportacion(valor: unknown): ProgresoImportacionSociosDto {
    if (!valor || typeof valor !== 'object') {
      throw new Error('El servidor envió un progreso de importación inválido.');
    }

    const datos = valor as Record<string, unknown>;
    const filasProcesadas = datos['filasProcesadas'];
    const filasTotales = datos['filasTotales'];
    const porcentajeCompletado = datos['porcentajeCompletado'];
    const errorCount = datos['errorCount'];
    const warningCount = datos['warningCount'];
    const errorMessage = datos['errorMessage'];
    if (
      typeof filasProcesadas !== 'number' ||
      !Number.isFinite(filasProcesadas) ||
      typeof filasTotales !== 'number' ||
      !Number.isFinite(filasTotales) ||
      typeof porcentajeCompletado !== 'number' ||
      !Number.isFinite(porcentajeCompletado)
    ) {
      throw new Error('El servidor envió un progreso de importación inválido.');
    }

    if (
      (errorCount !== undefined &&
        (typeof errorCount !== 'number' || !Number.isFinite(errorCount))) ||
      (warningCount !== undefined &&
        (typeof warningCount !== 'number' || !Number.isFinite(warningCount))) ||
      (errorMessage !== undefined && errorMessage !== null && typeof errorMessage !== 'string')
    ) {
      throw new Error('El servidor envió un progreso de importación inválido.');
    }

    return {
      filasProcesadas,
      filasTotales,
      porcentajeCompletado,
      ...(typeof errorCount === 'number' ? { errorCount } : {}),
      ...(typeof warningCount === 'number' ? { warningCount } : {}),
      ...(typeof errorMessage === 'string' || errorMessage === null ? { errorMessage } : {}),
    };
  }

  private obtenerDataEvento(evento: Event): string | null {
    const data = (evento as MessageEvent<unknown>).data;
    return typeof data === 'string' && data.trim() ? data : null;
  }
}
