import { NgClass, NgStyle } from '@angular/common';

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

import { NgIcon } from '@ng-icons/core';

import { provideCalendarioIcons } from '../../../core/icons/app-icons.registry';

import { obtenerColorTextoContrasteGradiente } from '../../../helpers/color-texto-contraste';

import {
  duracionEventoCalendario,
  agruparEventosCalendarioPorDia,
  rangoHorarioCalendario,
} from '../../../helpers/calendario-evento.helpers';

import {
  finGrillaCalendario,
  formatearDiaTarjetaCalendario,
  formatearFechaBreveCalendario,
  formatearHoraCalendario,
  inicioGrillaCalendario,
  isoFechaCalendario,
  isoMesCalendario,
  normalizarMesCalendario,
  obtenerMesMaximoNavegableCalendario,
  obtenerMesMinimoNavegableCalendario,
  parseFechaCalendario,
  parseIsoDateCalendario,
} from '../../../helpers/calendario-fecha.helpers';
import { BotonComponent } from '../boton/boton.component';
import { ColorThemeService } from '../color-mod/color-theme.service';
import { LoadSpinnerBlueComponent } from '../load-spinner-blue/load-spinner-blue.component';

export interface CalendarioEvento {
  readonly diaHoraInicio?: string;

  readonly diaHoraFin?: string;

  readonly titulo?: string;

  /** Override: texto del evento en celda/modal. */

  readonly eventoTitulo?: (evento: CalendarioEvento) => string;

  /** Override: clase CSS del chip evento. */

  readonly eventoClase?: (evento: CalendarioEvento) => string | null;
}

interface CalendarioDia {
  readonly iso: string;

  readonly numero: number;

  readonly nombreVisible: string;

  readonly actual: boolean;

  readonly hoy: boolean;

  readonly eventos: readonly CalendarioEvento[];
}

@Component({
  selector: 'app-calendario',

  standalone: true,

  imports: [BotonComponent, LoadSpinnerBlueComponent, NgClass, NgStyle, NgIcon],

  providers: [provideCalendarioIcons()],

  templateUrl: './calendario.component.html',

  styleUrl: './calendario.component.scss',

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarioComponent {
  private readonly colorTheme = inject(ColorThemeService);

  private readonly elemento = inject(ElementRef<HTMLElement>);

  private readonly destroyRef = inject(DestroyRef);

  readonly eventos = input<readonly CalendarioEvento[]>([]);

  readonly altoRendimiento = input(false);

  readonly mesActivo = input.required<string>();

  readonly semanaActiva = input<string | null>(null);

  readonly cargando = input(false);

  readonly proximaActividad = input<CalendarioEvento | null>(null);

  readonly leyendaVacia = input('No hay eventos para este mes.');

  /** Override global: título visible del evento. */

  readonly resolverEventoTitulo = input<((evento: CalendarioEvento) => string) | null>(null);

  /** Override global: clase CSS del evento. */

  readonly resolverEventoClase = input<((evento: CalendarioEvento) => string | null) | null>(null);

  readonly mesCambiado = output<string>();

  readonly semanaCambiada = output<string>();

  protected readonly diasSemana = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'] as const;

  protected readonly diaModalIso = signal<string | null>(null);

  protected readonly anchoDisponible = signal(this.obtenerAnchoViewport());

  protected readonly eventosPorDia = computed(() =>
    agruparEventosCalendarioPorDia(this.eventos(), isoFechaCalendario),
  );

  protected readonly mesTitulo = computed(() =>
    new Intl.DateTimeFormat('es-AR', {
      month: 'long',

      year: 'numeric',
    }).format(normalizarMesCalendario(this.mesActivo())),
  );

  protected readonly dias = computed<readonly CalendarioDia[]>(() => {
    const mes = normalizarMesCalendario(this.mesActivo());

    const inicio = inicioGrillaCalendario(mes);

    const fin = finGrillaCalendario(mes);

    const resultado: CalendarioDia[] = [];

    const cursor = new Date(inicio);

    const hoyIso = isoFechaCalendario(new Date().toISOString());

    while (cursor <= fin) {
      const iso = isoFechaCalendario(cursor.toISOString()) ?? '';

      resultado.push({
        iso,

        numero: cursor.getDate(),

        nombreVisible: formatearDiaTarjetaCalendario(cursor),

        actual: cursor.getMonth() === mes.getMonth() && cursor.getFullYear() === mes.getFullYear(),

        hoy: iso === hoyIso,

        eventos: this.eventosPorDia().get(iso) ?? [],
      });

      cursor.setDate(cursor.getDate() + 1);
    }

    return resultado;
  });

  protected readonly diaModal = computed(() => {
    const iso = this.diaModalIso();

    if (!iso) {
      return null;
    }

    return this.dias().find((dia) => dia.iso === iso) ?? null;
  });

  protected readonly eventosDiaModal = computed(() => this.diaModal()?.eventos ?? []);

  // El navbar puede reducir el espacio disponible sin modificar el ancho de la ventana.
  // La vista se adapta al ancho real del componente para no comprimir las siete columnas.
  protected readonly vistaSemanal = computed(() => this.anchoDisponible() <= 1050);

  constructor() {
    afterNextRender(() => this.observarAnchoDisponible());
  }

  /** Inicio de la semana visible, acotado a una semana que intersecte el mes activo. */
  protected readonly inicioSemanaMostrada = computed(() => {
    const dias = this.dias();
    const primerDiaMes = dias.find((dia) => dia.actual);
    const ultimoDiaMes = [...dias].reverse().find((dia) => dia.actual);
    const inicioGrilla = dias[0];

    if (!primerDiaMes || !ultimoDiaMes || !inicioGrilla) {
      return null;
    }

    const referencia = parseIsoDateCalendario(this.semanaActiva() ?? inicioGrilla.iso);
    const finReferencia = new Date(referencia);
    finReferencia.setDate(finReferencia.getDate() + 6);
    const inicioMes = parseIsoDateCalendario(primerDiaMes.iso);
    const finMes = parseIsoDateCalendario(ultimoDiaMes.iso);

    if (finReferencia < inicioMes || referencia > finMes) {
      return parseIsoDateCalendario(inicioGrilla.iso);
    }

    return referencia;
  });

  protected readonly diasMostrados = computed(() => {
    const dias = this.dias();

    if (!this.vistaSemanal()) {
      return dias;
    }

    const inicio = this.inicioSemanaMostrada();
    if (!inicio) {
      return [];
    }

    const fin = new Date(inicio);

    fin.setDate(fin.getDate() + 6);

    return dias.filter((dia) => {
      const fecha = parseIsoDateCalendario(dia.iso);

      return dia.actual && fecha >= inicio && fecha <= fin;
    });
  });

  protected readonly puedeIrSemanaAnterior = computed(() => {
    const inicio = this.inicioSemanaMostrada();
    const primerDiaMes = this.dias().find((dia) => dia.actual);

    if (!inicio || !primerDiaMes) {
      return false;
    }

    const destino = new Date(inicio);
    destino.setDate(destino.getDate() - 7);
    destino.setDate(destino.getDate() + 6);

    return destino >= parseIsoDateCalendario(primerDiaMes.iso);
  });

  protected readonly puedeIrSemanaSiguiente = computed(() => {
    const inicio = this.inicioSemanaMostrada();
    const dias = this.dias();
    const ultimoDiaMes = [...dias].reverse().find((dia) => dia.actual);

    if (!inicio || !ultimoDiaMes) {
      return false;
    }

    const destino = new Date(inicio);
    destino.setDate(destino.getDate() + 7);

    return destino <= parseIsoDateCalendario(ultimoDiaMes.iso);
  });

  protected readonly semanaTitulo = computed(() => {
    if (!this.vistaSemanal()) {
      return '';
    }

    const primerDia = this.diasMostrados()[0];

    const ultimoDia = this.diasMostrados()[this.diasMostrados().length - 1];

    if (!primerDia || !ultimoDia) {
      return '';
    }

    return `${formatearFechaBreveCalendario(primerDia.iso)} al ${formatearFechaBreveCalendario(ultimoDia.iso)}`;
  });

  protected readonly estiloGrilla = computed(() => ({
    '--calendario-columnas': 'repeat(7, minmax(0, 1fr))',
  }));

  protected readonly colorTextoContadorDia = computed(() =>
    obtenerColorTextoContrasteGradiente(
      this.colorTheme.colorPrimario(),
      this.colorTheme.colorSecundario(),
    ),
  );

  protected readonly puedeIrMesAnterior = computed(() => {
    const mesActual = normalizarMesCalendario(this.mesActivo());

    return mesActual > obtenerMesMinimoNavegableCalendario();
  });

  protected readonly puedeIrMesSiguiente = computed(() => {
    const mesActual = normalizarMesCalendario(this.mesActivo());

    return mesActual < obtenerMesMaximoNavegableCalendario();
  });

  protected cambiarMes(delta: number): void {
    const mes = normalizarMesCalendario(this.mesActivo());

    const mesMinimo = obtenerMesMinimoNavegableCalendario();

    const mesMaximo = obtenerMesMaximoNavegableCalendario();

    if (delta < 0 && mes <= mesMinimo) {
      return;
    }

    if (delta > 0 && mes >= mesMaximo) {
      return;
    }

    const destino = new Date(mes.getFullYear(), mes.getMonth() + delta, 1);

    this.cerrarModal();

    this.mesCambiado.emit(isoMesCalendario(destino));
  }

  protected cambiarSemana(delta: number): void {
    if (
      (delta < 0 && !this.puedeIrSemanaAnterior()) ||
      (delta > 0 && !this.puedeIrSemanaSiguiente())
    ) {
      return;
    }

    const inicio = this.inicioSemanaMostrada();
    if (!inicio) {
      return;
    }

    const destino = new Date(inicio);

    destino.setDate(destino.getDate() + delta * 7);

    this.cerrarModal();

    const semanaDestino = isoFechaCalendario(destino.toISOString());
    if (semanaDestino) {
      this.semanaCambiada.emit(semanaDestino);
    }
  }

  protected abrirDia(dia: CalendarioDia): void {
    if (dia.eventos.length === 0) {
      return;
    }

    this.diaModalIso.set(dia.iso);
  }

  protected cerrarModal(): void {
    this.diaModalIso.set(null);
  }

  protected etiquetaDia(dia: CalendarioDia): string {
    return new Intl.DateTimeFormat('es-AR', {
      weekday: 'long',

      day: 'numeric',

      month: 'long',
    }).format(parseIsoDateCalendario(dia.iso));
  }

  protected fechaProximaActividad(evento: CalendarioEvento): string {
    const fecha = parseFechaCalendario(evento.diaHoraInicio);
    if (!fecha) {
      return 'Fecha a confirmar';
    }

    return new Intl.DateTimeFormat('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(fecha);
  }

  protected tituloEvento(evento: CalendarioEvento): string {
    if (evento.eventoTitulo) {
      return evento.eventoTitulo(evento);
    }

    const resolver = this.resolverEventoTitulo();

    if (resolver) {
      return resolver(evento);
    }

    return evento.titulo ?? 'Evento';
  }

  protected claseEvento(evento: CalendarioEvento): string | null {
    if (evento.eventoClase) {
      return evento.eventoClase(evento);
    }

    const resolver = this.resolverEventoClase();

    return resolver ? resolver(evento) : null;
  }

  protected rangoHorario(evento: CalendarioEvento): string {
    return rangoHorarioCalendario(evento, formatearHoraCalendario);
  }

  protected duracionEvento(evento: CalendarioEvento): string {
    return duracionEventoCalendario(evento);
  }

  @HostListener('document:keydown.escape')
  protected manejarEscape(): void {
    if (this.diaModalIso()) {
      this.cerrarModal();
    }
  }

  private obtenerAnchoViewport(): number {
    return typeof window === 'undefined' ? 1440 : window.innerWidth;
  }

  private observarAnchoDisponible(): void {
    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const observador = new ResizeObserver(([entrada]) => {
      this.anchoDisponible.set(entrada.contentRect.width);
    });

    observador.observe(this.elemento.nativeElement);

    this.destroyRef.onDestroy(() => observador.disconnect());
  }
}
