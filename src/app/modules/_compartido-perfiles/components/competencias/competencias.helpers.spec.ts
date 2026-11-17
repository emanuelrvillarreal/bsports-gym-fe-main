import { describe, expect, it } from 'vitest';

import { PartidoDto } from '../../../../core/api/interfaces/competencias.interfaces';
import { agruparPorRonda, formatearFechaHora, resultadoPropio } from './competencias.helpers';

const partido = (ronda: string, tl: number | null, tv: number | null, localPropio: boolean, estado: PartidoDto['estado'] = 'JUGADO'): PartidoDto => ({
  uuid: `${ronda}-${tl}-${tv}`,
  ronda,
  fechaHora: null,
  lugar: null,
  local: { uuid: 'l', nombre: 'Local', equipoUuid: localPropio ? 'e' : null, propio: localPropio },
  visitante: { uuid: 'v', nombre: 'Visitante', equipoUuid: localPropio ? null : 'e', propio: !localPropio },
  tantosLocal: tl,
  tantosVisitante: tv,
  estado,
  observaciones: null,
  conEstadisticas: false,
  conEquipoPropio: true,
});

describe('competencias helpers', () => {
  it('agrupa los partidos por ronda respetando el orden', () => {
    const grupos = agruparPorRonda([partido('Fecha 1', 1, 0, true), partido('Fecha 2', 0, 0, true), partido('Fecha 1', 2, 2, false)]);
    expect(grupos.map((g) => [g.ronda, g.partidos.length])).toEqual([
      ['Fecha 1', 2],
      ['Fecha 2', 1],
    ]);
  });

  it('calcula el resultado desde el lado del club', () => {
    expect(resultadoPropio(partido('F', 3, 1, true))).toBe('G');
    expect(resultadoPropio(partido('F', 3, 1, false))).toBe('P');
    expect(resultadoPropio(partido('F', 2, 2, false))).toBe('E');
    expect(resultadoPropio(partido('F', null, null, true, 'PROGRAMADO'))).toBeNull();
  });

  it('formatea fecha y hora', () => {
    expect(formatearFechaHora('2026-10-10T18:00:00')).toBe('10/10/2026 18:00');
    expect(formatearFechaHora(null)).toBe('Sin fecha');
  });
});
