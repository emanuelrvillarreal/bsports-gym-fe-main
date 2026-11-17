import { describe, expect, it } from 'vitest';

import { obtenerColorTextoContrasteGradiente } from './color-texto-contraste';

describe('obtenerColorTextoContrasteGradiente', () => {
  it('elige texto oscuro para un gradiente claro', () => {
    expect(obtenerColorTextoContrasteGradiente('#dbeafe', '#bfdbfe')).toBe('#000000');
  });

  it('elige texto claro para un gradiente oscuro', () => {
    expect(obtenerColorTextoContrasteGradiente('#0f172a', '#1e3a8a')).toBe('#FFFFFF');
  });
});
