import { describe, expect, it } from 'vitest';

import {
  formatearEstadoTabla,
  obtenerClaseEstadoTabla,
  resolverEstadoTabla,
} from './tabla-estado.helpers';

describe('tabla-estado.helpers: movimientos de acceso', () => {
  it('muestra ingreso con estilo positivo', () => {
    expect(formatearEstadoTabla('INGRESO')).toBe('Ingreso');
    expect(resolverEstadoTabla('INGRESO')).toBe(true);
    expect(obtenerClaseEstadoTabla('INGRESO', true)).toBe('tabla-responsive__estado--presente');
  });

  it('muestra egreso con estilo de peligro', () => {
    expect(formatearEstadoTabla('EGRESO')).toBe('Egreso');
    expect(obtenerClaseEstadoTabla('EGRESO', false)).toBe('tabla-responsive__estado--egreso');
  });

  it('conserva el texto real de estados no activos de socios', () => {
    expect(formatearEstadoTabla('INACTIVO')).toBe('Inactivo');
    expect(formatearEstadoTabla('SUSPENDIDO')).toBe('Suspendido');
    expect(formatearEstadoTabla('INHABILITADO')).toBe('Inhabilitado');
    expect(formatearEstadoTabla('MOROSO')).toBe('Moroso');
  });
});
