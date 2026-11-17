import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription, finalize } from 'rxjs';

import {
  EvaluacionDto,
  EvaluacionPayload,
  EvaluacionesAccesoDto,
  HistorialEvaluacionesDto,
  SocioEvaluableDto,
} from '../../../../core/api/interfaces/evaluaciones.interfaces';
import { EvaluacionesApiService } from '../../../../core/api/services/evaluaciones-api.service';
import { BotonComponent } from '../../../ui/boton/boton.component';
import { InputFechaComponent } from '../../../ui/input-fecha/input-fecha.component';
import { PopupComponent } from '../../../ui/popup/popup.component';
import {
  AccionTabla,
  ColumnaTabla,
  EventoAccionTabla,
  TablaResponsiveComponent,
} from '../../../ui/tabla-responsive/tabla-responsive.component';
import { ToastAlertService } from '../../../ui/toast-alert/services/toast-alert.service';
import { formatearFechaAsistencia, isoFecha } from '../seguimiento-asistencia/seguimiento-asistencia.helpers';
import { AVISO_NO_CLINICO, calcularImc, formatearMedida } from './evaluaciones.helpers';
import { HistorialEvaluacionesComponent } from './historial-evaluaciones/historial-evaluaciones.component';

type FilaSocio = SocioEvaluableDto & {
  readonly socio: string;
  readonly ultimaTexto: string;
  readonly proximaTexto: string;
};

type CampoNumero =
  | 'pesoKg'
  | 'alturaCm'
  | 'grasaCorporalPct'
  | 'masaMuscularKg'
  | 'cinturaCm'
  | 'caderaCm'
  | 'pechoCm'
  | 'brazoCm'
  | 'musloCm'
  | 'pantorrillaCm';

interface Borrador {
  readonly fecha: string;
  readonly profesional: string;
  readonly numeros: Readonly<Record<CampoNumero, string>>;
  readonly observaciones: string;
  readonly recomendaciones: string;
  readonly proximaEvaluacion: string;
}

const NUMEROS_VACIOS: Record<CampoNumero, string> = {
  pesoKg: '',
  alturaCm: '',
  grasaCorporalPct: '',
  masaMuscularKg: '',
  cinturaCm: '',
  caderaCm: '',
  pechoCm: '',
  brazoCm: '',
  musloCm: '',
  pantorrillaCm: '',
};

/**
 * Evaluaciones físicas (módulo opcional del club). ADMIN: activa el módulo, decide si los profesores
 * registran y ve a todos los socios. Profesor habilitado: sus alumnos. El backend valida el alcance.
 */
@Component({
  selector: 'app-evaluaciones-fisicas',
  standalone: true,
  imports: [BotonComponent, HistorialEvaluacionesComponent, InputFechaComponent, PopupComponent, TablaResponsiveComponent],
  templateUrl: './evaluaciones-fisicas.component.html',
  styleUrl: './evaluaciones-fisicas.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EvaluacionesFisicasComponent {
  private readonly api = inject(EvaluacionesApiService);
  private readonly toast = inject(ToastAlertService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly aviso = AVISO_NO_CLINICO;
  protected readonly acceso = signal<EvaluacionesAccesoDto | null>(null);
  protected readonly cargandoAcceso = signal(true);
  protected readonly guardandoConfig = signal(false);

  protected readonly busqueda = signal('');
  protected readonly socios = signal<readonly SocioEvaluableDto[]>([]);
  protected readonly cargando = signal(false);

  protected readonly historial = signal<HistorialEvaluacionesDto | null>(null);
  protected readonly cargandoHistorial = signal(false);

  protected readonly formularioAbierto = signal(false);
  protected readonly editandoUuid = signal<string | null>(null);
  protected readonly borrador = signal<Borrador>(this.vacio());
  protected readonly guardando = signal(false);
  protected readonly error = signal('');

  protected readonly imcCalculado = computed(() => {
    const n = this.borrador().numeros;
    return calcularImc(aNumero(n.pesoKg), aNumero(n.alturaCm));
  });

  protected readonly filas = computed((): readonly FilaSocio[] =>
    this.socios().map((s) => ({
      ...s,
      socio: `${s.apellido ?? ''}, ${s.nombre ?? ''}`.replace(/^, |, $/g, ''),
      ultimaTexto: s.ultimaEvaluacion ? formatearFechaAsistencia(s.ultimaEvaluacion) : 'Sin evaluaciones',
      proximaTexto: s.proximaEvaluacion ? `${formatearFechaAsistencia(s.proximaEvaluacion)}${s.vencida ? ' · vencida' : ''}` : '—',
    })),
  );
  protected readonly columnas: readonly ColumnaTabla<FilaSocio>[] = [
    { id: 'socio', titulo: 'Socio', ancho: 'minmax(11rem, 1.4fr)', prioridadMobile: true },
    { id: 'dni', titulo: 'DNI', ancho: '8rem' },
    { id: 'actividades', titulo: 'Actividades', ancho: 'minmax(8rem, 1fr)' },
    { id: 'cantidad', titulo: 'Evaluaciones', tipo: 'numero', ancho: '7rem' },
    { id: 'ultimaTexto', titulo: 'Última', ancho: '8.5rem', prioridadMobile: true },
    { id: 'proximaTexto', titulo: 'Próxima', ancho: '9.5rem' },
  ];
  protected readonly acciones: readonly AccionTabla<FilaSocio>[] = [{ predefinida: 'ver' }];

  protected readonly campos: readonly { readonly clave: CampoNumero; readonly etiqueta: string; readonly min: number; readonly max: number }[] = [
    { clave: 'pesoKg', etiqueta: 'Peso (kg)', min: 1, max: 400 },
    { clave: 'alturaCm', etiqueta: 'Altura (cm)', min: 40, max: 260 },
    { clave: 'grasaCorporalPct', etiqueta: 'Grasa corporal (%)', min: 1, max: 75 },
    { clave: 'masaMuscularKg', etiqueta: 'Masa muscular (kg)', min: 1, max: 200 },
  ];
  protected readonly medidas: readonly { readonly clave: CampoNumero; readonly etiqueta: string; readonly min: number; readonly max: number }[] = [
    { clave: 'cinturaCm', etiqueta: 'Cintura', min: 10, max: 250 },
    { clave: 'caderaCm', etiqueta: 'Cadera', min: 10, max: 250 },
    { clave: 'pechoCm', etiqueta: 'Pecho', min: 10, max: 250 },
    { clave: 'brazoCm', etiqueta: 'Brazo', min: 5, max: 100 },
    { clave: 'musloCm', etiqueta: 'Muslo', min: 10, max: 150 },
    { clave: 'pantorrillaCm', etiqueta: 'Pantorrilla', min: 5, max: 100 },
  ];

  protected readonly medida = formatearMedida;
  protected readonly hoy = isoFecha(new Date());

  private consulta?: Subscription;
  private temporizador?: ReturnType<typeof setTimeout>;

  constructor() {
    queueMicrotask(() => this.cargarAcceso());
    this.destroyRef.onDestroy(() => clearTimeout(this.temporizador));
  }

  // ------------------------------------------------------------ Configuración

  protected cambiarConfig(campo: 'habilitado' | 'profesoresPuedenRegistrar', valor: boolean): void {
    const actual = this.acceso()?.config ?? { habilitado: false, profesoresPuedenRegistrar: false };
    this.guardandoConfig.set(true);
    this.api
      .guardarConfig({ ...actual, [campo]: valor })
      .pipe(finalize(() => this.guardandoConfig.set(false)))
      .subscribe({
        next: (acceso) => {
          this.acceso.set(acceso);
          if (acceso.habilitado && !this.socios().length) this.consultar();
        },
      });
  }

  // ------------------------------------------------------------ Socios

  protected buscar(valor: string): void {
    this.busqueda.set(valor);
    clearTimeout(this.temporizador);
    this.temporizador = setTimeout(() => this.consultar(), 350);
  }

  protected manejarAccion({ accion, fila }: EventoAccionTabla<FilaSocio>): void {
    if (accion === 'ver') this.abrirHistorial(fila.memberUuid);
  }

  protected abrirHistorial(memberUuid: string): void {
    this.historial.set(null);
    this.cargandoHistorial.set(true);
    this.api
      .historial(memberUuid)
      .pipe(finalize(() => this.cargandoHistorial.set(false)))
      .subscribe({ next: (historial) => this.historial.set(historial) });
  }

  protected cerrarHistorial(): void {
    this.historial.set(null);
    this.consultar();
  }

  // ------------------------------------------------------------ Formulario

  protected nuevaEvaluacion(): void {
    const anterior = this.historial()?.evaluaciones[0];
    // * Altura y profesional suelen repetirse: se precargan de la última evaluación
    this.borrador.set({
      ...this.vacio(),
      profesional: anterior?.profesional ?? '',
      numeros: { ...NUMEROS_VACIOS, alturaCm: anterior?.alturaCm?.toString() ?? '' },
    });
    this.editandoUuid.set(null);
    this.error.set('');
    this.formularioAbierto.set(true);
  }

  protected corregir(evaluacion: EvaluacionDto): void {
    const numeros = { ...NUMEROS_VACIOS };
    for (const clave of Object.keys(numeros) as CampoNumero[]) {
      const valor = evaluacion[clave];
      numeros[clave] = valor === null || valor === undefined ? '' : `${valor}`;
    }
    this.borrador.set({
      fecha: evaluacion.fecha.slice(0, 10),
      profesional: evaluacion.profesional ?? '',
      numeros,
      observaciones: evaluacion.observaciones ?? '',
      recomendaciones: evaluacion.recomendaciones ?? '',
      proximaEvaluacion: evaluacion.proximaEvaluacion?.slice(0, 10) ?? '',
    });
    this.editandoUuid.set(evaluacion.uuid);
    this.error.set('');
    this.formularioAbierto.set(true);
  }

  protected async eliminar(evaluacion: EvaluacionDto): Promise<void> {
    const confirmado = await this.toast.confirmDanger(
      `¿Eliminar la evaluación del ${formatearFechaAsistencia(evaluacion.fecha)}?`,
      { titulo: 'Eliminar evaluación' },
    );
    if (!confirmado) return;
    this.api.borrar(evaluacion.uuid).subscribe({ next: (historial) => this.historial.set(historial) });
  }

  protected cambiar(campo: 'fecha' | 'profesional' | 'observaciones' | 'recomendaciones' | 'proximaEvaluacion', valor: string): void {
    this.borrador.update((b) => ({ ...b, [campo]: valor ?? '' }));
  }

  protected cambiarNumero(campo: CampoNumero, valor: string): void {
    this.borrador.update((b) => ({ ...b, numeros: { ...b.numeros, [campo]: valor ?? '' } }));
  }

  protected guardar(): void {
    const historial = this.historial();
    if (!historial) return;
    const payload = this.armar();
    if (typeof payload === 'string') {
      this.error.set(payload);
      return;
    }
    this.guardando.set(true);
    const uuid = this.editandoUuid();
    const pedido = uuid ? this.api.editar(uuid, payload) : this.api.crear(historial.memberUuid, payload);
    pedido.pipe(finalize(() => this.guardando.set(false))).subscribe({
      next: (actualizado) => {
        this.historial.set(actualizado);
        this.formularioAbierto.set(false);
      },
      error: () => this.error.set('No se pudo guardar la evaluación. Revisá los valores.'),
    });
  }

  private armar(): EvaluacionPayload | string {
    const b = this.borrador();
    if (!b.fecha) return 'La fecha es obligatoria.';
    if (b.fecha > this.hoy) return 'La evaluación no puede tener fecha futura.';
    if (b.proximaEvaluacion && b.proximaEvaluacion <= b.fecha) return 'La próxima evaluación tiene que ser posterior.';
    const numeros: Partial<Record<CampoNumero, number | null>> = {};
    for (const campo of [...this.campos, ...this.medidas]) {
      const texto = b.numeros[campo.clave];
      const valor = aNumero(texto);
      if (texto && valor === null) return `${campo.etiqueta}: el valor no es un número.`;
      if (valor !== null && (valor < campo.min || valor > campo.max)) {
        return `${campo.etiqueta}: tiene que estar entre ${campo.min} y ${campo.max}.`;
      }
      numeros[campo.clave] = valor;
    }
    const hayDato = Object.values(numeros).some((v) => v !== null) || !!b.observaciones.trim();
    if (!hayDato) return 'Cargá al menos una medición u observación.';
    return {
      fecha: b.fecha,
      profesional: b.profesional.trim() || null,
      ...numeros,
      observaciones: b.observaciones.trim() || null,
      recomendaciones: b.recomendaciones.trim() || null,
      proximaEvaluacion: b.proximaEvaluacion || null,
    };
  }

  private vacio(): Borrador {
    return { fecha: isoFecha(new Date()), profesional: '', numeros: NUMEROS_VACIOS, observaciones: '', recomendaciones: '', proximaEvaluacion: '' };
  }

  // ------------------------------------------------------------ Carga

  private cargarAcceso(): void {
    this.cargandoAcceso.set(true);
    this.api
      .acceso()
      .pipe(
        finalize(() => this.cargandoAcceso.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (acceso) => {
          this.acceso.set(acceso);
          if (acceso.habilitado && acceso.puedeRegistrar) this.consultar();
        },
      });
  }

  private consultar(): void {
    this.consulta?.unsubscribe();
    this.cargando.set(true);
    this.consulta = this.api
      .socios(this.busqueda().trim())
      .pipe(
        finalize(() => this.cargando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({ next: (socios) => this.socios.set(socios) });
  }
}

function aNumero(valor: string): number | null {
  if (valor === null || valor === undefined || `${valor}`.trim() === '') return null;
  const n = Number(`${valor}`.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}
