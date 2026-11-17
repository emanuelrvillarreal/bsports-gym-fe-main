import { describe, expect, it } from 'vitest';

import { environment } from '../../../environments/environment';
import { crearApiUrl } from './api-url';

const baseNormalizada = environment.apiBaseUrl.trim().replace(/\/+$/, '');

describe('crearApiUrl', () => {
  it('une la base y la ruta con una sola barra', () => {
    expect(crearApiUrl('/user/login')).toBe(`${baseNormalizada}/user/login`);
  });

  it('devuelve la base normalizada cuando la ruta esta vacia', () => {
    expect(crearApiUrl('')).toBe(baseNormalizada);
  });
});
