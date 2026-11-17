import { describe, expect, it } from 'vitest';

import { LAYOUT_ICONS, TITULO_HERO_ICONS } from './app-icons.registry';
import { ICONOS_APP, ICONOS_PAGINA, IconosAppService } from './iconos-app.service';

describe('IconosAppService', () => {
  const service = new IconosAppService();

  it('resuelve las claves semánticas del navbar', () => {
    expect(service.obtenerNombre('socios')).toBe('heroUsers');
    expect(service.obtenerNombre('tesoreria')).toBe('heroBanknotes');
    expect(service.obtenerNombre('credencial')).toBe('heroIdentification');
    expect(service.obtenerNombre('entradasEventos')).toBe('heroTicket');
    expect(service.obtenerNombre('descuentos')).toBe('heroReceiptPercent');
    expect(service.obtenerNombre('moverIzquierda')).toBe('layoutLeft');
    expect(service.obtenerNombre('moverDerecha')).toBe('layoutRight');
  });

  it('usa un fallback visible para claves desconocidas', () => {
    expect(service.obtenerNombre('icono-inexistente')).toBe(ICONOS_APP.fallback);
    expect(service.obtenerNombre(null)).toBe(ICONOS_APP.fallback);
  });

  it('registra en el layout todos los SVG que puede devolver', () => {
    const nombresRegistrados = new Set(Object.keys(LAYOUT_ICONS));

    for (const nombre of Object.values(ICONOS_APP)) {
      expect(nombresRegistrados.has(nombre), `${nombre} no está registrado en LAYOUT_ICONS`).toBe(
        true,
      );
    }
  });

  it('registra en titulo-hero todos los iconos semánticos de página', () => {
    const nombresRegistrados = new Set(Object.keys(TITULO_HERO_ICONS));

    for (const clave of ICONOS_PAGINA) {
      const nombre = service.obtenerNombre(clave);
      expect(
        nombresRegistrados.has(nombre),
        `${nombre} no está registrado en TITULO_HERO_ICONS`,
      ).toBe(true);
    }
  });
});
