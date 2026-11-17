import { PageResponse } from './paginate.interface';

export interface EventoAccesoAltaCommand {
  readonly titulo: string;
  readonly descripcion: string;
  readonly fecha?: string | null;
  readonly monto: number;
  readonly permiteMorosos: boolean;
  readonly permiteInvitados: boolean;
  readonly montoMorosos: number;
  readonly montoInvitados: number;
}

export interface EventoAccesoEdicionCommand {
  readonly titulo: string;
  readonly descripcion: string;
  readonly fecha?: string | null;
  readonly monto: number;
  readonly permiteMorosos: boolean;
  readonly permiteInvitados: boolean;
  readonly montoMorosos: number;
  readonly montoInvitados: number;
}

/** Fecha del detalle; Jackson puede serializar LocalDate como componentes numéricos. */
export type FechaEventoAcceso = string | readonly number[];

export interface EventoAccesoDetalleDto {
  readonly uuid: string;
  readonly titulo: string;
  readonly descripcion: string;
  readonly fecha?: FechaEventoAcceso | null;
  readonly monto: number;
  readonly permiteMorosos: boolean;
  readonly permiteInvitados: boolean;
  readonly montoMorosos: number;
  readonly montoInvitados: number;
}

export interface EventoAccesoPaginateRequest {
  readonly page?: number;
  readonly size?: number;
  readonly search?: string;
}

export type EventoAccesoPaginateResponse = PageResponse<EventoAccesoDetalleDto>;

export interface EventoAccesoScanCommand {
  readonly userUuid: string;
}

export type EstadoEventoAcceso = 'ACCESO_PERMITIDO' | 'DEBE_PAGAR' | 'BLOQUEADO';

export interface EventoAccesoScanResultDto {
  readonly memberUuid: string;
  readonly nombre: string;
  readonly apellido: string;
  readonly numeroSocio: string;
  readonly estado: EstadoEventoAcceso;
  readonly motivo: string | null;
  readonly montoAPagar: number | null;
}

export type CanalCobroEventoAcceso = 'MANUAL' | 'MERCADO_PAGO';
export type MedioPagoEventoAccesoManual = 'EFECTIVO' | 'TRANSFERENCIA' | 'OTRO';
export type TipoEventoAccesoCobro = 'SOCIO' | 'INVITADO';
export type ResultadoCobroEventoAcceso = 'ACCESO_PERMITIDO' | 'DEBE_PAGAR';

export interface CobroEventoAccesoManualCommand {
  readonly canalCobro: 'MANUAL';
  readonly cantidadEntradas?: number;
  readonly medioPago: MedioPagoEventoAccesoManual;
  readonly fecha?: string | null;
  readonly observaciones?: string | null;
}

export interface CobroEventoAccesoMercadoPagoCommand {
  readonly canalCobro: 'MERCADO_PAGO';
  readonly cantidadEntradas?: number;
  readonly medioPago?: never;
  readonly fecha?: never;
  readonly observaciones?: never;
}

export type CobroEventoAccesoCommand =
  | CobroEventoAccesoManualCommand
  | CobroEventoAccesoMercadoPagoCommand;

export type EventoAccesoSocioCobroPayload = CobroEventoAccesoCommand & {
  readonly userUuid: string;
};

export type EventoAccesoInvitadoCobroPayload = CobroEventoAccesoCommand & {
  readonly nombre?: string | null;
};

export type EventoAccesoCobroCommand =
  | {
      readonly tipo: 'SOCIO';
      readonly payload: EventoAccesoSocioCobroPayload;
    }
  | {
      readonly tipo: 'INVITADO';
      readonly payload: EventoAccesoInvitadoCobroPayload;
    };

export interface EventoAccesoCobroResultDto {
  readonly eventoUuid: string;
  readonly tipo: TipoEventoAccesoCobro;
  readonly resultado: ResultadoCobroEventoAcceso;
  readonly cantidadEntradas: number;
  readonly monto: number;
  readonly concepto: string;
  readonly movimientoUuid: string | null;
  readonly qr: string | null;
  readonly memberUuid: string | null;
  readonly nombre: string | null;
  readonly apellido: string | null;
  readonly numeroSocio: string | null;
}

export interface EventoAccesoHistorialPaginateRequest {
  readonly page?: number;
  readonly size?: number;
  readonly search?: string;
}

export interface EventoAccesoHistorialDetalleDto {
  readonly uuid: string;
  readonly tipo: TipoEventoAccesoCobro;
  readonly nombre: string | null;
  readonly resultado: EstadoEventoAcceso;
  readonly motivo: string | null;
  readonly monto: number | null;
  readonly memberUuid: string | null;
  readonly numeroSocio: string | null;
  readonly fecha: string | number | readonly number[];
}

export type EventoAccesoHistorialPaginateResponse = PageResponse<EventoAccesoHistorialDetalleDto>;
