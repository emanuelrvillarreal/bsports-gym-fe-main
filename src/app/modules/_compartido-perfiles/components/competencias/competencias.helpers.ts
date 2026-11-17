import { EstadoPartido, EstadoTorneo, PartidoDto } from '../../../../core/api/interfaces/competencias.interfaces';
import { formatearFechaAsistencia } from '../seguimiento-asistencia/seguimiento-asistencia.helpers';

export const ESTADOS_TORNEO: readonly { readonly id: EstadoTorneo; readonly etiqueta: string }[] = [
  { id: 'PROGRAMADO', etiqueta: 'Programado' },
  { id: 'EN_CURSO', etiqueta: 'En curso' },
  { id: 'FINALIZADO', etiqueta: 'Finalizado' },
];

export const ESTADOS_PARTIDO: readonly { readonly id: EstadoPartido; readonly etiqueta: string }[] = [
  { id: 'PROGRAMADO', etiqueta: 'Programado' },
  { id: 'JUGADO', etiqueta: 'Jugado' },
  { id: 'SUSPENDIDO', etiqueta: 'Suspendido' },
];

export function textoEstadoTorneo(estado: EstadoTorneo): string {
  return ESTADOS_TORNEO.find((e) => e.id === estado)?.etiqueta ?? estado;
}

export function textoEstadoPartido(estado: EstadoPartido): string {
  return ESTADOS_PARTIDO.find((e) => e.id === estado)?.etiqueta ?? estado;
}

/** "10/11/2026 18:00" a partir de ISO (con o sin segundos). */
export function formatearFechaHora(valor: string | null | undefined): string {
  if (!valor) return 'Sin fecha';
  const [fecha, hora] = valor.replace(' ', 'T').split('T');
  return `${formatearFechaAsistencia(fecha)}${hora ? ' ' + hora.slice(0, 5) : ''}`;
}

/** Partidos agrupados por ronda o fecha, respetando el orden de llegada. */
export function agruparPorRonda(partidos: readonly PartidoDto[]): readonly { readonly ronda: string; readonly partidos: readonly PartidoDto[] }[] {
  const grupos = new Map<string, PartidoDto[]>();
  for (const partido of partidos) {
    const lista = grupos.get(partido.ronda) ?? [];
    lista.push(partido);
    grupos.set(partido.ronda, lista);
  }
  return [...grupos.entries()].map(([ronda, lista]) => ({ ronda, partidos: lista }));
}

/** Resultado del partido visto por un equipo del club: G, E o P (null si no es propio o no se jugó). */
export function resultadoPropio(partido: PartidoDto): 'G' | 'E' | 'P' | null {
  if (partido.estado !== 'JUGADO' || partido.tantosLocal === null || partido.tantosVisitante === null) return null;
  const localPropio = partido.local.propio;
  const visitantePropio = partido.visitante.propio;
  if (localPropio === visitantePropio) return null;
  const propios = localPropio ? partido.tantosLocal : partido.tantosVisitante;
  const ajenos = localPropio ? partido.tantosVisitante : partido.tantosLocal;
  return propios > ajenos ? 'G' : propios === ajenos ? 'E' : 'P';
}
