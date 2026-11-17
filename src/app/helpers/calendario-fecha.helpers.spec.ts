import { describe, expect, it } from 'vitest';

import {
  formatearFechaConsultaCalendario,
  desplazarFechaConsultaCalendario,
  formatearHoraCalendario,
  isoFechaCalendario,
  parseFechaCalendario,
} from './calendario-fecha.helpers';
import { duracionEventoCalendario } from './calendario-evento.helpers';

describe('fechas del calendario', () => {
  const inicio = '14/08/2026 10:00:00';
  const fin = '14/08/2026 20:00:00';

  it('interpreta el formato dd/MM/yyyy HH:mm:ss que entrega el backend', () => {
    expect(isoFechaCalendario(inicio)).toBe('2026-08-14');
    expect(formatearHoraCalendario(inicio)).toBe('10.00');
    expect(duracionEventoCalendario({ diaHoraInicio: inicio, diaHoraFin: fin })).toBe('10 h');
  });

  it('descarta fechas argentinas inválidas', () => {
    expect(parseFechaCalendario('31/02/2026 10:00:00')).toBeNull();
  });

  it('formatea en fecha local los extremos de un rango para consultar el calendario', () => {
    expect(formatearFechaConsultaCalendario('25/07/2026 11:25:00')).toBe('25/07/2026');
    expect(formatearFechaConsultaCalendario('07/08/2026 11:25:00')).toBe('07/08/2026');
    expect(formatearFechaConsultaCalendario('2026-08-07T11:25:00')).toBe('07/08/2026');
    expect(formatearFechaConsultaCalendario('2026-08-07')).toBe('07/08/2026');
  });

  it('desplaza fechas de consulta sin alterar el día por zona horaria', () => {
    expect(desplazarFechaConsultaCalendario('01/03/2026 10:00:00', -1)).toBe('28/02/2026');
    expect(desplazarFechaConsultaCalendario('31/12/2026 10:00:00', 1)).toBe('01/01/2027');
  });

  it.each([undefined, '', 'fecha-invalida', '31/02/2026 11:25:00', '2026-02-31'])(
    'devuelve null para un valor no apto para consultar el calendario: %s',
    (valor) => {
      expect(formatearFechaConsultaCalendario(valor)).toBeNull();
    },
  );
});
