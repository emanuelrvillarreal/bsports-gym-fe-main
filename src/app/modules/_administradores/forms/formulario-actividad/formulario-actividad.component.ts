import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroPlus, heroTrash } from '@ng-icons/heroicons/outline';

import {
  ActividadDto,
  ActividadHorarioPayload,
  DiaSemana,
  GuardarActividadPayload,
} from '../../../../core/api/interfaces/actividades.interfaces';
import {
  OPCIONES_PERIODICIDAD_CUOTA,
  PERIODICIDAD_CUOTA_PREDETERMINADA,
  PeriodicidadCuota,
} from '../../../../core/api/interfaces/periodicidad-cuota.interfaces';
import { CategoriaDto } from '../../../../core/api/interfaces/categorias.interfaces';
import { RecargoTipo } from '../../../../core/api/interfaces/empresa.interfaces';
import { formatearMoneda, normalizarValorMoneda } from '../../../../helpers/moneda-formato';
import { BotonComponent } from '../../../ui/boton/boton.component';
import { SelectComponent, SelectOption } from '../../../ui/select/select.component';
import { InputHoraComponent } from '../../../ui/input-hora/input-hora.component';
import { ValidacionFormularioDirective } from '../../../ui/validacion-formulario/validacion-formulario.directive';

type CampoActividad = 'nombre' | 'ubicacion' | 'importeCuota' | 'diasVencimientoCuota';

/** Fila editable de la sección Horarios. `clave` identifica la fila en pantalla. */
interface HorarioEditable {
  readonly clave: number;
  readonly uuid: string | null;
  readonly diaSemana: DiaSemana | '';
  readonly horaInicio: string;
  readonly horaFin: string;
  readonly cupo: string;
  /** Inscriptos actuales: el cupo no puede bajar de acá y la fila no se puede quitar si hay. */
  readonly inscriptos: number;
}

const ETIQUETAS_DIA: Readonly<Record<DiaSemana, string>> = {
  LUNES: 'Lunes',
  MARTES: 'Martes',
  MIERCOLES: 'Miércoles',
  JUEVES: 'Jueves',
  VIERNES: 'Viernes',
  SABADO: 'Sábado',
  DOMINGO: 'Domingo',
};

@Component({
  selector: 'app-formulario-actividad',
  standalone: true,
  imports: [BotonComponent, InputHoraComponent, NgIcon, SelectComponent, ValidacionFormularioDirective],
  providers: [provideIcons({ heroPlus, heroTrash })],
  templateUrl: './formulario-actividad.component.html',
  styleUrl: './formulario-actividad.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormularioActividadComponent implements OnDestroy {
  readonly duracionErrorMs = input(5000);
  readonly actividad = input<ActividadDto | null>(null);
  readonly categorias = input<readonly CategoriaDto[]>([]);
  readonly enviado = output<GuardarActividadPayload>();

  protected readonly nombre = signal('');
  protected readonly ubicacion = signal('');
  protected readonly horarios = signal<readonly HorarioEditable[]>([]);
  private siguienteClave = 0;
  protected readonly importeCuota = signal(0);
  protected readonly periodicidadCuota = signal<PeriodicidadCuota>(PERIODICIDAD_CUOTA_PREDETERMINADA);
  protected readonly opcionesPeriodicidad = OPCIONES_PERIODICIDAD_CUOTA.map(({ valor, etiqueta }) => ({
    value: valor,
    label: etiqueta,
  }));
  protected readonly diasVencimientoCuota = signal('');
  /** `DIAS`: vence N días después de generada. `DIA_FIJO`: vence todos los meses el día elegido. */
  protected readonly modoVencimiento = signal<'DIAS' | 'DIA_FIJO'>('DIAS');
  protected readonly diaVencimientoFijo = signal('10');
  /** '' = se cobra el mes de la inscripción entero. */
  protected readonly diaCorteInscripcion = signal('');
  protected readonly opcionesModoVencimiento: readonly SelectOption[] = [
    { value: 'DIAS', label: 'Días después de generada' },
    { value: 'DIA_FIJO', label: 'Día fijo del mes' },
  ];
  protected readonly opcionesDiaCorte: readonly SelectOption[] = [
    { value: '', label: 'Sin corte: se cobra el mes entero' },
    ...Array.from({ length: 28 }, (_, i) => ({ value: String(i + 1), label: `Después del día ${i + 1}` })),
  ];
  protected readonly opcionesDiaMes: readonly SelectOption[] = Array.from({ length: 28 }, (_, i) => ({
    value: String(i + 1),
    label: `Día ${i + 1}`,
  }));
  /** El día fijo se alinea al mes, así que no se ofrece con cuotas semanales. */
  protected readonly admiteDiaFijo = computed(() => this.periodicidadCuota() !== 'SEMANAL');
  protected readonly opcionesRecargoTipo: readonly SelectOption[] = [
    { value: 'FIJO', label: 'Monto fijo ($)' },
    { value: 'PORCENTAJE', label: 'Porcentaje (%)' },
  ];
  protected readonly requiereCertificado = signal(false);
  protected readonly recargoHabilitado = signal(false);
  protected readonly recargoTipo = signal<RecargoTipo>('FIJO');
  protected readonly recargoValor = signal('');
  protected readonly recargoDiasGracia = signal('0');
  /** Ejemplo en lenguaje simple de lo que va a pasar con el recargo configurado. */
  protected readonly resumenRecargo = computed(() => {
    const valor = Number(this.recargoValor().trim());
    if (!Number.isFinite(valor) || valor <= 0) return 'Indicá el valor del recargo para ver un ejemplo.';
    const importe = this.importeCuota();
    const esPorcentaje = this.recargoTipo() === 'PORCENTAJE';
    const recargo = esPorcentaje ? (importe * valor) / 100 : valor;
    const gracia = Number(this.recargoDiasGracia().trim() || '0');
    const plazo =
      Number.isInteger(gracia) && gracia > 0
        ? `pasados ${gracia} ${gracia === 1 ? 'día' : 'días'} del vencimiento`
        : 'pasado el vencimiento';
    const base = importe > 0 ? `Si una cuota de ${formatearMoneda(importe)} sigue impaga ${plazo}, ` : `Si una cuota sigue impaga ${plazo}, `;
    return `${base}se le suman ${formatearMoneda(recargo)}${esPorcentaje ? ` (${valor}%)` : ''}.`;
  });
  protected readonly categoriaUuids = signal<readonly string[]>([]);
  /** Mantiene el placeholder visible después de que app-select emite una selección. */
  protected readonly valorCategoriaSinSeleccion = '__sin_seleccion_categoria__';
  protected readonly opcionesCategorias = computed<readonly SelectOption[]>(() => {
    const seleccionadas = new Set(this.categoriaUuids());
    return this.categorias()
      .filter((categoria) => !seleccionadas.has(categoria.categoriaUuid))
      .map((categoria) => ({
        value: categoria.categoriaUuid,
        label: categoria.nombre,
      }));
  });
  protected readonly categoriasSeleccionadas = computed(() => {
    const actividad = this.actividad();
    const categoriasActividad = actividad?.categorias ??
      (actividad?.categoria ? [actividad.categoria] : []);
    const categoriasPorUuid = new Map(
      [...categoriasActividad, ...this.categorias()].map((categoria) => [
        categoria.categoriaUuid,
        categoria,
      ] as const),
    );
    return this.categoriaUuids().map((categoriaUuid) =>
      categoriasPorUuid.get(categoriaUuid) ?? {
        categoriaUuid,
        nombre: 'Categoría no disponible',
      },
    );
  });
  protected readonly mensajeError = signal('');
  protected readonly errorVisible = signal(false);
  private errorTimeoutId: ReturnType<typeof setTimeout> | null = null;

  protected readonly opcionesDia: readonly SelectOption[] = (
    Object.keys(ETIQUETAS_DIA) as DiaSemana[]
  ).map((dia) => ({ value: dia, label: ETIQUETAS_DIA[dia] }));

  constructor() {
    effect(() => {
      const actividad = this.actividad();
      this.nombre.set(actividad?.nombre ?? '');
      this.ubicacion.set(actividad?.ubicacion ?? '');
      this.horarios.set(this.crearHorariosIniciales(actividad));
      this.importeCuota.set(actividad?.importeCuota ?? 0);
      this.periodicidadCuota.set(
        actividad?.periodicidadCuota ?? PERIODICIDAD_CUOTA_PREDETERMINADA,
      );
      this.diasVencimientoCuota.set(actividad?.diasVencimientoCuota?.toString() ?? '');
      this.modoVencimiento.set(actividad?.diaVencimientoFijo ? 'DIA_FIJO' : 'DIAS');
      this.diaVencimientoFijo.set(String(actividad?.diaVencimientoFijo ?? 10));
      this.diaCorteInscripcion.set(actividad?.diaCorteInscripcion ? String(actividad.diaCorteInscripcion) : '');
      this.requiereCertificado.set(actividad?.requiereCertificado ?? false);
      this.recargoHabilitado.set(actividad?.recargoHabilitado ?? false);
      this.recargoTipo.set(actividad?.recargoTipo ?? 'FIJO');
      this.recargoValor.set(actividad?.recargoValor?.toString() ?? '');
      this.recargoDiasGracia.set(actividad?.recargoDiasGracia?.toString() ?? '0');
      const categoriaUuids = actividad?.categoriaUuids ??
        actividad?.categorias?.map((categoria) => categoria.categoriaUuid) ??
        (actividad?.categoria ? [actividad.categoria.categoriaUuid] : []);
      this.categoriaUuids.set([...new Set(categoriaUuids)]);
      this.limpiarTimeoutError();
      this.errorVisible.set(false);
    });
  }

  ngOnDestroy(): void {
    this.limpiarTimeoutError();
  }

  protected actualizarTexto(campo: CampoActividad, evento: Event): void {
    if (campo === 'importeCuota') {
      this.importeCuota.set(normalizarValorMoneda((evento.target as HTMLInputElement).value));
      return;
    }
    this[campo].set((evento.target as HTMLInputElement).value);
  }

  protected formatearImporte(valor: number): string {
    return formatearMoneda(valor);
  }

  protected formatearInputImporte(evento: Event): void {
    const campo = evento.target as HTMLInputElement;
    campo.value = formatearMoneda(campo.value);
  }

  protected bloquearCaracterNoNumerico(evento: KeyboardEvent): void {
    const teclasDeEdicion = [
      'Backspace',
      'Delete',
      'Tab',
      'ArrowLeft',
      'ArrowRight',
      'Home',
      'End',
    ];

    if (
      evento.ctrlKey ||
      evento.metaKey ||
      evento.altKey ||
      teclasDeEdicion.includes(evento.key) ||
      /^\d$/.test(evento.key)
    ) {
      return;
    }

    evento.preventDefault();
  }

  /** Agrega una fila copiando día y franja de la última, para cargar rápido el mismo horario en otro día. */
  protected agregarHorario(): void {
    const ultimo = this.horarios().at(-1);
    this.horarios.update((actuales) => [
      ...actuales,
      this.crearFila({
        horaInicio: ultimo?.horaInicio ?? '',
        horaFin: ultimo?.horaFin ?? '',
        cupo: ultimo?.cupo ?? '',
      }),
    ]);
  }

  protected quitarHorario(clave: number): void {
    this.horarios.update((actuales) => actuales.filter((horario) => horario.clave !== clave));
  }

  protected actualizarHorario(
    clave: number,
    campo: 'diaSemana' | 'horaInicio' | 'horaFin' | 'cupo',
    valor: string,
  ): void {
    this.horarios.update((actuales) =>
      actuales.map((horario) => (horario.clave === clave ? { ...horario, [campo]: valor } : horario)),
    );
  }

  protected franjaInvalida(horario: HorarioEditable): boolean {
    return !!horario.horaInicio && !!horario.horaFin && horario.horaFin <= horario.horaInicio;
  }

  protected cupoInvalido(horario: HorarioEditable): boolean {
    const cupo = Number(horario.cupo);
    return !Number.isInteger(cupo) || cupo < 1 || cupo < horario.inscriptos;
  }

  private crearHorariosIniciales(actividad: ActividadDto | null): readonly HorarioEditable[] {
    if (!actividad) {
      return [this.crearFila({})];
    }
    if (actividad.horarios?.length) {
      return actividad.horarios.map((horario) =>
        this.crearFila({
          uuid: horario.uuid,
          diaSemana: horario.diaSemana,
          horaInicio: horario.horaInicio.slice(0, 5),
          horaFin: horario.horaFin.slice(0, 5),
          cupo: String(horario.cupoMaximo),
          inscriptos: horario.inscriptos,
        }),
      );
    }
    // Respuesta sin horarios: se arma una fila por día con la franja y cupo únicos de la actividad.
    return actividad.diasSemana
      .split(';')
      .filter((dia): dia is DiaSemana => dia in ETIQUETAS_DIA)
      .map((dia) =>
        this.crearFila({
          diaSemana: dia,
          horaInicio: actividad.horaInicio.slice(0, 5),
          horaFin: actividad.horaFin.slice(0, 5),
          cupo: String(actividad.cupoMaximo),
        }),
      );
  }

  private crearFila(datos: Partial<Omit<HorarioEditable, 'clave'>>): HorarioEditable {
    return {
      clave: this.siguienteClave++,
      uuid: datos.uuid ?? null,
      diaSemana: datos.diaSemana ?? '',
      horaInicio: datos.horaInicio ?? '',
      horaFin: datos.horaFin ?? '',
      cupo: datos.cupo ?? '',
      inscriptos: datos.inscriptos ?? 0,
    };
  }

  /** Devuelve el primer problema de la sección Horarios, o null si está completa. */
  private validarHorarios(): string | null {
    const horarios = this.horarios();
    if (!horarios.length) {
      return 'Agregá al menos un horario.';
    }
    const vistos = new Set<string>();
    for (const horario of horarios) {
      if (!horario.diaSemana || !horario.horaInicio || !horario.horaFin || !horario.cupo) {
        return 'Completá día, horario y cupo de cada horario.';
      }
      if (this.franjaInvalida(horario)) {
        return 'En cada horario, la hora de fin debe ser posterior a la de inicio.';
      }
      if (this.cupoInvalido(horario)) {
        return horario.inscriptos > 0
          ? `El cupo de ${ETIQUETAS_DIA[horario.diaSemana]} ${horario.horaInicio} no puede ser menor a sus ${horario.inscriptos} inscriptos.`
          : 'El cupo de cada horario debe ser al menos 1.';
      }
      const clave = `${horario.diaSemana}|${horario.horaInicio}`;
      if (vistos.has(clave)) {
        return `Hay dos horarios el ${ETIQUETAS_DIA[horario.diaSemana]} a las ${horario.horaInicio}.`;
      }
      vistos.add(clave);
    }
    return null;
  }

  private construirHorarios(): readonly ActividadHorarioPayload[] {
    return this.horarios().map((horario) => ({
      ...(horario.uuid ? { uuid: horario.uuid } : {}),
      diaSemana: horario.diaSemana as DiaSemana,
      horaInicio: `${horario.horaInicio}:00`,
      horaFin: `${horario.horaFin}:00`,
      cupoMaximo: Number(horario.cupo),
    }));
  }

  protected actualizarCategoria(categoriaUuid: string): void {
    if (!categoriaUuid) {
      this.categoriaUuids.set([]);
      return;
    }
    if (categoriaUuid === this.valorCategoriaSinSeleccion) return;
    this.categoriaUuids.update((actuales) =>
      actuales.includes(categoriaUuid) ? actuales : [...actuales, categoriaUuid],
    );
  }

  protected quitarCategoria(categoriaUuid: string): void {
    this.categoriaUuids.update((actuales) =>
      actuales.filter((actual) => actual !== categoriaUuid),
    );
  }

  protected actualizarPeriodicidad(valor: string): void {
    if (OPCIONES_PERIODICIDAD_CUOTA.some((opcion) => opcion.valor === valor)) {
      this.periodicidadCuota.set(valor as PeriodicidadCuota);
      if (valor === 'SEMANAL') this.modoVencimiento.set('DIAS');
    }
  }

  protected actualizarModoVencimiento(valor: string): void {
    if (valor === 'DIAS' || valor === 'DIA_FIJO') this.modoVencimiento.set(valor);
  }

  protected alternarCertificado(evento: Event): void {
    this.requiereCertificado.set((evento.target as HTMLInputElement).checked);
  }

  protected alternarRecargo(evento: Event): void {
    this.recargoHabilitado.set((evento.target as HTMLInputElement).checked);
  }

  protected seleccionarRecargoTipo(valor: string): void {
    if (valor === 'FIJO' || valor === 'PORCENTAJE') this.recargoTipo.set(valor);
  }

  protected recargoValorInvalido(): boolean {
    if (!this.recargoHabilitado()) return false;
    const texto = this.recargoValor().trim();
    const numero = Number(texto);
    if (!texto || !Number.isFinite(numero) || numero <= 0) return true;
    return this.recargoTipo() === 'PORCENTAJE' && numero > 100;
  }

  protected recargoGraciaInvalida(): boolean {
    const texto = this.recargoDiasGracia().trim();
    if (!texto) return false;
    const numero = Number(texto);
    return !Number.isInteger(numero) || numero < 0;
  }

  protected actualizarRecargo(campo: 'recargoValor' | 'recargoDiasGracia', evento: Event): void {
    this[campo].set((evento.target as HTMLInputElement).value);
  }

  protected diasInvalidos(valor: string): boolean {
    if (!valor.trim()) return false;
    const dias = Number(valor.trim());
    return !Number.isInteger(dias) || dias < 1;
  }

  protected enviar(): void {
    const importeCuota = this.importeCuota();
    if (
      !this.nombre().trim() ||
      !this.ubicacion().trim() ||
      !Number.isFinite(importeCuota) ||
      importeCuota <= 0 ||
      (this.modoVencimiento() === 'DIAS' && this.diasInvalidos(this.diasVencimientoCuota()))
    ) {
      this.mostrarError('Completá los campos obligatorios y verificá importe y días hasta el vencimiento.');
      return;
    }
    if (this.recargoValorInvalido() || this.recargoGraciaInvalida()) {
      this.mostrarError('Verificá el valor del recargo (mayor a 0, hasta 100 si es porcentaje) y los días de gracia.');
      return;
    }
    const errorHorarios = this.validarHorarios();
    if (errorHorarios) {
      this.mostrarError(errorHorarios);
      return;
    }

    this.limpiarTimeoutError();
    this.errorVisible.set(false);
    this.enviado.emit({
      nombre: this.nombre().trim(),
      ubicacion: this.ubicacion().trim(),
      horarios: this.construirHorarios(),
      importeCuota,
      periodicidadCuota: this.periodicidadCuota(),
      ...(this.modoVencimiento() === 'DIAS' && this.diasVencimientoCuota().trim()
        ? { diasVencimientoCuota: Number(this.diasVencimientoCuota().trim()) }
        : {}),
      diaVencimientoFijo:
        this.modoVencimiento() === 'DIA_FIJO' && this.admiteDiaFijo()
          ? Number(this.diaVencimientoFijo())
          : null,
      diaCorteInscripcion:
        this.modoVencimiento() === 'DIA_FIJO' && this.admiteDiaFijo() && this.diaCorteInscripcion()
          ? Number(this.diaCorteInscripcion())
          : null,
      categoriaUuids: this.categoriaUuids(),
      requiereCertificado: this.requiereCertificado(),
      recargoHabilitado: this.recargoHabilitado(),
      recargoTipo: this.recargoTipo(),
      ...(this.recargoValor().trim() ? { recargoValor: Number(this.recargoValor().trim()) } : {}),
      recargoDiasGracia: Number(this.recargoDiasGracia().trim() || '0'),
    });
  }

  private mostrarError(mensaje: string): void {
    this.limpiarTimeoutError();
    this.mensajeError.set(mensaje);
    this.errorVisible.set(true);
    this.errorTimeoutId = setTimeout(() => this.errorVisible.set(false), this.duracionErrorMs());
  }

  private limpiarTimeoutError(): void {
    if (this.errorTimeoutId !== null) {
      clearTimeout(this.errorTimeoutId);
      this.errorTimeoutId = null;
    }
  }
}
