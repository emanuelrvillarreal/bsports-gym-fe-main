import { describe, expect, it } from 'vitest';

import { obtenerPeriodoMovimiento } from './periodo-movimiento.helpers';

describe('obtenerPeriodoMovimiento', () => {
  it('convierte una fecha ISO al formato mensual del backend', () => {
    expect(obtenerPeriodoMovimiento('2026-07-28')).toBe('07-2026');
  });

  it('convierte un valor mensual del selector al formato del backend', () => {
    expect(obtenerPeriodoMovimiento('2026-07')).toBe('07-2026');
  });

  it('descarta valores que no son fechas ISO', () => {
    expect(obtenerPeriodoMovimiento('07-2026')).toBe('');
  });
});
