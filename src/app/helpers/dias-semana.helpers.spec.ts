import { describe, expect, it } from 'vitest';

import { normalizarDiasSemana } from './dias-semana.helpers';

describe('normalizarDiasSemana', () => {
  it('separa y traduce los días delimitados por punto y coma', () => {
    expect(normalizarDiasSemana('LUNES;MARTES')).toEqual(['Lunes', 'Martes']);
  });

  it('normaliza espacios y acentos, elimina duplicados e ignora valores desconocidos', () => {
    expect(normalizarDiasSemana(' lunes ; MIÉRCOLES;lunes;FERIADO ')).toEqual([
      'Lunes',
      'Miércoles',
    ]);
  });

  it('resume los siete días en una única etiqueta', () => {
    expect(normalizarDiasSemana('LUNES;MARTES;MIERCOLES;JUEVES;VIERNES;SABADO;DOMINGO')).toEqual([
      'Todos los días',
    ]);
  });

  it('tolera el separador coma y entradas vacías', () => {
    expect(normalizarDiasSemana('VIERNES,SABADO')).toEqual(['Viernes', 'Sábado']);
    expect(normalizarDiasSemana(null)).toEqual([]);
    expect(normalizarDiasSemana('')).toEqual([]);
  });
});
