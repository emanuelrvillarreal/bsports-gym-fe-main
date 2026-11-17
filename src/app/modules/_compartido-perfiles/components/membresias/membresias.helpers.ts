import {
  CategoriaPase,
  DiaSemana,
  EstadoCobro,
  ModalidadPase,
  OrigenMembresia,
  PaseDto,
  SituacionMembresia,
} from '../../../../core/api/interfaces/membresias.interfaces';
import { formatearMoneda } from '../../../../helpers/moneda-formato';

export const MODALIDADES: readonly { readonly id: ModalidadPase; readonly etiqueta: string }[] = [
  { id: 'MENSUAL', etiqueta: 'Mensual' },
  { id: 'TRIMESTRAL', etiqueta: 'Trimestral' },
  { id: 'SEMESTRAL', etiqueta: 'Semestral' },
  { id: 'ANUAL', etiqueta: 'Anual' },
  { id: 'DIARIO', etiqueta: 'Diario' },
  { id: 'SEMANAL', etiqueta: 'Semanal' },
  { id: 'POR_INGRESOS', etiqueta: 'Por cantidad de ingresos' },
  { id: 'PERSONALIZADO', etiqueta: 'Cantidad de días a elección' },
];

export const CATEGORIAS: readonly { readonly id: CategoriaPase; readonly etiqueta: string }[] = [
  { id: 'GENERAL', etiqueta: 'Pase libre' },
  { id: 'ACTIVIDAD', etiqueta: 'Por actividad' },
  { id: 'HORARIO', etiqueta: 'Por horario' },
  { id: 'PREMIUM', etiqueta: 'Premium' },
  { id: 'FAMILIAR', etiqueta: 'Familiar' },
  { id: 'CORPORATIVO', etiqueta: 'Corporativo' },
];

export const DIAS: readonly { readonly id: DiaSemana; readonly corto: string; readonly largo: string }[] = [
  { id: 'LUNES', corto: 'Lun', largo: 'Lunes' },
  { id: 'MARTES', corto: 'Mar', largo: 'Martes' },
  { id: 'MIERCOLES', corto: 'Mié', largo: 'Miércoles' },
  { id: 'JUEVES', corto: 'Jue', largo: 'Jueves' },
  { id: 'VIERNES', corto: 'Vie', largo: 'Viernes' },
  { id: 'SABADO', corto: 'Sáb', largo: 'Sábado' },
  { id: 'DOMINGO', corto: 'Dom', largo: 'Domingo' },
];

const SITUACIONES: Record<SituacionMembresia, string> = {
  VIGENTE: 'Vigente',
  PENDIENTE_PAGO: 'Pendiente de pago',
  PROGRAMADA: 'Empieza más adelante',
  CONGELADA: 'Congelada',
  AGOTADA: 'Sin ingresos disponibles',
  VENCIDA: 'Vencida',
  BAJA: 'Dada de baja',
  REEMPLAZADA: 'Reemplazada por otro plan',
};

const ORIGENES: Record<OrigenMembresia, string> = {
  ALTA: 'Alta',
  RENOVACION: 'Renovación',
  CAMBIO_PLAN: 'Cambio de plan',
};

const COBROS: Record<EstadoCobro, string> = {
  PENDIENTE: 'Pendiente',
  PAGADA: 'Pagada',
  VENCIDA: 'Vencida',
  ANULADA: 'Anulada',
};

export function textoModalidad(modalidad: ModalidadPase): string {
  return MODALIDADES.find((m) => m.id === modalidad)?.etiqueta ?? modalidad;
}

export function textoCategoria(categoria: CategoriaPase): string {
  return CATEGORIAS.find((c) => c.id === categoria)?.etiqueta ?? categoria;
}

export function textoSituacion(situacion: SituacionMembresia): string {
  return SITUACIONES[situacion] ?? situacion;
}

export function textoOrigen(origen: OrigenMembresia): string {
  return ORIGENES[origen] ?? origen;
}

export function textoCobro(estado: EstadoCobro | null | undefined): string {
  return estado ? COBROS[estado] ?? estado : 'Sin cuota';
}

/** Tono visual de la situación: ok (habilita), alerta (falta algo), apagado (terminó). */
export function tonoSituacion(situacion: SituacionMembresia): 'ok' | 'alerta' | 'peligro' | 'apagado' {
  switch (situacion) {
    case 'VIGENTE':
      return 'ok';
    case 'PENDIENTE_PAGO':
    case 'CONGELADA':
    case 'PROGRAMADA':
      return 'alerta';
    case 'AGOTADA':
    case 'VENCIDA':
      return 'peligro';
    default:
      return 'apagado';
  }
}

/** "Lun a Vie", "Sáb y Dom", "Lun, Mié, Vie" o "Todos los días". */
export function textoDias(dias: readonly DiaSemana[]): string {
  if (!dias.length || dias.length === 7) return 'Todos los días';
  const indices = DIAS.map((d, i) => (dias.includes(d.id) ? i : -1)).filter((i) => i >= 0);
  const consecutivos = indices.every((valor, i) => i === 0 || valor === indices[i - 1] + 1);
  if (consecutivos && indices.length > 2) return `${DIAS[indices[0]].corto} a ${DIAS[indices.at(-1)!].corto}`;
  const nombres = indices.map((i) => DIAS[i].corto);
  return nombres.length === 2 ? `${nombres[0]} y ${nombres[1]}` : nombres.join(', ');
}

export function textoDuracion(pase: Pick<PaseDto, 'modalidad' | 'duracionDias'>): string {
  if (pase.modalidad === 'POR_INGRESOS' || pase.modalidad === 'PERSONALIZADO') {
    return `${pase.duracionDias ?? '?'} días`;
  }
  return textoModalidad(pase.modalidad);
}

/** Resumen de una línea: duración, ingresos, días, horario y alcance. */
export function resumenPase(pase: PaseDto): string {
  const partes = [
    textoDuracion(pase),
    pase.cantidadIngresos ? `${pase.cantidadIngresos} ingresos` : 'ingresos ilimitados',
    textoDias(pase.diasPermitidos),
  ];
  if (pase.horaDesde && pase.horaHasta) partes.push(`${pase.horaDesde} a ${pase.horaHasta} h`);
  if (pase.actividades.length) partes.push(pase.actividades.map((a) => a.nombre).join(', '));
  if (pase.amenities.length) partes.push(pase.amenities.map((a) => a.nombre).join(', '));
  if (pase.familiar) partes.push(`familiar hasta ${pase.maxIntegrantes} personas`);
  return partes.join(' · ');
}

export function precioPase(pase: Pick<PaseDto, 'precio'>): string {
  return Number(pase.precio) === 0 ? 'Sin cargo' : formatearMoneda(pase.precio);
}
