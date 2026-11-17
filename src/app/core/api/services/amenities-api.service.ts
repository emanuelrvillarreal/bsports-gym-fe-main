import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { MOSTRAR_TOAST_ERROR, MOSTRAR_TOAST_EXITO } from '../../interceptors/context/http-toast-context';
import { API_ROUTES } from '../api-routes';
import { crearApiUrl } from '../api-url';
import {
  AmenityDto,
  CobrarReservaAmenityCommand,
  CobroReservaAmenityResultDto,
  CrearReservaAmenityCommand,
  GuardarAmenityCommand,
  PaginaReservasAmenityDto,
  PaginarReservasAmenityCommand,
  ReservaAmenityDto,
} from '../interfaces/amenities.interfaces';

@Injectable({ providedIn: 'root' })
export class AmenitiesApiService {
  private readonly http = inject(HttpClient);

  listar(): Observable<readonly AmenityDto[]> {
    return this.http.get<readonly AmenityDto[]>(crearApiUrl(API_ROUTES.amenities.listar), {
      context: this.contextoConsulta(),
    });
  }

  crear(command: GuardarAmenityCommand): Observable<AmenityDto> {
    return this.http.post<AmenityDto>(crearApiUrl(API_ROUTES.amenities.crear), command, {
      context: this.contextoMutacion('Comodidad creada'),
    });
  }

  actualizar(amenityUuid: string, command: GuardarAmenityCommand): Observable<AmenityDto> {
    return this.http.put<AmenityDto>(
      crearApiUrl(API_ROUTES.amenities.actualizar(amenityUuid)),
      command,
      { context: this.contextoMutacion('Comodidad actualizada') },
    );
  }

  eliminar(amenityUuid: string): Observable<void> {
    return this.http.delete<void>(crearApiUrl(API_ROUTES.amenities.eliminar(amenityUuid)), {
      context: this.contextoMutacion('Comodidad desactivada'),
    });
  }

  paginarReservas(command: PaginarReservasAmenityCommand): Observable<PaginaReservasAmenityDto> {
    return this.http.post<PaginaReservasAmenityDto>(
      crearApiUrl(API_ROUTES.amenities.paginarReservas),
      command,
      { context: this.contextoConsulta() },
    );
  }

  crearReserva(command: CrearReservaAmenityCommand): Observable<ReservaAmenityDto> {
    return this.http.post<ReservaAmenityDto>(
      crearApiUrl(API_ROUTES.amenities.crearReserva),
      command,
      { context: this.contextoMutacion('Reserva creada') },
    );
  }

  cobrarSena(
    reservaUuid: string,
    command: CobrarReservaAmenityCommand,
  ): Observable<CobroReservaAmenityResultDto> {
    return this.http.post<CobroReservaAmenityResultDto>(
      crearApiUrl(API_ROUTES.amenities.cobrarSena(reservaUuid)),
      command,
      { context: this.contextoMutacion('Seña registrada') },
    );
  }

  cobrarSaldo(
    reservaUuid: string,
    command: CobrarReservaAmenityCommand,
  ): Observable<CobroReservaAmenityResultDto> {
    return this.http.post<CobroReservaAmenityResultDto>(
      crearApiUrl(API_ROUTES.amenities.cobrarSaldo(reservaUuid)),
      command,
      { context: this.contextoMutacion('Saldo registrado') },
    );
  }

  cobrarTotal(
    reservaUuid: string,
    command: CobrarReservaAmenityCommand,
  ): Observable<CobroReservaAmenityResultDto> {
    return this.http.post<CobroReservaAmenityResultDto>(
      crearApiUrl(API_ROUTES.amenities.cobrarTotal(reservaUuid)),
      command,
      { context: this.contextoMutacion('Cobro registrado') },
    );
  }

  confirmarGratuita(reservaUuid: string): Observable<ReservaAmenityDto> {
    return this.http.post<ReservaAmenityDto>(
      crearApiUrl(API_ROUTES.amenities.confirmarReservaGratuita(reservaUuid)),
      {},
      { context: this.contextoMutacion('Reserva confirmada') },
    );
  }

  cancelarReserva(reservaUuid: string): Observable<ReservaAmenityDto> {
    return this.http.delete<ReservaAmenityDto>(
      crearApiUrl(API_ROUTES.amenities.cancelarReserva(reservaUuid)),
      { context: this.contextoMutacion('Reserva cancelada') },
    );
  }

  private contextoConsulta(): HttpContext {
    return new HttpContext().set(MOSTRAR_TOAST_ERROR, { titulo: 'Comodidades' });
  }

  private contextoMutacion(titulo: string): HttpContext {
    return this.contextoConsulta().set(MOSTRAR_TOAST_EXITO, { titulo });
  }
}
