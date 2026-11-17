import { PageResponse } from './paginate.interface';

export type CategoriaPase = 'GENERAL' | 'ACTIVIDAD' | 'HORARIO' | 'PREMIUM' | 'FAMILIAR' | 'CORPORATIVO';
export type ModalidadPase =
  | 'DIARIO'
  | 'SEMANAL'
  | 'MENSUAL'
  | 'TRIMESTRAL'
  | 'SEMESTRAL'
  | 'ANUAL'
  | 'POR_INGRESOS'
  | 'PERSONALIZADO';
export type DiaSemana = 'LUNES' | 'MARTES' | 'MIERCOLES' | 'JUEVES' | 'VIERNES' | 'SABADO' | 'DOMINGO';
export type EstadoMembresia = 'ACTIVA' | 'BAJA' | 'REEMPLAZADA';
export type OrigenMembresia = 'ALTA' | 'RENOVACION' | 'CAMBIO_PLAN';
export type SituacionMembresia =
  | 'PENDIENTE_PAGO'
  | 'PROGRAMADA'
  | 'VIGENTE'
  | 'CONGELADA'
  | 'AGOTADA'
  | 'VENCIDA'
  | 'BAJA'
  | 'REEMPLAZADA';
export type EstadoCobro = 'PENDIENTE' | 'PAGADA' | 'VENCIDA' | 'ANULADA';

export interface ReferenciaDto {
  readonly uuid: string;
  readonly nombre: string;
}

export interface PaseDto {
  readonly uuid: string;
  readonly nombre: string;
  readonly descripcion: string | null;
  readonly categoria: CategoriaPase;
  readonly modalidad: ModalidadPase;
  readonly duracionDias: number | null;
  readonly precio: number;
  readonly cantidadIngresos: number | null;
  /** Vacío = todos los días. */
  readonly diasPermitidos: readonly DiaSemana[];
  readonly horaDesde: string | null;
  readonly horaHasta: string | null;
  readonly renovacionAutomatica: boolean;
  readonly congelamientoExtiende: boolean;
  readonly incluyeCuotaActividades: boolean;
  readonly familiar: boolean;
  readonly maxIntegrantes: number | null;
  readonly ventaPortal: boolean;
  readonly ventaDesde: string | null;
  readonly ventaHasta: string | null;
  readonly restricciones: string | null;
  readonly activo: boolean;
  readonly disponible: boolean;
  readonly actividades: readonly ReferenciaDto[];
  readonly amenities: readonly ReferenciaDto[];
  readonly descuentos: readonly ReferenciaDto[];
  readonly membresiasVigentes: number;
}

export interface PasePayload {
  readonly nombre: string;
  readonly descripcion: string | null;
  readonly categoria: CategoriaPase;
  readonly modalidad: ModalidadPase;
  readonly duracionDias: number | null;
  readonly precio: number;
  readonly cantidadIngresos: number | null;
  readonly diasPermitidos: readonly DiaSemana[];
  readonly horaDesde: string | null;
  readonly horaHasta: string | null;
  readonly renovacionAutomatica: boolean;
  readonly congelamientoExtiende: boolean;
  readonly incluyeCuotaActividades: boolean;
  readonly familiar: boolean;
  readonly maxIntegrantes: number | null;
  readonly ventaPortal: boolean;
  readonly ventaDesde: string | null;
  readonly ventaHasta: string | null;
  readonly restricciones: string | null;
  readonly activo: boolean;
  readonly actividadesUuids: readonly string[];
  readonly amenitiesUuids: readonly string[];
  readonly descuentosUuids: readonly string[];
}

export interface CobroMembresiaDto {
  readonly cuotaUuid: string;
  readonly estado: EstadoCobro;
  readonly monto: number;
  readonly montoFinal: number;
  readonly vencimiento: string | null;
  readonly fechaPago: string | null;
  readonly medioPago: string | null;
}

export interface CongelamientoDto {
  readonly uuid: string;
  readonly desde: string;
  readonly hasta: string;
  readonly dias: number;
  readonly motivo: string;
  readonly extiendeVencimiento: boolean;
  readonly autorizadoPor: string | null;
  readonly registrado: string | null;
}

export interface AccesoMembresiaDto {
  readonly fecha: string;
  readonly permitido: boolean;
  readonly motivo: string | null;
  readonly socio: string;
}

export interface MembresiaDto {
  readonly uuid: string;
  readonly pase: PaseDto;
  readonly socio: ReferenciaDto;
  readonly numeroSocio: string | null;
  readonly integrantes: readonly ReferenciaDto[];
  readonly origen: OrigenMembresia;
  readonly estado: EstadoMembresia;
  readonly situacion: SituacionMembresia;
  readonly fechaInicio: string;
  readonly fechaFin: string;
  readonly fechaFinOriginal: string;
  readonly ingresosPermitidos: number | null;
  readonly ingresosUsados: number;
  readonly ingresosDisponibles: number | null;
  readonly renovacionAutomatica: boolean;
  readonly precio: number;
  readonly fechaBaja: string | null;
  readonly motivoBaja: string | null;
  readonly membresiaAnteriorUuid: string | null;
  readonly renovada: boolean;
  readonly cobro: CobroMembresiaDto | null;
  readonly congelamientos: readonly CongelamientoDto[];
  readonly ultimosAccesos: readonly AccesoMembresiaDto[];
  readonly puedeRenovar: boolean;
  readonly puedeCongelar: boolean;
  readonly puedeCambiarPlan: boolean;
  readonly puedeDarDeBaja: boolean;
}

export interface LegajoMembresiasDto {
  readonly socio: ReferenciaDto;
  readonly titular: boolean;
  readonly grupo: readonly ReferenciaDto[];
  readonly vigente: MembresiaDto | null;
  readonly membresias: readonly MembresiaDto[];
  readonly exigirPaseParaIngresar: boolean;
}

export interface ContratarPayload {
  readonly memberUuid: string;
  readonly paseUuid: string;
  readonly fechaInicio: string | null;
  readonly integrantesUuids: readonly string[];
  readonly descuentosUuids: readonly string[];
}

export interface CambiarPlanPayload {
  readonly paseUuid: string;
  readonly fechaInicio: string | null;
  readonly integrantesUuids: readonly string[];
  readonly descuentosUuids: readonly string[];
}

export interface CongelarPayload {
  readonly desde: string;
  readonly hasta: string;
  readonly motivo: string;
}

export interface ConfigMembresiasDto {
  readonly exigirPaseParaIngresar: boolean;
}

export interface FiltrosMembresias {
  readonly page: number;
  readonly size: number;
  readonly search?: string;
  readonly paseUuid?: string | null;
  readonly situacion?: SituacionMembresia | null;
  readonly origen?: OrigenMembresia | null;
  readonly desde?: string | null;
  readonly hasta?: string | null;
}

export interface FilaMembresiaDto {
  readonly uuid: string;
  readonly socio: string;
  readonly socioUuid: string;
  readonly numeroSocio: string | null;
  readonly pase: string;
  readonly paseUuid: string;
  readonly categoria: CategoriaPase;
  readonly origen: OrigenMembresia;
  readonly situacion: SituacionMembresia;
  readonly fechaInicio: string;
  readonly fechaFin: string;
  readonly precio: number;
  readonly cobrado: number;
  readonly estadoCobro: EstadoCobro | null;
  readonly ingresosPermitidos: number | null;
  readonly ingresosUsados: number;
  readonly integrantes: number;
}

export type PaginaMembresias = PageResponse<FilaMembresiaDto>;

export interface ItemMembresiasDto {
  readonly clave: string;
  readonly nombre: string;
  readonly cantidad: number;
  readonly importe: number;
}

export interface DashboardMembresiasDto {
  readonly activas: number;
  readonly pendientesDePago: number;
  readonly proximasAVencer: number;
  readonly vencidasUltimos30Dias: number;
  readonly congeladas: number;
  readonly nuevasMes: number;
  readonly renovacionesMes: number;
  readonly bajasMes: number;
  readonly ingresosMes: number;
  readonly ingresosAnio: number;
  readonly ingresosPorPase: readonly ItemMembresiasDto[];
  readonly masContratados: readonly ItemMembresiasDto[];
}

export interface PortalMembresiasDto {
  readonly membresias: readonly MembresiaDto[];
  readonly pasesDisponibles: readonly PaseDto[];
  readonly grupo: readonly ReferenciaDto[];
  readonly puedeContratar: boolean;
}

export interface PortalContratarPayload {
  readonly paseUuid: string;
  readonly memberUuid: string | null;
  readonly fechaInicio: string | null;
  readonly integrantesUuids: readonly string[];
}
