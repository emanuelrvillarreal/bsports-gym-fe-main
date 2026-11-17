import { PageResponse } from './paginate.interface';

export type EstadoEquipamiento = 'NUEVO' | 'BUENO' | 'REGULAR' | 'EN_REPARACION' | 'FUERA_DE_SERVICIO' | 'BAJA';
export type TipoMantenimiento = 'PREVENTIVO' | 'REPARACION' | 'REVISION';
export type AlertaMantenimiento = 'VENCIDO' | 'PROXIMO';

export interface EquipamientoPayload {
  readonly nombre: string;
  readonly codigo?: string | null;
  readonly tipo?: string | null;
  readonly disciplina?: string | null;
  readonly marca?: string | null;
  readonly modelo?: string | null;
  readonly cantidad: number;
  readonly estado: EstadoEquipamiento;
  readonly ubicacion?: string | null;
  readonly fechaAdquisicion?: string | null;
  readonly observaciones?: string | null;
}

export interface MantenimientoPayload {
  readonly tipo: TipoMantenimiento;
  readonly fecha: string;
  readonly responsable?: string | null;
  readonly descripcion: string;
  readonly costo?: number | null;
  readonly proximoMantenimiento?: string | null;
  readonly estadoResultante?: EstadoEquipamiento | null;
  readonly registrarEgreso: boolean;
}

export interface FiltrosEquipamiento {
  readonly search?: string;
  readonly estado?: EstadoEquipamiento | null;
  readonly alerta?: AlertaMantenimiento | null;
  readonly incluirBajas?: boolean;
  readonly page: number;
  readonly size: number;
}

export interface FilaEquipamientoDto {
  readonly uuid: string;
  readonly nombre: string;
  readonly codigo: string | null;
  readonly tipo: string | null;
  readonly disciplina: string | null;
  readonly marcaModelo: string;
  readonly cantidad: number;
  readonly estado: EstadoEquipamiento;
  readonly ubicacion: string | null;
  readonly ultimoMantenimiento: string | null;
  readonly proximoMantenimiento: string | null;
  readonly alerta: AlertaMantenimiento | null;
  readonly costoMantenimientos: number;
}

export interface MantenimientoDto {
  readonly uuid: string;
  readonly tipo: TipoMantenimiento;
  readonly fecha: string;
  readonly responsable: string | null;
  readonly descripcion: string;
  readonly costo: number | null;
  readonly proximoMantenimiento: string | null;
  readonly registradoPor: string | null;
  readonly movimientoUuid: string | null;
}

export interface EquipamientoDetalleDto extends Omit<EquipamientoPayload, 'cantidad'> {
  readonly uuid: string;
  readonly cantidad: number;
  readonly costoMantenimientos: number;
  readonly proximoMantenimiento: string | null;
  readonly mantenimientos: readonly MantenimientoDto[];
}

export interface ResumenEquipamientoDto {
  readonly items: number;
  readonly unidades: number;
  readonly enReparacion: number;
  readonly fueraDeServicio: number;
  readonly mantenimientosVencidos: number;
  readonly mantenimientosProximos: number;
  readonly costoAnio: number;
}

export type PaginaEquipamiento = PageResponse<FilaEquipamientoDto>;
