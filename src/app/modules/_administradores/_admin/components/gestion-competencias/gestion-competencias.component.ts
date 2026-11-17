import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, finalize } from 'rxjs';

import {
  EquipoDetalleDto,
  EquipoFilaDto,
  EstadisticaJugadorDto,
  EstadisticasPartidoDto,
  EstadoPartido,
  EstadoTorneo,
  JugadorDto,
  OpcionesCompetenciasDto,
  ParticipanteDto,
  PartidoDto,
  SocioCompetenciaDto,
  TorneoDetalleDto,
  TorneoFilaDto,
} from '../../../../../core/api/interfaces/competencias.interfaces';
import { CompetenciasApiService } from '../../../../../core/api/services/competencias-api.service';
import {
  ESTADOS_PARTIDO,
  ESTADOS_TORNEO,
  textoEstadoTorneo,
} from '../../../../_compartido-perfiles/components/competencias/competencias.helpers';
import { VistaEquipoComponent } from '../../../../_compartido-perfiles/components/competencias/vista-equipo/vista-equipo.component';
import { VistaTorneoComponent } from '../../../../_compartido-perfiles/components/competencias/vista-torneo/vista-torneo.component';
import { formatearFechaAsistencia, isoFecha } from '../../../../_compartido-perfiles/components/seguimiento-asistencia/seguimiento-asistencia.helpers';
import { BotonComponent } from '../../../../ui/boton/boton.component';
import { InputFechaComponent } from '../../../../ui/input-fecha/input-fecha.component';
import { PopupComponent } from '../../../../ui/popup/popup.component';
import { SelectComponent, SelectOption } from '../../../../ui/select/select.component';
import {
  AccionTabla,
  ColumnaTabla,
  EventoAccionTabla,
  TablaResponsiveComponent,
} from '../../../../ui/tabla-responsive/tabla-responsive.component';
import { ToastAlertService } from '../../../../ui/toast-alert/services/toast-alert.service';

type Vista = 'equipos' | 'torneos';
type FilaEquipo = EquipoFilaDto & { readonly entrenadoresTexto: string };
type FilaTorneo = TorneoFilaDto & { readonly estadoTexto: string; readonly partidosTexto: string; readonly fechasTexto: string };

interface FormEquipo {
  nombre: string;
  disciplina: string;
  categoriaUuid: string;
  actividadUuid: string;
  temporada: string;
  descripcion: string;
  activo: boolean;
  entrenadores: Set<string>;
}

interface FormTorneo {
  nombre: string;
  disciplina: string;
  categoriaUuid: string;
  temporada: string;
  fechaInicio: string;
  fechaFin: string;
  estado: EstadoTorneo;
  puntosVictoria: string;
  puntosEmpate: string;
  puntosDerrota: string;
  descripcion: string;
}

interface FormPartido {
  ronda: string;
  fechaHora: string;
  lugar: string;
  localUuid: string;
  visitanteUuid: string;
  tantosLocal: string;
  tantosVisitante: string;
  estado: EstadoPartido;
  observaciones: string;
}

/**
 * Competencias (solo ADMIN): equipos y planteles (altas, dorsales, bajas y pases) y torneos
 * (participantes propios o rivales, partidos por fecha, resultados, tabla y estadísticas individuales).
 */
@Component({
  selector: 'app-gestion-competencias',
  standalone: true,
  imports: [
    BotonComponent,
    InputFechaComponent,
    PopupComponent,
    SelectComponent,
    TablaResponsiveComponent,
    VistaEquipoComponent,
    VistaTorneoComponent,
  ],
  templateUrl: './gestion-competencias.component.html',
  styleUrl: './gestion-competencias.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GestionCompetenciasComponent {
  private readonly api = inject(CompetenciasApiService);
  private readonly toast = inject(ToastAlertService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly vista = signal<Vista>('equipos');
  protected readonly busqueda = signal('');
  protected readonly incluirInactivos = signal(false);
  protected readonly cargando = signal(false);
  protected readonly procesando = signal(false);
  protected readonly opciones = signal<OpcionesCompetenciasDto | null>(null);

  protected readonly equipos = signal<readonly EquipoFilaDto[]>([]);
  protected readonly torneos = signal<readonly TorneoFilaDto[]>([]);
  protected readonly equipo = signal<EquipoDetalleDto | null>(null);
  protected readonly torneo = signal<TorneoDetalleDto | null>(null);

  // Formularios
  protected readonly formEquipoAbierto = signal(false);
  protected readonly formEquipo = signal<FormEquipo>(this.equipoVacio());
  protected readonly editandoEquipo = signal(false);
  protected readonly formTorneoAbierto = signal(false);
  protected readonly formTorneo = signal<FormTorneo>(this.torneoVacio());
  protected readonly editandoTorneo = signal(false);
  protected readonly error = signal('');

  protected readonly jugadorAbierto = signal(false);
  protected readonly jugadorEditando = signal<JugadorDto | null>(null);
  protected readonly socios = signal<readonly SocioCompetenciaDto[]>([]);
  protected readonly socioElegido = signal('');
  protected readonly busquedaSocio = signal('');
  protected readonly dorsal = signal('');
  protected readonly posicion = signal('');
  protected readonly capitan = signal(false);
  protected readonly fechaAlta = signal('');
  protected readonly hoy = isoFecha(new Date());

  protected readonly bajaDe = signal<JugadorDto | null>(null);
  protected readonly motivoBaja = signal('');
  protected readonly paseDe = signal<JugadorDto | null>(null);
  protected readonly destinoPase = signal('');

  protected readonly participanteAbierto = signal(false);
  protected readonly participanteEquipo = signal('');
  protected readonly participanteRival = signal('');

  protected readonly partidoAbierto = signal(false);
  protected readonly partidoEditando = signal<PartidoDto | null>(null);
  protected readonly formPartido = signal<FormPartido>(this.partidoVacio());

  protected readonly estadisticas = signal<EstadisticasPartidoDto | null>(null);
  protected readonly filasEstadisticas = signal<EstadisticaJugadorDto[]>([]);

  protected readonly filasEquipos = computed((): readonly FilaEquipo[] =>
    this.equipos().map((e) => ({ ...e, entrenadoresTexto: e.entrenadores.join(', ') || 'Sin asignar' })),
  );
  protected readonly filasTorneos = computed((): readonly FilaTorneo[] =>
    this.torneos().map((t) => ({
      ...t,
      estadoTexto: textoEstadoTorneo(t.estado),
      partidosTexto: `${t.partidosJugados} de ${t.partidos}`,
      fechasTexto: t.fechaInicio ? `${formatearFechaAsistencia(t.fechaInicio)}${t.fechaFin ? ' al ' + formatearFechaAsistencia(t.fechaFin) : ''}` : '—',
    })),
  );
  protected readonly columnasEquipos: readonly ColumnaTabla<FilaEquipo>[] = [
    { id: 'nombre', titulo: 'Equipo', ancho: 'minmax(10rem, 1.3fr)', prioridadMobile: true },
    { id: 'disciplina', titulo: 'Disciplina', ancho: 'minmax(7rem, .8fr)' },
    { id: 'categoria', titulo: 'Categoría', ancho: 'minmax(7rem, .8fr)' },
    { id: 'temporada', titulo: 'Temporada', ancho: '7rem' },
    { id: 'entrenadoresTexto', titulo: 'Entrenadores', ancho: 'minmax(9rem, 1fr)' },
    { id: 'jugadores', titulo: 'Jugadores', tipo: 'numero', ancho: '6rem', prioridadMobile: true },
  ];
  protected readonly columnasTorneos: readonly ColumnaTabla<FilaTorneo>[] = [
    { id: 'nombre', titulo: 'Torneo', ancho: 'minmax(10rem, 1.3fr)', prioridadMobile: true },
    { id: 'disciplina', titulo: 'Disciplina', ancho: 'minmax(7rem, .8fr)' },
    { id: 'categoria', titulo: 'Categoría', ancho: 'minmax(7rem, .8fr)' },
    { id: 'fechasTexto', titulo: 'Fechas', ancho: '12rem' },
    { id: 'participantes', titulo: 'Equipos', tipo: 'numero', ancho: '5.5rem' },
    { id: 'partidosTexto', titulo: 'Jugados', ancho: '6rem' },
    { id: 'estadoTexto', titulo: 'Estado', ancho: '7rem', prioridadMobile: true },
  ];
  protected readonly accionesEquipos: readonly AccionTabla<FilaEquipo>[] = [{ predefinida: 'ver' }];
  protected readonly accionesTorneos: readonly AccionTabla<FilaTorneo>[] = [{ predefinida: 'ver' }];

  protected readonly opcionesCategorias = computed<readonly SelectOption[]>(() => [
    { value: '', label: 'Sin categoría' },
    ...(this.opciones()?.categorias ?? []).map((o) => ({ value: o.uuid, label: o.nombre })),
  ]);
  protected readonly opcionesActividades = computed<readonly SelectOption[]>(() => [
    { value: '', label: 'Sin actividad' },
    ...(this.opciones()?.actividades ?? []).map((o) => ({ value: o.uuid, label: o.nombre })),
  ]);
  protected readonly opcionesDestino = computed<readonly SelectOption[]>(() => [
    { value: '', label: 'Elegí el equipo' },
    ...(this.opciones()?.equipos ?? []).filter((o) => o.uuid !== this.equipo()?.uuid).map((o) => ({ value: o.uuid, label: o.nombre })),
  ]);
  protected readonly opcionesEquiposParticipantes = computed<readonly SelectOption[]>(() => {
    const yaEstan = new Set((this.torneo()?.participantes ?? []).map((p) => p.equipoUuid));
    return [
      { value: '', label: 'Un rival externo (escribí el nombre)' },
      ...(this.opciones()?.equipos ?? []).filter((o) => !yaEstan.has(o.uuid)).map((o) => ({ value: o.uuid, label: o.nombre })),
    ];
  });
  protected readonly opcionesParticipantes = computed<readonly SelectOption[]>(() => [
    { value: '', label: 'Elegí' },
    ...(this.torneo()?.participantes ?? []).map((p) => ({ value: p.uuid, label: p.nombre })),
  ]);
  protected readonly opcionesEstadoTorneo: readonly SelectOption[] = ESTADOS_TORNEO.map((e) => ({ value: e.id, label: e.etiqueta }));
  protected readonly opcionesEstadoPartido: readonly SelectOption[] = ESTADOS_PARTIDO.map((e) => ({ value: e.id, label: e.etiqueta }));

  private temporizador?: ReturnType<typeof setTimeout>;
  private temporizadorSocio?: ReturnType<typeof setTimeout>;

  constructor() {
    queueMicrotask(() => {
      this.consultar();
      this.cargarOpciones();
    });
    this.destroyRef.onDestroy(() => {
      clearTimeout(this.temporizador);
      clearTimeout(this.temporizadorSocio);
    });
  }

  // ================================================================ Listados

  protected elegirVista(vista: Vista): void {
    if (this.vista() === vista) return;
    this.vista.set(vista);
    this.consultar();
  }

  protected buscar(valor: string): void {
    this.busqueda.set(valor);
    clearTimeout(this.temporizador);
    this.temporizador = setTimeout(() => this.consultar(), 350);
  }

  protected alternarInactivos(valor: boolean): void {
    this.incluirInactivos.set(valor);
    this.consultar();
  }

  protected accionEquipo({ accion, fila }: EventoAccionTabla<FilaEquipo>): void {
    if (accion === 'ver') this.abrirEquipo(fila.uuid);
  }

  protected accionTorneo({ accion, fila }: EventoAccionTabla<FilaTorneo>): void {
    if (accion === 'ver') this.abrirTorneo(fila.uuid);
  }

  protected abrirEquipo(uuid: string): void {
    this.torneo.set(null);
    this.api.equipo(uuid).subscribe({ next: (e) => this.equipo.set(e) });
  }

  protected abrirTorneo(uuid: string): void {
    this.equipo.set(null);
    this.api.torneo(uuid).subscribe({ next: (t) => this.torneo.set(t) });
  }

  protected cerrarDetalle(): void {
    this.equipo.set(null);
    this.torneo.set(null);
    this.consultar();
  }

  // ================================================================ Equipo: alta y edición

  protected nuevoEquipo(): void {
    this.editandoEquipo.set(false);
    this.formEquipo.set(this.equipoVacio());
    this.error.set('');
    this.formEquipoAbierto.set(true);
  }

  protected editarEquipo(): void {
    const e = this.equipo();
    if (!e) return;
    this.editandoEquipo.set(true);
    this.formEquipo.set({
      nombre: e.nombre,
      disciplina: e.disciplina,
      categoriaUuid: e.categoriaUuid ?? '',
      actividadUuid: e.actividadUuid ?? '',
      temporada: e.temporada ?? '',
      descripcion: e.descripcion ?? '',
      activo: e.activo,
      entrenadores: new Set(e.entrenadores.map((x) => x.uuid)),
    });
    this.error.set('');
    this.formEquipoAbierto.set(true);
  }

  protected cambiarEquipo(campo: Exclude<keyof FormEquipo, 'entrenadores' | 'activo'>, valor: string): void {
    this.formEquipo.update((f) => ({ ...f, [campo]: valor ?? '' }));
  }

  protected alternarActivo(valor: boolean): void {
    this.formEquipo.update((f) => ({ ...f, activo: valor }));
  }

  protected alternarEntrenador(uuid: string): void {
    this.formEquipo.update((f) => {
      const entrenadores = new Set(f.entrenadores);
      if (entrenadores.has(uuid)) entrenadores.delete(uuid);
      else entrenadores.add(uuid);
      return { ...f, entrenadores };
    });
  }

  protected guardarEquipo(): void {
    const f = this.formEquipo();
    if (!f.nombre.trim() || !f.disciplina.trim()) return this.error.set('Nombre y disciplina son obligatorios.');
    const payload = {
      nombre: f.nombre.trim(),
      disciplina: f.disciplina.trim(),
      categoriaUuid: f.categoriaUuid || null,
      actividadUuid: f.actividadUuid || null,
      temporada: f.temporada.trim() || null,
      descripcion: f.descripcion.trim() || null,
      activo: f.activo,
      entrenadorUuids: [...f.entrenadores],
    };
    const actual = this.equipo();
    this.ejecutar(
      this.editandoEquipo() && actual ? this.api.editarEquipo(actual.uuid, payload) : this.api.crearEquipo(payload),
      (e) => {
        this.equipo.set(e);
        this.formEquipoAbierto.set(false);
        this.cargarOpciones();
      },
    );
  }

  // ================================================================ Plantel

  protected sumarJugador(): void {
    this.jugadorEditando.set(null);
    this.socioElegido.set('');
    this.busquedaSocio.set('');
    this.dorsal.set('');
    this.posicion.set('');
    this.capitan.set(false);
    this.fechaAlta.set(this.hoy);
    this.error.set('');
    this.jugadorAbierto.set(true);
    this.buscarSocios('');
  }

  protected editarJugador(j: JugadorDto): void {
    this.jugadorEditando.set(j);
    this.dorsal.set(j.dorsal?.toString() ?? '');
    this.posicion.set(j.posicion ?? '');
    this.capitan.set(j.capitan);
    this.error.set('');
    this.jugadorAbierto.set(true);
  }

  protected buscarSocio(valor: string): void {
    this.busquedaSocio.set(valor);
    clearTimeout(this.temporizadorSocio);
    this.temporizadorSocio = setTimeout(() => this.buscarSocios(valor), 300);
  }

  protected guardarJugador(): void {
    const equipo = this.equipo();
    if (!equipo) return;
    const dorsal = this.dorsal().trim() === '' ? null : Number(this.dorsal());
    if (dorsal !== null && (!Number.isInteger(dorsal) || dorsal < 0 || dorsal > 999)) return this.error.set('El dorsal va de 0 a 999.');
    const editando = this.jugadorEditando();
    if (editando) {
      this.ejecutar(this.api.editarJugador(editando.uuid, { dorsal, posicion: this.posicion().trim() || null, capitan: this.capitan() }), (e) => {
        this.equipo.set(e);
        this.jugadorAbierto.set(false);
      });
      return;
    }
    if (!this.socioElegido()) return this.error.set('Elegí el socio.');
    if (this.fechaAlta() > this.hoy) return this.error.set('La fecha de alta no puede ser futura.');
    this.ejecutar(
      this.api.agregarJugador(equipo.uuid, {
        memberUuid: this.socioElegido(),
        dorsal,
        posicion: this.posicion().trim() || null,
        capitan: this.capitan(),
        fechaAlta: this.fechaAlta() || null,
      }),
      (e) => {
        this.equipo.set(e);
        this.jugadorAbierto.set(false);
      },
    );
  }

  protected pedirBaja(j: JugadorDto): void {
    this.bajaDe.set(j);
    this.motivoBaja.set('');
  }

  protected confirmarBaja(): void {
    const j = this.bajaDe();
    if (!j) return;
    this.ejecutar(this.api.bajaJugador(j.uuid, this.motivoBaja().trim() || null), (e) => {
      this.equipo.set(e);
      this.bajaDe.set(null);
    });
  }

  protected pedirPase(j: JugadorDto): void {
    this.paseDe.set(j);
    this.destinoPase.set('');
    this.dorsal.set('');
    this.error.set('');
  }

  protected confirmarPase(): void {
    const j = this.paseDe();
    if (!j || !this.destinoPase()) return this.error.set('Elegí el equipo de destino.');
    const dorsal = this.dorsal().trim() === '' ? null : Number(this.dorsal());
    this.ejecutar(this.api.pase(j.uuid, { equipoDestinoUuid: this.destinoPase(), dorsal, posicion: null }), (e) => {
      this.equipo.set(e);
      this.paseDe.set(null);
    });
  }

  // ================================================================ Torneo

  protected nuevoTorneo(): void {
    this.editandoTorneo.set(false);
    this.formTorneo.set(this.torneoVacio());
    this.error.set('');
    this.formTorneoAbierto.set(true);
  }

  protected editarTorneo(): void {
    const t = this.torneo();
    if (!t) return;
    this.editandoTorneo.set(true);
    this.formTorneo.set({
      nombre: t.nombre,
      disciplina: t.disciplina,
      categoriaUuid: t.categoriaUuid ?? '',
      temporada: t.temporada ?? '',
      fechaInicio: t.fechaInicio?.slice(0, 10) ?? '',
      fechaFin: t.fechaFin?.slice(0, 10) ?? '',
      estado: t.estado,
      puntosVictoria: `${t.puntosVictoria}`,
      puntosEmpate: `${t.puntosEmpate}`,
      puntosDerrota: `${t.puntosDerrota}`,
      descripcion: t.descripcion ?? '',
    });
    this.error.set('');
    this.formTorneoAbierto.set(true);
  }

  protected cambiarTorneo(campo: keyof FormTorneo, valor: string): void {
    this.formTorneo.update((f) => ({ ...f, [campo]: valor ?? '' }));
  }

  protected guardarTorneo(): void {
    const f = this.formTorneo();
    if (!f.nombre.trim() || !f.disciplina.trim()) return this.error.set('Nombre y disciplina son obligatorios.');
    if (f.fechaInicio && f.fechaFin && f.fechaFin < f.fechaInicio) return this.error.set('La fecha de fin no puede ser anterior al inicio.');
    const puntos = [f.puntosVictoria, f.puntosEmpate, f.puntosDerrota].map(Number);
    if (puntos.some((p) => !Number.isInteger(p) || p < 0 || p > 10)) return this.error.set('Los puntos van de 0 a 10.');
    const payload = {
      nombre: f.nombre.trim(),
      disciplina: f.disciplina.trim(),
      categoriaUuid: f.categoriaUuid || null,
      temporada: f.temporada.trim() || null,
      fechaInicio: f.fechaInicio || null,
      fechaFin: f.fechaFin || null,
      estado: f.estado,
      puntosVictoria: puntos[0],
      puntosEmpate: puntos[1],
      puntosDerrota: puntos[2],
      descripcion: f.descripcion.trim() || null,
    };
    const actual = this.torneo();
    this.ejecutar(
      this.editandoTorneo() && actual ? this.api.editarTorneo(actual.uuid, payload) : this.api.crearTorneo(payload),
      (t) => {
        this.torneo.set(t);
        this.formTorneoAbierto.set(false);
      },
    );
  }

  protected abrirParticipante(): void {
    this.participanteEquipo.set('');
    this.participanteRival.set('');
    this.error.set('');
    this.participanteAbierto.set(true);
  }

  protected guardarParticipante(): void {
    const t = this.torneo();
    if (!t) return;
    if (!this.participanteEquipo() && !this.participanteRival().trim()) return this.error.set('Elegí un equipo del gimnasio o escribí el rival.');
    this.ejecutar(
      this.api.agregarParticipante(t.uuid, {
        equipoUuid: this.participanteEquipo() || null,
        nombre: this.participanteEquipo() ? null : this.participanteRival().trim(),
      }),
      (nuevo) => {
        this.torneo.set(nuevo);
        this.participanteRival.set('');
        this.participanteEquipo.set('');
      },
    );
  }

  protected async quitarParticipante(p: ParticipanteDto): Promise<void> {
    const ok = await this.toast.confirmDanger(`¿Quitar a ${p.nombre} del torneo?`, { titulo: 'Quitar participante' });
    if (ok) this.ejecutar(this.api.quitarParticipante(p.uuid), (t) => this.torneo.set(t));
  }

  protected nuevoPartido(): void {
    this.partidoEditando.set(null);
    const anterior = this.torneo()?.partidos.at(-1);
    this.formPartido.set({ ...this.partidoVacio(), ronda: anterior?.ronda ?? 'Fecha 1' });
    this.error.set('');
    this.partidoAbierto.set(true);
  }

  protected editarPartido(m: PartidoDto): void {
    this.partidoEditando.set(m);
    this.formPartido.set({
      ronda: m.ronda,
      fechaHora: m.fechaHora?.slice(0, 16) ?? '',
      lugar: m.lugar ?? '',
      localUuid: m.local.uuid,
      visitanteUuid: m.visitante.uuid,
      tantosLocal: m.tantosLocal?.toString() ?? '',
      tantosVisitante: m.tantosVisitante?.toString() ?? '',
      estado: m.estado === 'PROGRAMADO' ? 'JUGADO' : m.estado,
      observaciones: m.observaciones ?? '',
    });
    this.error.set('');
    this.partidoAbierto.set(true);
  }

  protected cambiarPartido(campo: keyof FormPartido, valor: string): void {
    this.formPartido.update((f) => ({ ...f, [campo]: valor ?? '' }));
  }

  protected guardarPartido(): void {
    const t = this.torneo();
    const f = this.formPartido();
    if (!t) return;
    if (!f.ronda.trim()) return this.error.set('Indicá la fecha o ronda.');
    if (!f.localUuid || !f.visitanteUuid) return this.error.set('Elegí local y visitante.');
    if (f.localUuid === f.visitanteUuid) return this.error.set('Local y visitante tienen que ser distintos.');
    const tl = f.tantosLocal.trim() === '' ? null : Number(f.tantosLocal);
    const tv = f.tantosVisitante.trim() === '' ? null : Number(f.tantosVisitante);
    if (f.estado === 'JUGADO' && (tl === null || tv === null)) return this.error.set('Para marcarlo como jugado cargá el resultado.');
    if ([tl, tv].some((x) => x !== null && (!Number.isInteger(x) || x < 0))) return this.error.set('El resultado tiene que ser un número entero.');
    const payload = {
      ronda: f.ronda.trim(),
      fechaHora: f.fechaHora ? `${f.fechaHora}:00` : null,
      lugar: f.lugar.trim() || null,
      localUuid: f.localUuid,
      visitanteUuid: f.visitanteUuid,
      tantosLocal: tl,
      tantosVisitante: tv,
      estado: f.estado,
      observaciones: f.observaciones.trim() || null,
    };
    const editando = this.partidoEditando();
    this.ejecutar(editando ? this.api.editarPartido(editando.uuid, payload) : this.api.crearPartido(t.uuid, payload), (nuevo) => {
      this.torneo.set(nuevo);
      this.partidoAbierto.set(false);
    });
  }

  protected async eliminarPartido(m: PartidoDto): Promise<void> {
    const ok = await this.toast.confirmDanger(`¿Eliminar ${m.local.nombre} vs ${m.visitante.nombre}?`, { titulo: 'Eliminar partido' });
    if (ok) this.ejecutar(this.api.eliminarPartido(m.uuid), (t) => this.torneo.set(t));
  }

  protected abrirEstadisticas(m: PartidoDto): void {
    this.api.estadisticas(m.uuid).subscribe({
      next: (e) => {
        this.estadisticas.set(e);
        this.filasEstadisticas.set(e.jugadores.map((j) => ({ ...j })));
      },
    });
  }

  protected cambiarEstadistica(indice: number, campo: 'tantos' | 'asistencias' | 'amonestaciones' | 'expulsiones', valor: string): void {
    const numero = Math.max(0, Math.floor(Number(valor) || 0));
    this.filasEstadisticas.update((filas) => filas.map((f, i) => (i === indice ? { ...f, [campo]: numero } : f)));
  }

  protected alternarFigura(indice: number): void {
    this.filasEstadisticas.update((filas) => filas.map((f, i) => (i === indice ? { ...f, figura: !f.figura } : f)));
  }

  protected guardarEstadisticas(): void {
    const e = this.estadisticas();
    if (!e) return;
    const items = this.filasEstadisticas().map((f) => ({
      jugadorUuid: f.jugadorUuid,
      tantos: f.tantos,
      asistencias: f.asistencias,
      amonestaciones: f.amonestaciones,
      expulsiones: f.expulsiones,
      figura: f.figura,
      observaciones: f.observaciones,
    }));
    this.ejecutar(this.api.guardarEstadisticas(e.partido.uuid, items), () => {
      this.estadisticas.set(null);
      const t = this.torneo();
      if (t) this.abrirTorneo(t.uuid);
    });
  }

  // ================================================================ Apoyo

  private ejecutar<T>(pedido: Observable<T>, alTerminar: (resultado: T) => void): void {
    this.procesando.set(true);
    this.error.set('');
    pedido.pipe(finalize(() => this.procesando.set(false))).subscribe({
      next: alTerminar,
      error: () => this.error.set('No se pudo guardar. Revisá los datos.'),
    });
  }

  private consultar(): void {
    this.cargando.set(true);
    const filtro = { search: this.busqueda().trim() || undefined, incluirInactivos: this.incluirInactivos() };
    if (this.vista() === 'equipos') {
      this.api
        .equipos(filtro)
        .pipe(finalize(() => this.cargando.set(false)), takeUntilDestroyed(this.destroyRef))
        .subscribe({ next: (e) => this.equipos.set(e) });
    } else {
      this.api
        .torneos(filtro)
        .pipe(finalize(() => this.cargando.set(false)), takeUntilDestroyed(this.destroyRef))
        .subscribe({ next: (t) => this.torneos.set(t) });
    }
  }

  private cargarOpciones(): void {
    this.api.opciones().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: (o) => this.opciones.set(o) });
  }

  private buscarSocios(texto: string): void {
    this.api.socios(texto.trim()).subscribe({ next: (s) => this.socios.set(s) });
  }

  private equipoVacio(): FormEquipo {
    return { nombre: '', disciplina: '', categoriaUuid: '', actividadUuid: '', temporada: `${new Date().getFullYear()}`, descripcion: '', activo: true, entrenadores: new Set() };
  }

  private torneoVacio(): FormTorneo {
    return {
      nombre: '',
      disciplina: '',
      categoriaUuid: '',
      temporada: `${new Date().getFullYear()}`,
      fechaInicio: '',
      fechaFin: '',
      estado: 'PROGRAMADO',
      puntosVictoria: '3',
      puntosEmpate: '1',
      puntosDerrota: '0',
      descripcion: '',
    };
  }

  private partidoVacio(): FormPartido {
    return { ronda: 'Fecha 1', fechaHora: '', lugar: '', localUuid: '', visitanteUuid: '', tantosLocal: '', tantosVisitante: '', estado: 'PROGRAMADO', observaciones: '' };
  }
}
