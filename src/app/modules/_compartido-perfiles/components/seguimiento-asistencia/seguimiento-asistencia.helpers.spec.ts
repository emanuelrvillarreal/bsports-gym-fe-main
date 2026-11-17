import { describe, expect, it } from 'vitest';

import {
  barrasEvolucion,
  etiquetaMes,
  formatearFechaAsistencia,
  formatearPorcentaje,
  nivelDe,
  rangoPeriodo,
} from './seguimiento-asistencia.helpers';

describe('seguimiento-asistencia helpers', () => {
  const hoy = new Date(2026, 10, 4); // 04/11/2026

  it('arma los rangos rápidos hasta hoy', () => {
    expect(rangoPeriodo('mes', hoy)).toEqual({ desde: '2026-11-01', hasta: '2026-11-04' });
    expect(rangoPeriodo('trimestre', hoy)).toEqual({ desde: '2026-09-01', hasta: '2026-11-04' });
    expect(rangoPeriodo('semestre', hoy)).toEqual({ desde: '2026-06-01', hasta: '2026-11-04' });
    expect(rangoPeriodo('anio', hoy)).toEqual({ desde: '2026-01-01', hasta: '2026-11-04' });
    expect(rangoPeriodo('inscripcion', hoy)).toEqual({ desde: null, hasta: null });
  });

  it('cruza el año en el trimestre de enero', () => {
    expect(rangoPeriodo('trimestre', new Date(2026, 0, 15)).desde).toBe('2025-11-01');
  });

  it('formatea fechas, porcentajes y meses', () => {
    expect(formatearFechaAsistencia('2026-03-10')).toBe('10/03/2026');
    expect(formatearFechaAsistencia(null)).toBe('-');
    expect(formatearPorcentaje(null)).toBe('Sin clases');
    expect(formatearPorcentaje(83.3)).toBe('83,3%');
    expect(etiquetaMes('2026-05')).toBe('May 2026');
  });

  it('clasifica el semáforo con los umbrales del club', () => {
    expect(nivelDe(85, 80, 60)).toBe('VERDE');
    expect(nivelDe(80, 80, 60)).toBe('VERDE');
    expect(nivelDe(70, 80, 60)).toBe('AMARILLO');
    expect(nivelDe(59.9, 80, 60)).toBe('ROJO');
    expect(nivelDe(null, 80, 60)).toBe('SIN_DATOS');
  });

  it('omite los meses sin clases en la evolución', () => {
    const barras = barrasEvolucion(
      [
        { periodo: '2026-03', clases: 12, presentes: 10, ausentes: 2, justificadas: 0, porcentaje: 83.3 },
        { periodo: '2026-04', clases: 0, presentes: 0, ausentes: 0, justificadas: 0, porcentaje: null },
      ],
      80,
      60,
    );
    expect(barras).toHaveLength(1);
    expect(barras[0]).toMatchObject({ nombre: 'Mar 2026', valor: 83.3, tope: 100 });
  });
});
