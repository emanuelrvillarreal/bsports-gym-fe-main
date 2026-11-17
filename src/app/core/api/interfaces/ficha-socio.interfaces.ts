import { MembresiaDto } from './membresias.interfaces';
import { EstadoCuota, TipoCuota } from './tesoreria.interfaces';

export interface CuotaFichaDto {
  readonly uuid: string;
  readonly concepto: string;
  readonly tipo: TipoCuota;
  readonly estado: EstadoCuota;
  readonly monto: number;
  readonly vencimiento: string | null;
  readonly fechaPago: string | null;
  readonly medioPago: string | null;
  readonly vencida: boolean;
}

export interface CuentaFichaDto {
  readonly alDia: boolean;
  readonly deudaVencida: number;
  readonly porVencer: number;
  readonly cuotasVencidas: number;
  readonly cuotasPorVencer: number;
  readonly proximoVencimiento: CuotaFichaDto | null;
}

export interface ActividadFichaDto {
  readonly inscripcionUuid: string;
  readonly actividad: string;
  readonly activa: boolean;
  readonly fechaInscripcion: string | null;
  readonly fechaBaja: string | null;
  readonly motivoBaja: string | null;
  readonly proximaCuota: string | null;
  readonly cubiertaPorPase: boolean;
  readonly ultimaCuota: CuotaFichaDto | null;
}

export interface FichaSocioDto {
  readonly cuenta: CuentaFichaDto;
  readonly actividades: readonly ActividadFichaDto[];
  readonly membresias: readonly MembresiaDto[];
  readonly cuotas: readonly CuotaFichaDto[];
}
