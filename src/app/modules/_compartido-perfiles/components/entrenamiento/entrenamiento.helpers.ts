import {
  DificultadEjercicio,
  EstadoRutina,
  ItemRutinaDto,
  TipoEjercicio,
} from '../../../../core/api/interfaces/entrenamiento.interfaces';
import { SelectOption } from '../../../ui/select/select.component';

export const TIPOS_EJERCICIO: readonly { readonly id: TipoEjercicio; readonly etiqueta: string }[] = [
  { id: 'FUERZA', etiqueta: 'Fuerza' },
  { id: 'RESISTENCIA', etiqueta: 'Resistencia' },
  { id: 'CARDIO', etiqueta: 'Cardio' },
  { id: 'VELOCIDAD', etiqueta: 'Velocidad' },
  { id: 'TECNICA', etiqueta: 'Técnica' },
  { id: 'TACTICA', etiqueta: 'Táctica' },
  { id: 'FLEXIBILIDAD', etiqueta: 'Flexibilidad' },
  { id: 'COORDINACION', etiqueta: 'Coordinación' },
  { id: 'OTRO', etiqueta: 'Otro' },
];

export const DIFICULTADES: readonly { readonly id: DificultadEjercicio; readonly etiqueta: string }[] = [
  { id: 'INICIAL', etiqueta: 'Inicial' },
  { id: 'INTERMEDIO', etiqueta: 'Intermedio' },
  { id: 'AVANZADO', etiqueta: 'Avanzado' },
];

export const OPCIONES_TIPO: readonly SelectOption[] = TIPOS_EJERCICIO.map((t) => ({ value: t.id, label: t.etiqueta }));
export const OPCIONES_DIFICULTAD: readonly SelectOption[] = DIFICULTADES.map((d) => ({ value: d.id, label: d.etiqueta }));

export function textoTipo(tipo: TipoEjercicio): string {
  return TIPOS_EJERCICIO.find((t) => t.id === tipo)?.etiqueta ?? tipo;
}

export function textoDificultad(dificultad: DificultadEjercicio): string {
  return DIFICULTADES.find((d) => d.id === dificultad)?.etiqueta ?? dificultad;
}

export function textoEstadoRutina(estado: EstadoRutina): string {
  return estado === 'ACTIVA' ? 'Activa' : estado === 'ARCHIVADA' ? 'Archivada' : 'Reemplazada';
}

export function textoAccionHistorial(accion: string): string {
  const textos: Record<string, string> = {
    CREADA: 'Creada',
    EDITADA: 'Editada',
    ASIGNADA: 'Asignada',
    ASIGNACION_FINALIZADA: 'Finalizada para un socio',
    REEMPLAZADA: 'Reemplazada',
    ARCHIVADA: 'Archivada',
  };
  return textos[accion] ?? accion;
}

/** "4 x 10-12 · 20 kg · 90 s de descanso". */
export function prescripcion(item: Pick<ItemRutinaDto, 'series' | 'repeticiones' | 'carga' | 'descansoSegundos'>): string {
  const partes: string[] = [];
  if (item.series && item.repeticiones) partes.push(`${item.series} x ${item.repeticiones}`);
  else if (item.series) partes.push(`${item.series} series`);
  else if (item.repeticiones) partes.push(item.repeticiones);
  if (item.carga) partes.push(item.carga);
  if (item.descansoSegundos) partes.push(`${textoDescanso(item.descansoSegundos)} de descanso`);
  return partes.join(' · ');
}

export function textoDescanso(segundos: number): string {
  if (segundos < 60) return `${segundos} s`;
  const minutos = Math.floor(segundos / 60);
  const resto = segundos % 60;
  return resto ? `${minutos} min ${resto} s` : `${minutos} min`;
}
