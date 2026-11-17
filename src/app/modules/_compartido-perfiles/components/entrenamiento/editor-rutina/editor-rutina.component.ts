import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { finalize } from 'rxjs';

import {
  AlumnoAsignableDto,
  RutinaDetalleDto,
  RutinaPayload,
} from '../../../../../core/api/interfaces/entrenamiento.interfaces';
import { ActividadesApiService } from '../../../../../core/api/services/actividades-api.service';
import { EntrenamientoApiService } from '../../../../../core/api/services/entrenamiento-api.service';
import { BotonComponent } from '../../../../ui/boton/boton.component';
import { InputFechaComponent } from '../../../../ui/input-fecha/input-fecha.component';
import { PopupComponent } from '../../../../ui/popup/popup.component';
import { SelectComponent, SelectOption } from '../../../../ui/select/select.component';

export type ModoEditorRutina = 'crear' | 'editar' | 'reemplazar';

interface ItemEditable {
  readonly clave: number;
  readonly ejercicioUuid: string;
  readonly series: string;
  readonly repeticiones: string;
  readonly carga: string;
  readonly descanso: string;
  readonly observaciones: string;
}

interface DiaEditable {
  readonly clave: number;
  readonly nombre: string;
  readonly items: readonly ItemEditable[];
}

interface Borrador {
  readonly nombre: string;
  readonly objetivo: string;
  readonly disciplina: string;
  readonly actividadUuid: string;
  readonly fechaInicio: string;
  readonly fechaFin: string;
  readonly observaciones: string;
  readonly dias: readonly DiaEditable[];
}

type CampoItem = 'ejercicioUuid' | 'series' | 'repeticiones' | 'carga' | 'descanso' | 'observaciones';
type CampoGeneral = 'nombre' | 'objetivo' | 'disciplina' | 'actividadUuid' | 'fechaInicio' | 'fechaFin' | 'observaciones';

let siguienteClave = 1;
const nuevaClave = (): number => siguienteClave++;
const itemVacio = (): ItemEditable => ({
  clave: nuevaClave(),
  ejercicioUuid: '',
  series: '',
  repeticiones: '',
  carga: '',
  descanso: '',
  observaciones: '',
});
const diaVacio = (numero: number): DiaEditable => ({ clave: nuevaClave(), nombre: `Día ${numero}`, items: [itemVacio()] });

/**
 * Editor de rutinas: datos generales, días con sus ejercicios (series, repeticiones, carga,
 * descanso) y, al crear, asignación directa a socios. Sirve para crear, editar y reemplazar.
 */
@Component({
  selector: 'app-editor-rutina',
  standalone: true,
  imports: [BotonComponent, InputFechaComponent, PopupComponent, SelectComponent],
  templateUrl: './editor-rutina.component.html',
  styleUrl: './editor-rutina.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditorRutinaComponent {
  private readonly api = inject(EntrenamientoApiService);
  private readonly actividadesApi = inject(ActividadesApiService);

  readonly abierto = input(false);
  readonly modo = input<ModoEditorRutina>('crear');
  readonly rutina = input<RutinaDetalleDto | null>(null);
  readonly guardada = output<RutinaDetalleDto>();
  readonly cerrar = output<void>();

  protected readonly borrador = signal<Borrador>(this.nuevo());
  protected readonly opcionesEjercicios = signal<readonly SelectOption[]>([]);
  protected readonly opcionesActividades = signal<readonly SelectOption[]>([]);
  protected readonly alumnos = signal<readonly AlumnoAsignableDto[]>([]);
  protected readonly elegidos = signal<ReadonlySet<string>>(new Set());
  protected readonly busquedaAlumno = signal('');
  protected readonly guardando = signal(false);
  protected readonly error = signal('');

  protected readonly titulo = computed(() =>
    this.modo() === 'crear' ? 'Nueva rutina' : this.modo() === 'editar' ? 'Editar rutina' : 'Reemplazar rutina',
  );
  protected readonly descripcion = computed(() =>
    this.modo() === 'reemplazar'
      ? 'Se crea una versión nueva. Los socios que tienen la actual pasan a esta y la anterior queda en el historial.'
      : 'Organizá los días y elegí los ejercicios de la biblioteca.',
  );
  protected readonly alumnosFiltrados = computed(() => {
    const texto = this.busquedaAlumno().trim().toLowerCase();
    return this.alumnos().filter(
      (a) => !texto || `${a.nombre ?? ''} ${a.apellido ?? ''} ${a.dni ?? ''}`.toLowerCase().includes(texto),
    );
  });
  protected readonly totalEjercicios = computed(() => this.borrador().dias.reduce((total, dia) => total + dia.items.length, 0));

  constructor() {
    // * Cada vez que se abre arranca desde la rutina recibida (o vacío) y refresca las opciones
    effect(() => {
      if (!this.abierto()) return;
      const rutina = this.rutina();
      untracked(() => {
        this.borrador.set(rutina ? this.desde(rutina) : this.nuevo());
        this.elegidos.set(new Set());
        this.busquedaAlumno.set('');
        this.error.set('');
        this.cargarOpciones();
      });
    });
  }

  protected cambiar(campo: CampoGeneral, valor: string): void {
    this.borrador.update((b) => ({ ...b, [campo]: valor ?? '' }));
  }

  protected agregarDia(): void {
    this.borrador.update((b) => ({ ...b, dias: [...b.dias, diaVacio(b.dias.length + 1)] }));
  }

  protected quitarDia(indice: number): void {
    this.borrador.update((b) => ({ ...b, dias: b.dias.filter((_, i) => i !== indice) }));
  }

  protected renombrarDia(indice: number, nombre: string): void {
    this.actualizarDia(indice, (dia) => ({ ...dia, nombre }));
  }

  protected agregarItem(indiceDia: number): void {
    this.actualizarDia(indiceDia, (dia) => ({ ...dia, items: [...dia.items, itemVacio()] }));
  }

  protected quitarItem(indiceDia: number, indiceItem: number): void {
    this.actualizarDia(indiceDia, (dia) => ({ ...dia, items: dia.items.filter((_, i) => i !== indiceItem) }));
  }

  protected moverItem(indiceDia: number, indiceItem: number, delta: -1 | 1): void {
    this.actualizarDia(indiceDia, (dia) => {
      const destino = indiceItem + delta;
      if (destino < 0 || destino >= dia.items.length) return dia;
      const items = [...dia.items];
      [items[indiceItem], items[destino]] = [items[destino], items[indiceItem]];
      return { ...dia, items };
    });
  }

  protected cambiarItem(indiceDia: number, indiceItem: number, campo: CampoItem, valor: string): void {
    this.actualizarDia(indiceDia, (dia) => ({
      ...dia,
      items: dia.items.map((item, i) => (i === indiceItem ? { ...item, [campo]: valor ?? '' } : item)),
    }));
  }

  protected alternarAlumno(memberUuid: string): void {
    this.elegidos.update((actual) => {
      const nuevo = new Set(actual);
      if (nuevo.has(memberUuid)) nuevo.delete(memberUuid);
      else nuevo.add(memberUuid);
      return nuevo;
    });
  }

  protected guardar(): void {
    const payload = this.armar();
    if (typeof payload === 'string') {
      this.error.set(payload);
      return;
    }
    this.error.set('');
    this.guardando.set(true);
    const rutina = this.rutina();
    const pedido =
      this.modo() === 'editar' && rutina
        ? this.api.editarRutina(rutina.uuid, payload)
        : this.modo() === 'reemplazar' && rutina
          ? this.api.reemplazarRutina(rutina.uuid, payload)
          : this.api.crearRutina(payload);
    pedido.pipe(finalize(() => this.guardando.set(false))).subscribe({
      next: (resultado) => this.guardada.emit(resultado),
      error: () => this.error.set('No se pudo guardar la rutina. Revisá los datos e intentá de nuevo.'),
    });
  }

  /** Arma el payload o devuelve el primer error para mostrar. */
  private armar(): RutinaPayload | string {
    const b = this.borrador();
    if (!b.nombre.trim()) return 'Poné un nombre a la rutina.';
    if (!b.dias.length) return 'Agregá al menos un día.';
    if (b.fechaInicio && b.fechaFin && b.fechaFin < b.fechaInicio) return 'La fecha de finalización es anterior al inicio.';
    for (const dia of b.dias) {
      if (!dia.nombre.trim()) return 'Cada día necesita un nombre.';
      if (!dia.items.length) return `"${dia.nombre}" no tiene ejercicios.`;
      if (dia.items.some((item) => !item.ejercicioUuid)) return `En "${dia.nombre}" hay una fila sin ejercicio elegido.`;
      for (const item of dia.items) {
        const series = aNumero(item.series);
        if (item.series && (series === null || series < 1 || series > 50)) return 'Las series van de 1 a 50.';
        const descanso = aNumero(item.descanso);
        if (item.descanso && (descanso === null || descanso < 0 || descanso > 3600)) return 'El descanso va de 0 a 3600 segundos.';
      }
    }
    return {
      nombre: b.nombre.trim(),
      objetivo: b.objetivo.trim() || null,
      disciplina: b.disciplina.trim() || null,
      actividadUuid: b.actividadUuid || null,
      fechaInicio: b.fechaInicio || null,
      fechaFin: b.fechaFin || null,
      observaciones: b.observaciones.trim() || null,
      dias: b.dias.map((dia) => ({
        nombre: dia.nombre.trim(),
        items: dia.items.map((item) => ({
          ejercicioUuid: item.ejercicioUuid,
          series: aNumero(item.series),
          repeticiones: item.repeticiones.trim() || null,
          carga: item.carga.trim() || null,
          descansoSegundos: aNumero(item.descanso),
          observaciones: item.observaciones.trim() || null,
        })),
      })),
      memberUuids: this.modo() === 'crear' ? [...this.elegidos()] : undefined,
    };
  }

  private actualizarDia(indice: number, cambio: (dia: DiaEditable) => DiaEditable): void {
    this.borrador.update((b) => ({ ...b, dias: b.dias.map((dia, i) => (i === indice ? cambio(dia) : dia)) }));
  }

  private nuevo(): Borrador {
    return {
      nombre: '',
      objetivo: '',
      disciplina: '',
      actividadUuid: '',
      fechaInicio: '',
      fechaFin: '',
      observaciones: '',
      dias: [diaVacio(1)],
    };
  }

  private desde(r: RutinaDetalleDto): Borrador {
    return {
      nombre: r.nombre,
      objetivo: r.objetivo ?? '',
      disciplina: r.disciplina ?? '',
      actividadUuid: r.actividadUuid ?? '',
      fechaInicio: r.fechaInicio?.slice(0, 10) ?? '',
      fechaFin: r.fechaFin?.slice(0, 10) ?? '',
      observaciones: r.observaciones ?? '',
      dias: r.dias.map((dia) => ({
        clave: nuevaClave(),
        nombre: dia.nombre,
        items: dia.items.map((item) => ({
          clave: nuevaClave(),
          ejercicioUuid: item.ejercicio.uuid,
          series: item.series?.toString() ?? '',
          repeticiones: item.repeticiones ?? '',
          carga: item.carga ?? '',
          descanso: item.descansoSegundos?.toString() ?? '',
          observaciones: item.observaciones ?? '',
        })),
      })),
    };
  }

  private cargarOpciones(): void {
    this.api.listarEjercicios({ size: 100 }).subscribe({
      next: (pagina) => {
        const opciones: SelectOption[] = pagina.content.map((e) => ({
          value: e.uuid,
          label: e.grupoMuscular ? `${e.nombre} · ${e.grupoMuscular}` : e.nombre,
        }));
        // * Una rutina vieja puede usar un ejercicio ya dado de baja: se conserva como opción
        const usados = this.rutina()?.dias.flatMap((dia) => dia.items.map((item) => item.ejercicio)) ?? [];
        for (const ejercicio of usados) {
          if (!opciones.some((o) => o.value === ejercicio.uuid)) opciones.push({ value: ejercicio.uuid, label: ejercicio.nombre });
        }
        this.opcionesEjercicios.set([{ value: '', label: 'Elegí un ejercicio' }, ...opciones]);
      },
    });
    this.actividadesApi.paginar({ page: 1, size: 100, search: '', completa: null }).subscribe({
      next: (pagina) =>
        this.opcionesActividades.set([
          { value: '', label: 'Sin actividad' },
          ...pagina.content.map((a) => ({ value: a.actividadUuid, label: a.nombre })),
        ]),
    });
    if (this.modo() === 'crear') {
      this.api.alumnos().subscribe({ next: (alumnos) => this.alumnos.set(alumnos) });
    }
  }
}

function aNumero(valor: string): number | null {
  if (valor === null || valor === undefined || `${valor}`.trim() === '') return null;
  const n = Number(valor);
  return Number.isFinite(n) ? Math.round(n) : null;
}
