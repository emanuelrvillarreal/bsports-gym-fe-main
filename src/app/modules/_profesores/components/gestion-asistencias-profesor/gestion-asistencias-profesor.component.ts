import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgIcon } from '@ng-icons/core';
import { Subscription, finalize } from 'rxjs';

import { provideTablaResponsiveIcons } from '../../../../core/icons/app-icons.registry';
import { CalendarioSlotDto } from '../../../../core/api/interfaces/portal.interfaces';
import { AsistenciaActividadRowDto, AsistenciaProfesorItemDto, EstadoAsistenciaProfesor, GuardarAsistenciaProfesorItemPayload } from '../../../../core/api/interfaces/actividades.interfaces';
import { PortalProfesorApiService } from '../../../../core/api/services/portal-profesor-api.service';
import { ColorThemeService } from '../../../ui/color-mod/color-theme.service';
import { BotonComponent } from '../../../ui/boton/boton.component';
import { CardComponent } from '../../../ui/card/card.component';
import { PaginacionComponent } from '../../../ui/paginacion/paginacion.component';
import { PopupComponent } from '../../../ui/popup/popup.component';
import { LoadSpinnerBlueComponent } from '../../../ui/load-spinner-blue/load-spinner-blue.component';
import { InputFechaComponent } from '../../../ui/input-fecha/input-fecha.component';
import { SelectComponent, SelectOption } from '../../../ui/select/select.component';
import { TablaResponsiveComponent, AccionTabla, ColumnaTabla, EventoAccionTabla } from '../../../ui/tabla-responsive/tabla-responsive.component';
import { Carrusel3dComponent } from '../../../ui/carrusel-3d/carrusel-3d.component';
import { Carrusel3dItemDirective } from '../../../ui/carrusel-3d/carrusel-3d-item.directive';
import { TituloHeroComponent } from '../../../ui/titulo-hero/titulo-hero.component';
import { NgTemplateOutlet } from '@angular/common';

type Rango = 'hoy' | 'tres-dias' | 'semana';
interface CardAsistencia extends CalendarioSlotDto { readonly slotUuid: string; }
interface FilaHistorial extends AsistenciaActividadRowDto { readonly estado: EstadoAsistenciaProfesor | null; readonly historialUuid: string; }

@Component({
  selector: 'app-gestion-asistencias-profesor', standalone: true,
  imports: [BotonComponent, CardComponent, Carrusel3dComponent, Carrusel3dItemDirective, InputFechaComponent, LoadSpinnerBlueComponent, NgIcon, NgTemplateOutlet, PaginacionComponent, PopupComponent, SelectComponent, TablaResponsiveComponent, TituloHeroComponent],
  providers: [provideTablaResponsiveIcons()], templateUrl: './gestion-asistencias-profesor.component.html',
  styleUrl: './gestion-asistencias-profesor.component.scss', changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GestionAsistenciasProfesorComponent {
  private readonly api = inject(PortalProfesorApiService);
  private readonly tema = inject(ColorThemeService);
  private readonly destroyRef = inject(DestroyRef);
  private calendarioSub: Subscription | null = null;
  private historialSub: Subscription | null = null;
  private planillaSub: Subscription | null = null;

  protected readonly rango = signal<Rango>('hoy');
  protected readonly cards = signal<readonly CardAsistencia[]>([]);
  protected readonly cargando = signal(false);
  protected readonly error = signal('');
  protected readonly cardSeleccionada = signal<CardAsistencia | null>(null);
  protected readonly popupAbierto = signal(false);
  protected readonly alumnos = signal<readonly AsistenciaProfesorItemDto[]>([]);
  protected readonly cargandoPlanilla = signal(false);
  protected readonly guardando = signal(false);
  protected readonly errorPlanilla = signal('');
  protected readonly paginaHistorial = signal(1);
  protected readonly totalPaginasHistorial = signal(1);
  protected readonly historial = signal<readonly FilaHistorial[]>([]);
  protected readonly cargandoHistorial = signal(false);
  protected readonly fechaHistorial = signal('');
  protected readonly actividadHistorialUuid = signal('');
  protected readonly cardHistorialSeleccionada = computed(() => this.cards().find((card) => card.slotUuid === this.actividadHistorialUuid()) ?? null);
  protected readonly opcionesActividades = computed<readonly SelectOption[]>(() => this.cards().map((card) => ({ value: card.slotUuid, label: card.referenciaNombre || 'Actividad sin nombre' })));

  protected readonly columnas: readonly ColumnaTabla<AsistenciaProfesorItemDto>[] = [
    { id: 'nombre', titulo: 'Nombre', ancho: 'minmax(9rem, 1fr)' },
    { id: 'apellido', titulo: 'Apellido', ancho: 'minmax(9rem, 1fr)' },
    { id: 'estado', titulo: 'Estado', tipo: 'estado', ancho: '8rem', estadoTexto: (v) => this.textoEstado(v) },
  ];
  protected readonly acciones: readonly AccionTabla<AsistenciaProfesorItemDto>[] = [
    { id: 'presente', texto: 'Marcar presente', icono: 'heroCheck', color: 'var(--semantic-success)', visible: (f) => f.estado !== 'PRESENTE' },
    { id: 'ausente', texto: 'Marcar ausente', icono: 'heroXMark', color: 'var(--semantic-danger)', visible: (f) => f.estado !== 'AUSENTE' },
    // * Ausencia con aviso: no cuenta para las alertas de inasistencia y se informa aparte
    { id: 'justificada', texto: 'Ausencia justificada', icono: 'heroDocumentText', color: 'var(--app-warning)', visible: (f) => f.estado !== 'AUSENTE_JUSTIFICADO' },
  ];
  protected readonly gradiente = () => `linear-gradient(135deg, ${this.tema.colorPrimario()}, ${this.tema.colorSecundario()})`;
  /** Alterna la paleta de los CTA sin duplicar el cálculo de contraste de app-boton. */
  protected colorPaletaAsistencia(card: CardAsistencia): 'primario' | 'secundario' {
    const indice = this.cards().findIndex((item) => item.slotUuid === card.slotUuid);
    return indice % 2 === 1 ? 'secundario' : 'primario';
  }
  /** Mantiene la perspectiva 3D sin acercar demasiado la slide activa. */
  protected readonly radioCarrusel = () => '26rem';
  protected readonly anchoCarrusel = () => 'min(22rem, 92vw)';
  protected readonly altoCarrusel = () => '31rem';
  protected readonly perspectivaCarrusel = () => '2400px';

  constructor() { queueMicrotask(() => this.cargarCalendario()); }

  protected seleccionarRango(rango: Rango): void { if (this.rango() === rango) return; this.rango.set(rango); this.fechaHistorial.set(''); this.paginaHistorial.set(1); this.cargarCalendario(); }
  protected seleccionarCard(card: CardAsistencia, activa = true): void { if (!activa) return; this.cardSeleccionada.set(card); }
  protected seleccionarActividad(slotUuid: string): void { if (!this.cards().some((card) => card.slotUuid === slotUuid)) return; this.actividadHistorialUuid.set(slotUuid); }
  protected cambiarFechaHistorial(fecha: string): void { this.fechaHistorial.set(fecha); }
  protected aplicarFiltrosHistorial(): void { this.paginaHistorial.set(1); this.cargarHistorial(); }
  protected abrirAsistencia(card: CardAsistencia, activa = true): void {
    if (!activa) return;
    this.cardSeleccionada.set(card); this.popupAbierto.set(true); this.alumnos.set([]); this.errorPlanilla.set('');
    this.planillaSub?.unsubscribe(); this.cargandoPlanilla.set(true);
    this.planillaSub = this.api.obtenerPlanillaAsistencia(card.slotUuid).pipe(finalize(() => this.cargandoPlanilla.set(false))).subscribe({
      next: (alumnos) => this.alumnos.set(alumnos.map((a) => ({ ...a }))),
      error: () => this.errorPlanilla.set('No se pudo cargar la planilla de asistencia.'),
    });
  }
  protected cerrarPopup(forzar = false): void {
    if (!forzar && this.guardando()) return;
    this.popupAbierto.set(false);
    this.planillaSub?.unsubscribe();
  }
  protected accionAsistencia({ accion, fila }: EventoAccionTabla<AsistenciaProfesorItemDto>): void {
    const estado: EstadoAsistenciaProfesor =
      accion === 'presente' ? 'PRESENTE' : accion === 'justificada' ? 'AUSENTE_JUSTIFICADO' : 'AUSENTE';
    this.alumnos.update((items) => items.map((a) => a.memberUuid === fila.memberUuid ? { ...a, estado } : a));
  }
  protected guardar(): void {
    const card = this.cardSeleccionada(); if (!card || this.guardando()) return;
    const items: GuardarAsistenciaProfesorItemPayload[] = this.alumnos().filter((a): a is AsistenciaProfesorItemDto & { estado: EstadoAsistenciaProfesor } => a.estado !== null).map(({ memberUuid, estado }) => ({ memberUuid, estado }));
    if (!items.length) { this.cerrarPopup(); return; }
    this.guardando.set(true);
    this.api.guardarAsistencia(card.slotUuid, { items }).pipe(finalize(() => this.guardando.set(false))).subscribe({ next: () => { this.cerrarPopup(true); this.cargarHistorial(); }, error: () => this.errorPlanilla.set('No se pudo guardar la asistencia. Intentá nuevamente.') });
  }
  protected cambiarPaginaHistorial(pagina: number): void { this.paginaHistorial.set(pagina); this.cargarHistorial(); }
  /** Callbacks de tabla: se declaran como flecha para conservar el contexto del componente. */
  protected readonly estadoHistorial = (valor: unknown, fila: FilaHistorial): string =>
    this.textoEstado(fila.estado ?? valor);
  protected readonly claseHistorial = (valor: unknown, fila: FilaHistorial): string => {
    const estado = fila.estado ?? valor;
    return estado === 'PRESENTE'
      ? 'asistencias__chip--presente'
      : estado === 'AUSENTE'
        ? 'asistencias__chip--ausente'
        : estado === 'AUSENTE_JUSTIFICADO'
          ? 'asistencias__chip--justificada'
        : 'asistencias__chip--pendiente';
  };
  protected formatoFecha(valor: string): string { return valor?.split(' ')[0] ?? '-'; }
  protected formatoHora(valor: string): string { return valor?.split(' ')[1]?.slice(0, 5) ?? '-'; }

  private cargarCalendario(): void {
    this.calendarioSub?.unsubscribe(); this.cargando.set(true); this.error.set(''); const rango = this.obtenerRango(this.rango());
    this.calendarioSub = this.api.consultarCalendario(rango).pipe(finalize(() => this.cargando.set(false)), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (slots) => { const cards = this.normalizarCards(slots); this.cards.set(cards); const actual = this.cardSeleccionada(); const seleccionada = cards.find((c) => c.slotUuid === actual?.slotUuid) ?? cards[0] ?? null; this.cardSeleccionada.set(seleccionada); const actividadHistorial = cards.find((c) => c.slotUuid === this.actividadHistorialUuid()) ?? cards[0] ?? null; this.actividadHistorialUuid.set(actividadHistorial?.slotUuid ?? ''); this.paginaHistorial.set(1); this.cargarHistorial(); },
      error: () => { this.cards.set([]); this.error.set('No se pudo cargar el calendario de asistencias.'); this.historial.set([]); },
    });
  }
  protected cargarHistorial(): void {
    const card = this.cardHistorialSeleccionada(); if (!card) { this.historial.set([]); return; }
    this.historialSub?.unsubscribe(); this.cargandoHistorial.set(true);
    const rango = this.fechaHistorial() ? { desde: this.formatoFechaApi(this.fechaHistorial()), hasta: this.formatoFechaApi(this.fechaHistorial()) } : this.obtenerRango(this.rango());
    this.historialSub = this.api.paginarAsistencias({ page: this.paginaHistorial(), size: 70, actividadUuid: card.referenciaUuid, fechaDesde: rango.desde, fechaHasta: rango.hasta }).pipe(finalize(() => this.cargandoHistorial.set(false)), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (respuesta) => { this.historial.set(respuesta.content.map((fila) => ({ ...fila, historialUuid: `${fila.slotUuid}-${fila.memberUuid}-${fila.fecha}`, estado: fila.estado ?? (fila.presente === true ? 'PRESENTE' : fila.presente === false ? 'AUSENTE' : null) }))); this.totalPaginasHistorial.set(Math.max(1, respuesta.totalPages)); },
      error: () => { this.historial.set([]); this.totalPaginasHistorial.set(1); },
    });
  }
  private normalizarCards(slots: readonly CalendarioSlotDto[]): readonly CardAsistencia[] { const vistos = new Set<string>(); return slots.filter((s): s is CardAsistencia => s.tipo === 'ACTIVIDAD' && !!s.slotUuid?.trim() && !vistos.has(s.slotUuid.trim()) && !!vistos.add(s.slotUuid.trim())).sort((a, b) => this.fecha(a.inicio) - this.fecha(b.inicio)); }
  private obtenerRango(rango: Rango): { desde: string; hasta: string } { const hoy = new Date(); const fecha = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()); if (rango === 'hoy') return { desde: fecha(inicio), hasta: fecha(inicio) }; if (rango === 'tres-dias') return { desde: fecha(inicio), hasta: fecha(new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + 2)) }; const dia = inicio.getDay() || 7; return { desde: fecha(new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() - dia + 1)), hasta: fecha(new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() - dia + 7)) }; }
  private fecha(valor: string): number { const [d, h] = valor.split(' '); const [dia, mes, anio] = d.split('/').map(Number); const [hora, minuto = 0, segundo = 0] = (h ?? '00:00:00').split(':').map(Number); return new Date(anio, mes - 1, dia, hora, minuto, segundo).getTime(); }
  private formatoFechaApi(valor: string): string { const [anio, mes, dia] = valor.split('-'); return `${dia}/${mes}/${anio}`; }
  private textoEstado(valor: unknown): string { return valor === 'PRESENTE' ? 'Presente' : valor === 'AUSENTE' ? 'Ausente' : valor === 'AUSENTE_JUSTIFICADO' ? 'Justificada' : 'No declarado'; }
}
