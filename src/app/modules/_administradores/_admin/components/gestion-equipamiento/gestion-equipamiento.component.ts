import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription, finalize } from 'rxjs';

import {
  AlertaMantenimiento,
  EquipamientoDetalleDto,
  EquipamientoPayload,
  EstadoEquipamiento,
  FilaEquipamientoDto,
  MantenimientoDto,
  MantenimientoPayload,
  ResumenEquipamientoDto,
  TipoMantenimiento,
} from '../../../../../core/api/interfaces/equipamiento.interfaces';
import { EquipamientoApiService } from '../../../../../core/api/services/equipamiento-api.service';
import { formatearMoneda } from '../../../../../helpers/moneda-formato';
import {
  formatearFechaAsistencia,
  isoFecha,
} from '../../../../_compartido-perfiles/components/seguimiento-asistencia/seguimiento-asistencia.helpers';
import { BotonComponent } from '../../../../ui/boton/boton.component';
import { InputFechaComponent } from '../../../../ui/input-fecha/input-fecha.component';
import { PaginacionComponent } from '../../../../ui/paginacion/paginacion.component';
import { PopupComponent } from '../../../../ui/popup/popup.component';
import { SelectComponent, SelectOption } from '../../../../ui/select/select.component';
import {
  AccionTabla,
  ColumnaTabla,
  EventoAccionTabla,
  TablaResponsiveComponent,
} from '../../../../ui/tabla-responsive/tabla-responsive.component';
import { ToastAlertService } from '../../../../ui/toast-alert/services/toast-alert.service';

export const ESTADOS_EQUIPAMIENTO: readonly { readonly id: EstadoEquipamiento; readonly etiqueta: string }[] = [
  { id: 'NUEVO', etiqueta: 'Nuevo' },
  { id: 'BUENO', etiqueta: 'Bueno' },
  { id: 'REGULAR', etiqueta: 'Regular' },
  { id: 'EN_REPARACION', etiqueta: 'En reparación' },
  { id: 'FUERA_DE_SERVICIO', etiqueta: 'Fuera de servicio' },
  { id: 'BAJA', etiqueta: 'Dado de baja' },
];
export const TIPOS_MANTENIMIENTO: readonly { readonly id: TipoMantenimiento; readonly etiqueta: string }[] = [
  { id: 'PREVENTIVO', etiqueta: 'Mantenimiento preventivo' },
  { id: 'REPARACION', etiqueta: 'Reparación' },
  { id: 'REVISION', etiqueta: 'Revisión' },
];

export function textoEstadoEquipamiento(estado: EstadoEquipamiento): string {
  return ESTADOS_EQUIPAMIENTO.find((e) => e.id === estado)?.etiqueta ?? estado;
}

type FilaTabla = FilaEquipamientoDto & {
  readonly estadoTexto: string;
  readonly mantenimientoTexto: string;
  readonly costoTexto: string;
};

interface BorradorEquipo {
  readonly nombre: string;
  readonly codigo: string;
  readonly tipo: string;
  readonly disciplina: string;
  readonly marca: string;
  readonly modelo: string;
  readonly cantidad: string;
  readonly estado: EstadoEquipamiento;
  readonly ubicacion: string;
  readonly fechaAdquisicion: string;
  readonly observaciones: string;
}

interface BorradorMantenimiento {
  readonly tipo: TipoMantenimiento;
  readonly fecha: string;
  readonly responsable: string;
  readonly descripcion: string;
  readonly costo: string;
  readonly proximoMantenimiento: string;
  readonly estadoResultante: EstadoEquipamiento | '';
  readonly registrarEgreso: boolean;
}

/**
 * Equipamiento e infraestructura: inventario (pelotas, redes, máquinas, herramientas…) con estado y
 * ubicación, e historial de mantenimientos, reparaciones y revisiones. El costo de un mantenimiento
 * puede registrarse en el mismo paso como egreso de Cobros. Solo ADMIN.
 */
@Component({
  selector: 'app-gestion-equipamiento',
  standalone: true,
  imports: [BotonComponent, InputFechaComponent, PaginacionComponent, PopupComponent, SelectComponent, TablaResponsiveComponent],
  templateUrl: './gestion-equipamiento.component.html',
  styleUrl: './gestion-equipamiento.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GestionEquipamientoComponent {
  private readonly api = inject(EquipamientoApiService);
  private readonly toast = inject(ToastAlertService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly busqueda = signal('');
  protected readonly estado = signal<EstadoEquipamiento | ''>('');
  protected readonly alerta = signal<AlertaMantenimiento | ''>('');
  protected readonly pagina = signal(1);
  protected readonly filasDatos = signal<readonly FilaEquipamientoDto[]>([]);
  protected readonly total = signal(0);
  protected readonly totalPaginas = signal(1);
  protected readonly cargando = signal(false);
  protected readonly resumen = signal<ResumenEquipamientoDto | null>(null);

  protected readonly detalle = signal<EquipamientoDetalleDto | null>(null);
  protected readonly cargandoDetalle = signal(false);

  protected readonly formularioAbierto = signal(false);
  protected readonly editandoUuid = signal<string | null>(null);
  protected readonly borrador = signal<BorradorEquipo>(this.equipoVacio());
  protected readonly guardando = signal(false);
  protected readonly error = signal('');

  protected readonly mantenimientoAbierto = signal(false);
  protected readonly borradorMantenimiento = signal<BorradorMantenimiento>(this.mantenimientoVacio());
  protected readonly errorMantenimiento = signal('');

  protected readonly opcionesEstadoFiltro: readonly SelectOption[] = [
    { value: '', label: 'Todos (sin bajas)' },
    ...ESTADOS_EQUIPAMIENTO.map((e) => ({ value: e.id, label: e.etiqueta })),
  ];
  protected readonly opcionesAlerta: readonly SelectOption[] = [
    { value: '', label: 'Todos' },
    { value: 'VENCIDO', label: 'Mantenimiento vencido' },
    { value: 'PROXIMO', label: 'Mantenimiento en 30 días' },
  ];
  protected readonly opcionesEstado: readonly SelectOption[] = ESTADOS_EQUIPAMIENTO.map((e) => ({ value: e.id, label: e.etiqueta }));
  protected readonly opcionesEstadoResultante: readonly SelectOption[] = [
    { value: '', label: 'Sin cambios' },
    ...ESTADOS_EQUIPAMIENTO.filter((e) => e.id !== 'BAJA').map((e) => ({ value: e.id, label: e.etiqueta })),
  ];
  protected readonly opcionesTipoMantenimiento: readonly SelectOption[] = TIPOS_MANTENIMIENTO.map((t) => ({ value: t.id, label: t.etiqueta }));

  protected readonly filas = computed((): readonly FilaTabla[] =>
    this.filasDatos().map((f) => ({
      ...f,
      estadoTexto: textoEstadoEquipamiento(f.estado),
      mantenimientoTexto: f.proximoMantenimiento
        ? `${formatearFechaAsistencia(f.proximoMantenimiento)}${f.alerta === 'VENCIDO' ? ' · vencido' : f.alerta === 'PROXIMO' ? ' · pronto' : ''}`
        : '—',
      costoTexto: f.costoMantenimientos ? formatearMoneda(f.costoMantenimientos) : '—',
    })),
  );
  protected readonly columnas: readonly ColumnaTabla<FilaTabla>[] = [
    { id: 'nombre', titulo: 'Equipamiento', ancho: 'minmax(11rem, 1.4fr)', prioridadMobile: true },
    { id: 'codigo', titulo: 'Código', ancho: '7rem' },
    { id: 'disciplina', titulo: 'Disciplina', ancho: 'minmax(6rem, .8fr)' },
    { id: 'cantidad', titulo: 'Cant.', tipo: 'numero', ancho: '4.5rem' },
    { id: 'ubicacion', titulo: 'Ubicación', ancho: 'minmax(7rem, 1fr)' },
    { id: 'estadoTexto', titulo: 'Estado', ancho: '8.5rem', prioridadMobile: true },
    { id: 'mantenimientoTexto', titulo: 'Próx. mantenimiento', ancho: '10rem' },
    { id: 'costoTexto', titulo: 'Costo mant.', ancho: '7.5rem' },
  ];
  protected readonly acciones: readonly AccionTabla<FilaTabla>[] = [{ predefinida: 'ver' }];

  protected readonly fecha = formatearFechaAsistencia;
  protected readonly moneda = formatearMoneda;
  protected readonly estadoTexto = textoEstadoEquipamiento;
  protected readonly hoy = isoFecha(new Date());

  private consulta?: Subscription;
  private temporizador?: ReturnType<typeof setTimeout>;

  constructor() {
    queueMicrotask(() => this.consultar());
    this.destroyRef.onDestroy(() => clearTimeout(this.temporizador));
  }

  protected textoTipo(tipo: TipoMantenimiento): string {
    return TIPOS_MANTENIMIENTO.find((t) => t.id === tipo)?.etiqueta ?? tipo;
  }

  // ------------------------------------------------------------ Listado

  protected buscar(valor: string): void {
    this.busqueda.set(valor);
    clearTimeout(this.temporizador);
    this.temporizador = setTimeout(() => this.aplicar(), 350);
  }

  protected filtrar(campo: 'estado' | 'alerta', valor: string): void {
    const actual = campo === 'estado' ? this.estado() : this.alerta();
    if ((valor ?? '') === actual) return;
    if (campo === 'estado') this.estado.set(valor as EstadoEquipamiento | '');
    else this.alerta.set(valor as AlertaMantenimiento | '');
    this.aplicar();
  }

  protected verAlerta(alerta: AlertaMantenimiento): void {
    this.alerta.set(alerta);
    this.estado.set('');
    this.aplicar();
  }

  protected cambiarPagina(pagina: number): void {
    this.pagina.set(pagina);
    this.consultar();
  }

  protected manejarAccion({ accion, fila }: EventoAccionTabla<FilaTabla>): void {
    if (accion === 'ver') this.abrirDetalle(fila.uuid);
  }

  protected abrirDetalle(uuid: string): void {
    this.detalle.set(null);
    this.cargandoDetalle.set(true);
    this.api
      .obtener(uuid)
      .pipe(finalize(() => this.cargandoDetalle.set(false)))
      .subscribe({ next: (detalle) => this.detalle.set(detalle) });
  }

  protected cerrarDetalle(): void {
    this.detalle.set(null);
    this.consultar();
  }

  // ------------------------------------------------------------ Alta y edición

  protected nuevo(): void {
    this.editandoUuid.set(null);
    this.borrador.set(this.equipoVacio());
    this.error.set('');
    this.formularioAbierto.set(true);
  }

  protected editar(): void {
    const d = this.detalle();
    if (!d) return;
    this.editandoUuid.set(d.uuid);
    this.borrador.set({
      nombre: d.nombre,
      codigo: d.codigo ?? '',
      tipo: d.tipo ?? '',
      disciplina: d.disciplina ?? '',
      marca: d.marca ?? '',
      modelo: d.modelo ?? '',
      cantidad: `${d.cantidad}`,
      estado: d.estado,
      ubicacion: d.ubicacion ?? '',
      fechaAdquisicion: d.fechaAdquisicion?.slice(0, 10) ?? '',
      observaciones: d.observaciones ?? '',
    });
    this.error.set('');
    this.formularioAbierto.set(true);
  }

  protected cambiar(campo: keyof BorradorEquipo, valor: string): void {
    this.borrador.update((b) => ({ ...b, [campo]: valor ?? '' }));
  }

  protected guardar(): void {
    const b = this.borrador();
    const cantidad = Number(b.cantidad);
    if (!b.nombre.trim()) return this.error.set('El nombre es obligatorio.');
    if (!Number.isInteger(cantidad) || cantidad < 0) return this.error.set('La cantidad tiene que ser un número entero.');
    if (b.fechaAdquisicion && b.fechaAdquisicion > this.hoy) return this.error.set('La fecha de adquisición no puede ser futura.');
    const payload: EquipamientoPayload = {
      nombre: b.nombre.trim(),
      codigo: b.codigo.trim() || null,
      tipo: b.tipo.trim() || null,
      disciplina: b.disciplina.trim() || null,
      marca: b.marca.trim() || null,
      modelo: b.modelo.trim() || null,
      cantidad,
      estado: b.estado,
      ubicacion: b.ubicacion.trim() || null,
      fechaAdquisicion: b.fechaAdquisicion || null,
      observaciones: b.observaciones.trim() || null,
    };
    this.guardando.set(true);
    const uuid = this.editandoUuid();
    (uuid ? this.api.editar(uuid, payload) : this.api.crear(payload))
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: (detalle) => {
          this.formularioAbierto.set(false);
          this.detalle.set(detalle);
          this.consultar();
        },
        error: () => this.error.set('No se pudo guardar. Revisá los datos (el código no puede repetirse).'),
      });
  }

  protected async eliminar(): Promise<void> {
    const d = this.detalle();
    if (!d) return;
    const confirmado = await this.toast.confirmDanger(
      `¿Eliminar "${d.nombre}"? Usalo solo si se cargó por error; para un equipo que ya no se usa, cambiá el estado a "Dado de baja".`,
      { titulo: 'Eliminar equipamiento' },
    );
    if (!confirmado) return;
    this.api.eliminar(d.uuid).subscribe({ next: () => this.cerrarDetalle() });
  }

  // ------------------------------------------------------------ Mantenimientos

  protected nuevoMantenimiento(): void {
    this.borradorMantenimiento.set(this.mantenimientoVacio());
    this.errorMantenimiento.set('');
    this.mantenimientoAbierto.set(true);
  }

  protected cambiarMantenimiento(campo: keyof BorradorMantenimiento, valor: string | boolean): void {
    this.borradorMantenimiento.update((b) => ({ ...b, [campo]: valor ?? '' }));
  }

  protected guardarMantenimiento(): void {
    const d = this.detalle();
    const b = this.borradorMantenimiento();
    if (!d) return;
    const costo = b.costo.trim() === '' ? null : Number(b.costo.replace(',', '.'));
    if (!b.descripcion.trim()) return this.errorMantenimiento.set('Describí qué se hizo.');
    if (!b.fecha || b.fecha > this.hoy) return this.errorMantenimiento.set('La fecha no puede ser futura; para planificar usá "Próximo mantenimiento".');
    if (b.proximoMantenimiento && b.proximoMantenimiento <= b.fecha) return this.errorMantenimiento.set('El próximo mantenimiento tiene que ser posterior.');
    if (costo !== null && (!Number.isFinite(costo) || costo < 0)) return this.errorMantenimiento.set('El costo no es válido.');
    if (b.registrarEgreso && !costo) return this.errorMantenimiento.set('Para registrar el egreso cargá el costo.');
    const payload: MantenimientoPayload = {
      tipo: b.tipo,
      fecha: b.fecha,
      responsable: b.responsable.trim() || null,
      descripcion: b.descripcion.trim(),
      costo,
      proximoMantenimiento: b.proximoMantenimiento || null,
      estadoResultante: b.estadoResultante || null,
      registrarEgreso: b.registrarEgreso,
    };
    this.guardando.set(true);
    this.api
      .registrarMantenimiento(d.uuid, payload)
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: (detalle) => {
          this.detalle.set(detalle);
          this.mantenimientoAbierto.set(false);
        },
        error: () => this.errorMantenimiento.set('No se pudo registrar el mantenimiento.'),
      });
  }

  protected async eliminarMantenimiento(m: MantenimientoDto): Promise<void> {
    const confirmado = await this.toast.confirmDanger(`¿Eliminar el registro del ${formatearFechaAsistencia(m.fecha)}?`, {
      titulo: 'Eliminar mantenimiento',
    });
    if (!confirmado) return;
    this.api.eliminarMantenimiento(m.uuid).subscribe({ next: (detalle) => this.detalle.set(detalle) });
  }

  // ------------------------------------------------------------ Apoyo

  private aplicar(): void {
    this.pagina.set(1);
    this.consultar();
  }

  private consultar(): void {
    this.consulta?.unsubscribe();
    this.cargando.set(true);
    this.consulta = this.api
      .listar({
        search: this.busqueda().trim() || undefined,
        estado: this.estado() || null,
        alerta: this.alerta() || null,
        page: this.pagina(),
        size: 20,
      })
      .pipe(
        finalize(() => this.cargando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (pagina) => {
          this.filasDatos.set(pagina.content);
          this.total.set(pagina.totalElements);
          this.totalPaginas.set(Math.max(1, pagina.totalPages));
        },
      });
    this.api.resumen().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: (r) => this.resumen.set(r) });
  }

  private equipoVacio(): BorradorEquipo {
    return {
      nombre: '',
      codigo: '',
      tipo: '',
      disciplina: '',
      marca: '',
      modelo: '',
      cantidad: '1',
      estado: 'NUEVO',
      ubicacion: '',
      fechaAdquisicion: '',
      observaciones: '',
    };
  }

  private mantenimientoVacio(): BorradorMantenimiento {
    return {
      tipo: 'PREVENTIVO',
      fecha: isoFecha(new Date()),
      responsable: '',
      descripcion: '',
      costo: '',
      proximoMantenimiento: '',
      estadoResultante: '',
      registrarEgreso: false,
    };
  }
}
