import { describe, expect, it } from 'vitest';

import { normalizarPathEmpresa } from './normalizar-path-empresa';

describe('normalizarPathEmpresa', () => {
  it('convierte espacios y acentos en un path con guiones', () => {
    expect(normalizarPathEmpresa(' Club Atlético Norte ')).toBe('club-atletico-norte');
  });

  it('elimina separadores repetidos y caracteres no válidos', () => {
    expect(normalizarPathEmpresa('San  Lorenzo / CASLA!')).toBe('san-lorenzo-casla');
  });

  it('devuelve vacío si no recibe un nombre', () => {
    expect(normalizarPathEmpresa(null)).toBe('');
  });
});
