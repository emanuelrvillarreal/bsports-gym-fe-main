export interface PeriodicidadPlanCrmDto {
  readonly codigo: string;
}

export interface ProductoPlanCrmDto {
  readonly codigo: string;
  readonly nombre: string;
  readonly unidades: number;
}

export interface PlanCrmDto {
  readonly nombre: string;
  readonly descripcion: string;
  readonly codigo: string;
  readonly precio: number;
  readonly precioEsFinal: boolean;
  readonly alicuotaIva: number;
  readonly periodicidad: PeriodicidadPlanCrmDto;
  readonly productos: readonly ProductoPlanCrmDto[];
}

export interface ProvinciaCrmDto {
  readonly uuid: string;
  readonly nombre: string;
  readonly codigo: string;
  readonly pais: string;
  readonly paisUuid: string;
}

export interface CondicionImpositivaCrmDto {
  readonly uuid: string;
  readonly nombre: string;
  readonly codigo: string;
}

export type TipoDescuentoSuscripcionCrm = 'MONTO' | 'PORCENTAJE';

/** Descuento temporal aplicado a las facturas de una suscripción CRM. */
export interface DescuentoSuscripcionCrmPayload {
  readonly tipoDescuento: TipoDescuentoSuscripcionCrm;
  readonly monto: number | null;
  readonly porcentaje: number | null;
  readonly cantPeriodos: number;
}

export interface SuscribirEmpresaCrmPayload {
  readonly codigoPlan: string;
  readonly descuento?: DescuentoSuscripcionCrmPayload;
}

export interface CambiarPlanCrmPayload {
  readonly codigoPlan: string;
  readonly descuento?: DescuentoSuscripcionCrmPayload;
}

export interface SuscripcionEmpresaCrmDto {
  readonly companyUuid: string;
  readonly codigoPlan: string;
  readonly nombrePlan: string;
  readonly uuidSuscripcionCrm: string;
  readonly estado: string;
  readonly fechaProximaFacturacion: string | null;
}

/** Resumen incluido en cada empresa del paginado global. */
export type ResumenSuscripcionEmpresaCrmDto = Omit<SuscripcionEmpresaCrmDto, 'companyUuid'>;

export interface BajaSuscripcionEmpresaCrmDto {
  readonly cuit: string;
  readonly suscripcionesAnuladas: number;
  readonly facturasCompensadas: number;
  readonly montoCompensado: number;
  readonly mensaje: string;
}
