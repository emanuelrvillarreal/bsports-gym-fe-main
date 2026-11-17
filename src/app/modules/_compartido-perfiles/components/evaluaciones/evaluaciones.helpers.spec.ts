import { describe, expect, it } from 'vitest';

import { EvaluacionDto } from '../../../../core/api/interfaces/evaluaciones.interfaces';
import { METRICAS, barrasMetrica, calcularImc, escala, formatearMedida, variacion } from './evaluaciones.helpers';

const evaluacion = (fecha: string, pesoKg: number | null, uuid = fecha): EvaluacionDto => ({
  uuid,
  fecha,
  pesoKg,
  imc: null,
  registradaPor: null,
  editable: false,
});
const peso = METRICAS.find((m) => m.clave === 'pesoKg')!;

describe('evaluaciones helpers', () => {
  it('calcula el IMC igual que el backend', () => {
    expect(calcularImc(70, 175)).toBe(22.86);
    expect(calcularImc(64, 165)).toBe(23.51);
    expect(calcularImc(null, 175)).toBeNull();
    expect(calcularImc(70, 0)).toBeNull();
  });

  it('la escala arranca debajo del mínimo para que se note la diferencia', () => {
    const { base, tope } = escala([64, 62.5]);
    expect(base).toBe(61);
    expect((64 - base) / tope).toBeGreaterThan(0.8);
    expect((62.5 - base) / tope).toBeLessThan(0.5);
    expect(escala([]).tope).toBe(1);
  });

  it('ordena las barras de la más vieja a la más nueva y muestra el valor real', () => {
    const barras = barrasMetrica([evaluacion('2026-11-05', 62.5), evaluacion('2026-09-01', 64), evaluacion('2026-10-01', null)], peso);
    expect(barras.map((b) => b.etiquetaValor)).toEqual(['64 kg', '62,5 kg']);
    expect(barras[0].nombre).toBe('01/09/2026');
  });

  it('describe la variación desde la primera medición', () => {
    expect(variacion([evaluacion('2026-11-05', 62.5), evaluacion('2026-09-01', 64)], peso)).toBe('−1,5 kg desde la primera');
    expect(variacion([evaluacion('2026-11-05', 64), evaluacion('2026-09-01', 64)], peso)).toBe('Sin cambios');
    expect(variacion([evaluacion('2026-11-05', 64)], peso)).toBeNull();
  });

  it('formatea medidas con unidad', () => {
    expect(formatearMedida(24.5, '%')).toBe('24,5 %');
    expect(formatearMedida(null, 'kg')).toBe('—');
  });
});
