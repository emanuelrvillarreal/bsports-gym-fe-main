import { describe, expect, it } from 'vitest';

import { formatearVariacion, mes0, periodosComparacion, rangoReporte } from './reportes-economicos.helpers';

describe('reportes-economicos helpers', () => {
  const hoy = new Date(2026, 10, 5); // 05/11/2026

  it('arma los períodos rápidos con meses y años completos', () => {
    expect(rangoReporte('mes', hoy)).toEqual({ desde: '2026-11-01', hasta: '2026-11-30' });
    expect(rangoReporte('mesAnterior', hoy)).toEqual({ desde: '2026-10-01', hasta: '2026-10-31' });
    expect(rangoReporte('anio', hoy)).toEqual({ desde: '2026-01-01', hasta: '2026-12-31' });
    expect(rangoReporte('anioAnterior', hoy)).toEqual({ desde: '2025-01-01', hasta: '2025-12-31' });
    expect(rangoReporte('historial', hoy)).toBeNull();
  });

  it('cruza el año y respeta febrero', () => {
    expect(mes0(2026, -1)).toEqual({ desde: '2025-12-01', hasta: '2025-12-31' });
    expect(mes0(2028, 1)).toEqual({ desde: '2028-02-01', hasta: '2028-02-29' });
  });

  it('compara marzo 2025 con marzo 2026 y los semestres', () => {
    expect(periodosComparacion('mismoMesAnioAnterior', new Date(2026, 2, 15))).toEqual({
      a: { desde: '2025-03-01', hasta: '2025-03-31' },
      b: { desde: '2026-03-01', hasta: '2026-03-31' },
    });
    expect(periodosComparacion('semestres', hoy)?.a).toEqual({ desde: '2026-01-01', hasta: '2026-06-30' });
    expect(periodosComparacion('personalizada', hoy)).toBeNull();
  });

  it('formatea la variación con signo', () => {
    expect(formatearVariacion(25)).toBe('+25%');
    expect(formatearVariacion(-64.3)).toBe('-64,3%');
    expect(formatearVariacion(null)).toBe('Sin base');
  });
});
