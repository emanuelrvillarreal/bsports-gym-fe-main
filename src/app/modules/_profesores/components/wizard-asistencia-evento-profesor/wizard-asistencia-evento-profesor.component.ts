import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription, finalize } from 'rxjs';

import {
  AsistenciaProfesorItemDto,
  EstadoAsistenciaProfesor,
  EventoActividadDto,
  GuardarAsistenciaProfesorItemPayload,
} from '../../../../core/api/interfaces/actividades.interfaces';
import { CalendarioSlotDto } from '../../../../core/api/interfaces/portal.interfaces';
import { PortalProfesorApiService } from '../../../../core/api/services/portal-profesor-api.service';
import {
  desplazarFechaConsultaCalendario,
  isoFechaCalendario,
  parseFechaCalendario,
} from '../../../../helpers/calendario-fecha.helpers';
import { BotonComponent } from '../../../ui/boton/boton.component';
import { PopupComponent } from '../../../ui/popup/popup.component';
import { SelectComponent, SelectOption } from '../../../ui/select/select.component';
import {
  AccionTabla,
  ColumnaTabla,
  EventoAccionTabla,
  TablaResponsiveComponent,
} from '../../../ui/tabla-responsive/tabla-responsive.component';
import { ToastAlertService } from '../../../ui/toast-alert/services/toast-alert.service';
import { TituloHeroComponent } from '../../../ui/titulo-hero/titulo-hero.component';
import { PasoWizard, WizardPasosComponent } from '../../../ui/wizard-pasos/wizard-pasos.component';

type PasoAsistenciaEvento = 'dia' | 'asistencia' | 'confirmacion';

interface DiaAsistenciaEvento extends CalendarioSlotDto {
  readonly slotUuid: string;
}

@Component({
  selector: 'app-wizard-asistencia-evento-profesor',
  standalone: true,
  imports: [
    BotonComponent,
    PopupComponent,
    SelectComponent,
    TablaResponsiveComponent,
    TituloHeroComponent,
    WizardPasosComponent,
  ],
  templateUrl: './wizard-asistencia-evento-profesor.component.html',
  styleUrl: './wizard-asistencia-evento-profesor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WizardAsistenciaEventoProfesorComponent implements OnDestroy {
  private readonly portalProfesorApi = inject(PortalProfesorApiService);
  private readonly toastAlert = inject(ToastAlertService);
  private readonly destroyRef = inject(DestroyRef);
  private solicitudCalendario: Subscription | null = null;
  private solicitudPlanilla: Subscription | null = null;

  readonly evento = input<EventoActividadDto | null>(null);
  readonly cerrar = output<void>();

  protected readonly pasos: readonly PasoWizard[] = [
    { id: 'dia', etiqueta: 'Día' },
    { id: 'asistencia', etiqueta: 'Asistencia' },
    { id: 'confirmacion', etiqueta: 'Confirmación' },
  ];
  protected readonly pasoActual = signal<PasoAsistenciaEvento>('dia');
  protected readonly dias = signal<readonly DiaAsistenciaEvento[]>([]);
  protected readonly slotUuidSeleccionado = signal('');
  protected readonly slotPlanillaCargado = signal<string | null>(null);
  protected readonly planillaOriginal = signal<readonly AsistenciaProfesorItemDto[]>([]);
  protected readonly planillaBorrador = signal<readonly AsistenciaProfesorItemDto[]>([]);
  protected readonly cargandoDias = signal(false);
  protected readonly cargandoPlanilla = signal(false);
  protected readonly guardando = signal(false);
  protected readonly confirmandoCierre = signal(false);
  protected readonly errorDias = signal('');
  protected readonly errorPlanilla = signal('');
  protected readonly errorGuardado = signal('');

  protected readonly columnasAsistencia: readonly ColumnaTabla<AsistenciaProfesorItemDto>[] = [
    { id: 'nombre', titulo: 'Nombre', ancho: 'minmax(10rem, 1fr)' },
    { id: 'apellido', titulo: 'Apellido', ancho: 'minmax(10rem, 1fr)' },
    {
      id: 'estado',
      titulo: 'Asistencia',
      tipo: 'estado',
      ancho: '9rem',
      estadoTexto: (valor) => this.textoEstadoAsistencia(valor),
    },
  ];
  protected readonly accionesAsistencia: readonly AccionTabla<AsistenciaProfesorItemDto>[] = [
    {
      id: 'presente',
      texto: 'Marcar presente',
      icono: 'heroCheck',
      color: 'var(--semantic-success)',
      visible: (alumno) => alumno.estado !== 'PRESENTE',
    },
    {
      id: 'ausente',
      texto: 'Marcar ausente',
      icono: 'heroXMark',
      color: 'var(--semantic-danger)',
      visible: (alumno) => alumno.estado !== 'AUSENTE',
    },
  ];

  protected readonly opcionesDias = computed<readonly SelectOption[]>(() =>
    this.dias().map((dia) => ({
      value: dia.slotUuid,
      label: this.etiquetaDia(dia),
      disabled: dia.estado === 'CANCELADO',
    })),
  );
  protected readonly diaSeleccionado = computed(
    () => this.dias().find((dia) => dia.slotUuid === this.slotUuidSeleccionado()) ?? null,
  );
  protected readonly hayDiasCancelados = computed(() =>
    this.dias().some((dia) => dia.estado === 'CANCELADO'),
  );
  protected readonly puedeAvanzarDia = computed(
    () =>
      !!this.diaSeleccionado() &&
      this.diaSeleccionado()?.estado !== 'CANCELADO' &&
      !this.cargandoDias() &&
      !this.cargandoPlanilla(),
  );
  protected readonly presentes = computed(() =>
    this.planillaBorrador().filter((alumno) => alumno.estado === 'PRESENTE'),
  );
  protected readonly cambios = computed<readonly GuardarAsistenciaProfesorItemPayload[]>(() => {
    const estadosOriginales = new Map(
      this.planillaOriginal().map((alumno) => [alumno.memberUuid, alumno.estado] as const),
    );

    return this.planillaBorrador()
      .filter(
        (
          alumno,
        ): alumno is AsistenciaProfesorItemDto & {
          readonly estado: EstadoAsistenciaProfesor;
        } => alumno.estado !== null && estadosOriginales.get(alumno.memberUuid) !== alumno.estado,
      )
      .map((alumno) => ({ memberUuid: alumno.memberUuid, estado: alumno.estado }));
  });
  protected readonly tieneCambios = computed(() => this.cambios().length > 0);
  protected readonly tituloPopup = computed(() =>
    this.evento() ? `Asistencia · ${this.evento()?.titulo}` : 'Asistencia del evento',
  );
  protected readonly descripcionPopup = computed(() =>
    this.evento()
      ? `Seleccioná el día y registrá la asistencia de ${this.evento()?.actividadNombre}.`
      : '',
  );
  protected readonly fechaSeleccionada = computed(() =>
    this.formatearFechaVisible(this.diaSeleccionado()?.inicio),
  );
  protected readonly horarioSeleccionado = computed(() => {
    const dia = this.diaSeleccionado();
    return dia ? `${this.formatearHora(dia.inicio)} a ${this.formatearHora(dia.fin)}` : '-';
  });

  constructor() {
    effect(() => this.inicializarEvento(this.evento()));
  }

  ngOnDestroy(): void {
    this.cancelarLecturas();
  }

  protected seleccionarDia(slotUuid: string): void {
    const dia = this.dias().find(
      (item) => item.slotUuid === slotUuid && item.estado !== 'CANCELADO',
    );
    const siguienteSlotUuid = dia?.slotUuid ?? '';

    if (siguienteSlotUuid === this.slotUuidSeleccionado()) {
      return;
    }

    this.solicitudPlanilla?.unsubscribe();
    this.solicitudPlanilla = null;
    this.slotUuidSeleccionado.set(siguienteSlotUuid);
    this.slotPlanillaCargado.set(null);
    this.planillaOriginal.set([]);
    this.planillaBorrador.set([]);
    this.errorPlanilla.set('');
    this.errorGuardado.set('');
  }

  protected avanzar(): void {
    if (this.pasoActual() === 'dia') {
      this.cargarPlanillaSeleccionada();
      return;
    }

    if (this.pasoActual() === 'asistencia') {
      this.errorGuardado.set('');
      this.pasoActual.set('confirmacion');
    }
  }

  protected volver(): void {
    if (this.guardando() || this.cargandoPlanilla()) {
      return;
    }

    this.errorGuardado.set('');
    this.pasoActual.set(this.pasoActual() === 'confirmacion' ? 'asistencia' : 'dia');
  }

  protected manejarAccionAsistencia({
    accion,
    fila,
  }: EventoAccionTabla<AsistenciaProfesorItemDto>): void {
    if (accion === 'presente') {
      this.actualizarEstado(fila.memberUuid, 'PRESENTE');
    }

    if (accion === 'ausente') {
      this.actualizarEstado(fila.memberUuid, 'AUSENTE');
    }
  }

  protected confirmar(): void {
    if (this.pasoActual() !== 'confirmacion' || this.guardando()) {
      return;
    }

    const slotUuid = this.slotUuidSeleccionado();
    const items = this.cambios();
    if (!slotUuid) {
      this.errorGuardado.set('No se pudo identificar el día de la asistencia.');
      return;
    }

    if (!items.length) {
      this.emitirCierre();
      return;
    }

    this.guardando.set(true);
    this.errorGuardado.set('');
    this.portalProfesorApi
      .guardarAsistencia(slotUuid, { items })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.guardando.set(false)),
      )
      .subscribe({
        next: () => {
          this.planillaOriginal.set(this.clonarPlanilla(this.planillaBorrador()));
          this.emitirCierre();
        },
        error: () =>
          this.errorGuardado.set(
            'No se pudo guardar la asistencia. Revisá los datos e intentá nuevamente.',
          ),
      });
  }

  protected solicitarCierre(): void {
    if (this.guardando() || this.confirmandoCierre()) {
      return;
    }

    if (!this.tieneCambios()) {
      this.emitirCierre();
      return;
    }

    void this.confirmarDescarte();
  }

  protected reintentarDias(): void {
    const evento = this.evento();
    if (evento && !this.cargandoDias()) {
      this.cargarDias(evento);
    }
  }

  private inicializarEvento(evento: EventoActividadDto | null): void {
    this.cancelarLecturas();
    this.reiniciarEstado();

    if (evento) {
      this.cargarDias(evento);
    }
  }

  private cargarDias(evento: EventoActividadDto): void {
    // Se amplía la consulta porque el endpoint puede tratar los límites como
    // instantes y dejar afuera slots del primer o último día. El rango real
    // del evento se vuelve a aplicar al filtrar la respuesta.
    const desde = desplazarFechaConsultaCalendario(evento.inicio, -1);
    const hasta = desplazarFechaConsultaCalendario(evento.fin, 1);

    this.solicitudCalendario?.unsubscribe();
    this.solicitudCalendario = null;
    this.cargandoDias.set(false);
    this.errorDias.set('');
    this.dias.set([]);
    this.slotUuidSeleccionado.set('');

    if (!desde || !hasta) {
      this.errorDias.set('No se pudo interpretar el rango de fechas del evento.');
      return;
    }

    this.cargandoDias.set(true);
    this.solicitudCalendario = this.portalProfesorApi
      .consultarCalendario({ desde, hasta })
      .pipe(finalize(() => this.cargandoDias.set(false)))
      .subscribe({
        next: (slots) =>
          this.dias.set(
            this.prepararDias(
              slots,
              evento.actividadUuid,
              isoFechaCalendario(evento.inicio),
              isoFechaCalendario(evento.fin),
            ),
          ),
        error: () =>
          this.errorDias.set('No se pudieron cargar los días disponibles para el evento.'),
      });
  }

  private cargarPlanillaSeleccionada(): void {
    const slotUuid = this.slotUuidSeleccionado();
    if (!this.puedeAvanzarDia() || !slotUuid) {
      return;
    }

    if (this.slotPlanillaCargado() === slotUuid) {
      this.pasoActual.set('asistencia');
      return;
    }

    this.solicitudPlanilla?.unsubscribe();
    this.solicitudPlanilla = null;
    this.cargandoPlanilla.set(true);
    this.errorPlanilla.set('');
    this.solicitudPlanilla = this.portalProfesorApi
      .obtenerPlanillaAsistencia(slotUuid)
      .pipe(finalize(() => this.cargandoPlanilla.set(false)))
      .subscribe({
        next: (planilla) => {
          const items = this.clonarPlanilla(planilla);
          this.planillaOriginal.set(items);
          this.planillaBorrador.set(this.clonarPlanilla(items));
          this.slotPlanillaCargado.set(slotUuid);
          this.pasoActual.set('asistencia');
        },
        error: () => this.errorPlanilla.set('No se pudo cargar la planilla del día seleccionado.'),
      });
  }

  private prepararDias(
    slots: readonly CalendarioSlotDto[],
    actividadUuid: string,
    fechaInicioEvento: string | null,
    fechaFinEvento: string | null,
  ): readonly DiaAsistenciaEvento[] {
    const diasPorSlot = new Map<string, DiaAsistenciaEvento>();

    for (const slot of slots) {
      const slotUuid = slot.slotUuid?.trim();
      if (
        slot.tipo !== 'ACTIVIDAD' ||
        slot.referenciaUuid !== actividadUuid ||
        !this.estaDentroDelEvento(slot.inicio, fechaInicioEvento, fechaFinEvento) ||
        !slotUuid ||
        diasPorSlot.has(slotUuid)
      ) {
        continue;
      }

      diasPorSlot.set(slotUuid, { ...slot, slotUuid });
    }

    return [...diasPorSlot.values()].sort(
      (izquierda, derecha) => this.valorFecha(izquierda.inicio) - this.valorFecha(derecha.inicio),
    );
  }

  private estaDentroDelEvento(
    inicioSlot: string,
    fechaInicioEvento: string | null,
    fechaFinEvento: string | null,
  ): boolean {
    const fechaSlot = isoFechaCalendario(inicioSlot);
    return (
      !!fechaSlot &&
      !!fechaInicioEvento &&
      !!fechaFinEvento &&
      fechaSlot >= fechaInicioEvento &&
      fechaSlot <= fechaFinEvento
    );
  }

  private actualizarEstado(memberUuid: string, estado: EstadoAsistenciaProfesor): void {
    this.planillaBorrador.update((alumnos) =>
      alumnos.map((alumno) => (alumno.memberUuid === memberUuid ? { ...alumno, estado } : alumno)),
    );
    this.errorGuardado.set('');
  }

  private async confirmarDescarte(): Promise<void> {
    this.confirmandoCierre.set(true);
    const eventoUuid = this.evento()?.uuid;
    const confirmado = await this.toastAlert.confirm(
      'Hay cambios de asistencia sin guardar. Si cerrás, se van a perder.',
      {
        titulo: 'Descartar cambios',
        textoConfirmar: 'Descartar',
        textoCancelar: 'Seguir editando',
      },
    );
    this.confirmandoCierre.set(false);

    if (confirmado && eventoUuid === this.evento()?.uuid && !this.guardando()) {
      this.emitirCierre();
    }
  }

  private emitirCierre(): void {
    this.cancelarLecturas();
    this.cerrar.emit();
  }

  private cancelarLecturas(): void {
    this.solicitudCalendario?.unsubscribe();
    this.solicitudPlanilla?.unsubscribe();
    this.solicitudCalendario = null;
    this.solicitudPlanilla = null;
  }

  private reiniciarEstado(): void {
    this.pasoActual.set('dia');
    this.dias.set([]);
    this.slotUuidSeleccionado.set('');
    this.slotPlanillaCargado.set(null);
    this.planillaOriginal.set([]);
    this.planillaBorrador.set([]);
    this.cargandoDias.set(false);
    this.cargandoPlanilla.set(false);
    this.guardando.set(false);
    this.confirmandoCierre.set(false);
    this.errorDias.set('');
    this.errorPlanilla.set('');
    this.errorGuardado.set('');
  }

  private clonarPlanilla(
    items: readonly AsistenciaProfesorItemDto[],
  ): readonly AsistenciaProfesorItemDto[] {
    return items.map((item) => ({ ...item }));
  }

  private textoEstadoAsistencia(valor: unknown): string {
    if (valor === 'PRESENTE') return 'Presente';
    if (valor === 'AUSENTE') return 'Ausente';
    return 'No informado';
  }

  private etiquetaDia(dia: DiaAsistenciaEvento): string {
    const estado = dia.estado === 'CANCELADO' ? ' · Cancelado' : '';
    return `${this.formatearFechaVisible(dia.inicio)} · ${this.formatearHora(dia.inicio)}–${this.formatearHora(dia.fin)}${estado}`;
  }

  private formatearFechaVisible(valor?: string): string {
    const fecha = parseFechaCalendario(valor);
    if (!fecha) return valor?.trim() || '-';

    return new Intl.DateTimeFormat('es-AR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(fecha);
  }

  private formatearHora(valor?: string): string {
    const fecha = parseFechaCalendario(valor);
    if (!fecha) return '--:--';

    return new Intl.DateTimeFormat('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(fecha);
  }

  private valorFecha(valor?: string): number {
    return parseFechaCalendario(valor)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  }
}
