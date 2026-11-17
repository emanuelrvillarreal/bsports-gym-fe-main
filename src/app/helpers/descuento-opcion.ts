import { DescuentoDto } from '../core/api/interfaces/descuentos.interfaces';
import { formatearMoneda } from './moneda-formato';

/** Texto del valor de un descuento: "50%" o "$5.000". */
export function valorDescuentoTexto(descuento: DescuentoDto): string {
  return descuento.tipoValor === 'PORCENTAJE'
    ? `${descuento.porcentaje ?? 0}%`
    : formatearMoneda(descuento.montoFijo ?? 0);
}

/** Opción de `app-select` para un descuento: nombre a la izquierda y el valor como etiqueta a la derecha. */
export function opcionDescuento(descuento: DescuentoDto): {
  readonly value: string;
  readonly label: string;
  readonly titulo: string;
  readonly detalle: string;
  readonly badge: string;
} {
  const valor = valorDescuentoTexto(descuento);
  return {
    value: descuento.descuentoUuid,
    label: `${descuento.titulo} · ${valor}`,
    titulo: descuento.titulo,
    detalle: descuento.tipoValor === 'PORCENTAJE' ? 'Porcentaje sobre el importe' : 'Monto fijo en pesos',
    badge: valor,
  };
}
