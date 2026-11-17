import { describe, expect, it } from 'vitest';

import {
  formatearEdadDesdeFechaNacimiento,
  formatearEdadEnAniosYDias,
} from './edad-formato';

describe('formatearEdadDesdeFechaNacimiento', () => {
  const fechaReferencia = new Date(2026, 6, 27);

  it('calcula la edad desde una fecha local', () => {
    expect(formatearEdadDesdeFechaNacimiento('2000-01-15', fechaReferencia)).toBe('26 a\u00f1os, 6 meses');
  });

  it('calcula la edad cuando la API entrega un datetime ISO', () => {
    expect(formatearEdadDesdeFechaNacimiento('2000-01-15T00:00:00.000Z', fechaReferencia)).toBe('26 a\u00f1os, 6 meses');
  });

  it('calcula la edad para una fecha serializada en formato latino', () => {
    expect(formatearEdadDesdeFechaNacimiento('15/01/2000', fechaReferencia)).toBe('26 a\u00f1os, 6 meses');
  });

  it('calcula la edad en años completos y días desde el último cumpleaños', () => {
    expect(formatearEdadEnAniosYDias('2000-01-15', fechaReferencia)).toBe(
      '26 años, 193 días',
    );
  });
});
