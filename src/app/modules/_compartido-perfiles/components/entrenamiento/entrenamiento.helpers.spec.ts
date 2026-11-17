import { describe, expect, it } from 'vitest';

import { normalizar } from '../../../../core/api/services/entrenamiento-api.service';
import { prescripcion, textoAccionHistorial, textoDescanso, textoTipo } from './entrenamiento.helpers';

describe('entrenamiento helpers', () => {
  it('arma la prescripción con lo que haya cargado', () => {
    expect(prescripcion({ series: 4, repeticiones: '10-12', carga: '20 kg', descansoSegundos: 90 })).toBe(
      '4 x 10-12 · 20 kg · 1 min 30 s de descanso',
    );
    expect(prescripcion({ series: 3, repeticiones: null, carga: null, descansoSegundos: null })).toBe('3 series');
    expect(prescripcion({ series: null, repeticiones: '45 seg', carga: 'RPE 7', descansoSegundos: 60 })).toBe(
      '45 seg · RPE 7 · 1 min de descanso',
    );
    expect(prescripcion({ series: null, repeticiones: null, carga: null, descansoSegundos: null })).toBe('');
  });

  it('formatea el descanso en segundos y minutos', () => {
    expect(textoDescanso(45)).toBe('45 s');
    expect(textoDescanso(120)).toBe('2 min');
    expect(textoDescanso(150)).toBe('2 min 30 s');
  });

  it('traduce tipos y acciones del historial', () => {
    expect(textoTipo('TECNICA')).toBe('Técnica');
    expect(textoAccionHistorial('ASIGNACION_FINALIZADA')).toBe('Finalizada para un socio');
    expect(textoAccionHistorial('OTRA')).toBe('OTRA');
  });

  it('normaliza fechas del backend (arreglos y milisegundos) en toda la respuesta', () => {
    const resultado = normalizar({
      fechaInicio: [2026, 3, 10],
      asignaciones: [{ fechaAsignacion: [2026, 11, 5], seguimientos: [{ fecha: [2026, 11, 6], esfuerzo: 7 }] }],
      historial: [{ fecha: Date.UTC(2026, 10, 5, 12, 0, 0), accion: 'CREADA' }],
      nombre: 'Rutina',
    });
    expect(resultado.fechaInicio).toBe('2026-03-10');
    expect(resultado.asignaciones[0].fechaAsignacion).toBe('2026-11-05');
    expect(resultado.asignaciones[0].seguimientos[0].fecha).toBe('2026-11-06');
    expect(resultado.asignaciones[0].seguimientos[0].esfuerzo).toBe(7);
    expect(resultado.historial[0].fecha).toBe('2026-11-05T12:00:00.000Z');
    expect(resultado.nombre).toBe('Rutina');
  });
});
