import { describe, expect, it } from 'vitest';

import {
  obtenerRutaPrimeraSolapaVisible,
  obtenerSeccionAdministracion,
  obtenerSolapasVisibles,
} from './secciones-administracion';

describe('secciones-administracion', () => {
  it('ubica Solicitudes dentro de Socios e Ingresos dentro de Cobros', () => {
    const socios = obtenerSeccionAdministracion('socios');
    const tesoreria = obtenerSeccionAdministracion('tesoreria');

    expect(socios.solapas.map((solapa) => solapa.id)).toEqual(['socios', 'solicitudes', 'evaluaciones']);
    expect(tesoreria.solapas.map((solapa) => solapa.id)).toContain('ingresos');
  });

  it('filtra por rol y por lo que el club ocultó', () => {
    const tesoreria = obtenerSeccionAdministracion('tesoreria');

    expect(
      obtenerSolapasVisibles(tesoreria, 'ADM_RECEPCION', new Set()).map((solapa) => solapa.id),
    ).toEqual(['cuotas', 'ingresos', 'descuentos']);
    expect(
      obtenerSolapasVisibles(tesoreria, 'ADMIN', new Set(['ingresos'])).map((solapa) => solapa.id),
    ).toEqual(['cuotas', 'cuota-social', 'descuentos', 'reportes']);
  });

  it('nunca oculta la configuración del club ni la del menú', () => {
    const configuracion = obtenerSeccionAdministracion('configuracion');

    expect(
      obtenerSolapasVisibles(configuracion, 'ADMIN', new Set(['datos-club', 'menu-solapas'])),
    ).toHaveLength(2);
  });

  it('salta a la siguiente sección visible cuando la pedida quedó vacía', () => {
    const socios = obtenerSeccionAdministracion('socios');

    expect(
      obtenerRutaPrimeraSolapaVisible('ADMIN', new Set(['socios', 'solicitudes', 'evaluaciones']), socios),
    ).toBe('/admin/actividades/listado');
  });

  it('ignora lo oculto si recepción se quedaría sin ninguna pantalla', () => {
    const todo = new Set([
      'socios',
      'solicitudes',
      'actividades',
      'eventos',
      'cuotas',
      'ingresos',
      'descuentos',
      'accesos',
      'entradas-eventos',
      'amenities',
    ]);

    expect(obtenerRutaPrimeraSolapaVisible('ADM_RECEPCION', todo)).toBe(
      '/adm-recepcion/socios/listado',
    );
  });
});
