export type EstadoTorneo = 'PROGRAMADO' | 'EN_CURSO' | 'FINALIZADO';
export type EstadoPartido = 'PROGRAMADO' | 'JUGADO' | 'SUSPENDIDO';

export interface OpcionDto {
  readonly uuid: string;
  readonly nombre: string;
}

export interface OpcionesCompetenciasDto {
  readonly profesores: readonly OpcionDto[];
  readonly categorias: readonly OpcionDto[];
  readonly actividades: readonly OpcionDto[];
  readonly equipos: readonly OpcionDto[];
}

export interface SocioCompetenciaDto {
  readonly memberUuid: string;
  readonly nombre: string | null;
  readonly apellido: string | null;
  readonly dni: string | null;
  readonly categoria: string | null;
}

export interface EquipoPayload {
  readonly nombre: string;
  readonly disciplina: string;
  readonly categoriaUuid?: string | null;
  readonly actividadUuid?: string | null;
  readonly temporada?: string | null;
  readonly descripcion?: string | null;
  readonly activo: boolean;
  readonly entrenadorUuids: readonly string[];
}

export interface JugadorPayload {
  readonly memberUuid: string;
  readonly dorsal?: number | null;
  readonly posicion?: string | null;
  readonly capitan: boolean;
  readonly fechaAlta?: string | null;
}

export interface TorneoPayload {
  readonly nombre: string;
  readonly disciplina: string;
  readonly categoriaUuid?: string | null;
  readonly temporada?: string | null;
  readonly fechaInicio?: string | null;
  readonly fechaFin?: string | null;
  readonly estado: EstadoTorneo;
  readonly puntosVictoria: number;
  readonly puntosEmpate: number;
  readonly puntosDerrota: number;
  readonly descripcion?: string | null;
}

export interface PartidoPayload {
  readonly ronda: string;
  readonly fechaHora?: string | null;
  readonly lugar?: string | null;
  readonly localUuid: string;
  readonly visitanteUuid: string;
  readonly tantosLocal?: number | null;
  readonly tantosVisitante?: number | null;
  readonly estado: EstadoPartido;
  readonly observaciones?: string | null;
}

export interface EstadisticaPayload {
  readonly jugadorUuid: string;
  readonly tantos: number;
  readonly asistencias: number;
  readonly amonestaciones: number;
  readonly expulsiones: number;
  readonly figura: boolean;
  readonly observaciones?: string | null;
}

export interface EquipoFilaDto {
  readonly uuid: string;
  readonly nombre: string;
  readonly disciplina: string;
  readonly categoria: string | null;
  readonly temporada: string | null;
  readonly entrenadores: readonly string[];
  readonly jugadores: number;
  readonly activo: boolean;
}

export interface JugadorDto {
  readonly uuid: string;
  readonly memberUuid: string;
  readonly nombre: string | null;
  readonly apellido: string | null;
  readonly dni: string | null;
  readonly dorsal: number | null;
  readonly posicion: string | null;
  readonly capitan: boolean;
  readonly fechaAlta: string;
  readonly fechaBaja: string | null;
  readonly motivoBaja: string | null;
  readonly partidos: number;
  readonly tantos: number;
  readonly asistencias: number;
  readonly amonestaciones: number;
  readonly expulsiones: number;
  readonly figuras: number;
}

export interface TorneoFilaDto {
  readonly uuid: string;
  readonly nombre: string;
  readonly disciplina: string;
  readonly categoria: string | null;
  readonly temporada: string | null;
  readonly estado: EstadoTorneo;
  readonly fechaInicio: string | null;
  readonly fechaFin: string | null;
  readonly participantes: number;
  readonly partidosJugados: number;
  readonly partidos: number;
}

export interface EquipoDetalleDto {
  readonly uuid: string;
  readonly nombre: string;
  readonly disciplina: string;
  readonly categoriaUuid: string | null;
  readonly categoria: string | null;
  readonly actividadUuid: string | null;
  readonly actividad: string | null;
  readonly temporada: string | null;
  readonly descripcion: string | null;
  readonly activo: boolean;
  readonly editable: boolean;
  readonly entrenadores: readonly OpcionDto[];
  readonly plantel: readonly JugadorDto[];
  readonly historial: readonly JugadorDto[];
  readonly torneos: readonly TorneoFilaDto[];
}

export interface ParticipanteDto {
  readonly uuid: string;
  readonly nombre: string;
  readonly equipoUuid: string | null;
  readonly propio: boolean;
}

export interface PartidoDto {
  readonly uuid: string;
  readonly ronda: string;
  readonly fechaHora: string | null;
  readonly lugar: string | null;
  readonly local: ParticipanteDto;
  readonly visitante: ParticipanteDto;
  readonly tantosLocal: number | null;
  readonly tantosVisitante: number | null;
  readonly estado: EstadoPartido;
  readonly observaciones: string | null;
  readonly conEstadisticas: boolean;
  readonly conEquipoPropio: boolean;
}

export interface PosicionDto {
  readonly participanteUuid: string;
  readonly nombre: string;
  readonly propio: boolean;
  readonly jugados: number;
  readonly ganados: number;
  readonly empatados: number;
  readonly perdidos: number;
  readonly favor: number;
  readonly contra: number;
  readonly diferencia: number;
  readonly puntos: number;
}

export interface GoleadorDto {
  readonly jugadorUuid: string;
  readonly nombre: string;
  readonly equipo: string;
  readonly tantos: number;
  readonly asistencias: number;
  readonly figuras: number;
}

export interface TorneoDetalleDto {
  readonly uuid: string;
  readonly nombre: string;
  readonly disciplina: string;
  readonly categoriaUuid: string | null;
  readonly categoria: string | null;
  readonly temporada: string | null;
  readonly fechaInicio: string | null;
  readonly fechaFin: string | null;
  readonly estado: EstadoTorneo;
  readonly puntosVictoria: number;
  readonly puntosEmpate: number;
  readonly puntosDerrota: number;
  readonly descripcion: string | null;
  readonly editable: boolean;
  readonly participantes: readonly ParticipanteDto[];
  readonly partidos: readonly PartidoDto[];
  readonly tabla: readonly PosicionDto[];
  readonly goleadores: readonly GoleadorDto[];
}

export interface EstadisticaJugadorDto {
  readonly jugadorUuid: string;
  readonly nombre: string;
  readonly equipo: string;
  readonly dorsal: number | null;
  readonly tantos: number;
  readonly asistencias: number;
  readonly amonestaciones: number;
  readonly expulsiones: number;
  readonly figura: boolean;
  readonly observaciones: string | null;
}

export interface EstadisticasPartidoDto {
  readonly partido: PartidoDto;
  readonly jugadores: readonly EstadisticaJugadorDto[];
}
