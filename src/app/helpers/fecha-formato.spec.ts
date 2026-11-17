import { crearRangoMensual, formatearFechaCorta } from './fecha-formato';

describe('formatearFechaCorta', () => {
  it('formatea fechas ISO', () => {
    expect(formatearFechaCorta('2026-06-01')).toBe('01/06/2026');
  });

  it('formatea fechas serializadas como arreglo', () => {
    expect(formatearFechaCorta([2026, 6, 1])).toBe('01/06/2026');
  });

  it('usa guion para valores vacíos o no reconocidos', () => {
    expect(formatearFechaCorta(null)).toBe('-');
    expect(formatearFechaCorta(['fecha inválida'])).toBe('-');
  });

  it('crea un rango mensual ISO respetando la cantidad de días', () => {
    expect(crearRangoMensual(2026, 5)).toEqual({
      fechaDesde: '2026-05-01',
      fechaHasta: '2026-05-31',
    });
    expect(crearRangoMensual(2024, 2).fechaHasta).toBe('2024-02-29');
  });
});
