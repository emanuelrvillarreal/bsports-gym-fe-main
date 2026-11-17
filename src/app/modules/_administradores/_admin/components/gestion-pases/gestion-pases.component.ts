import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';

import {
  CategoriaPase,
  DiaSemana,
  ModalidadPase,
  PaseDto,
  PasePayload,
  ReferenciaDto,
} from '../../../../../core/api/interfaces/membresias.interfaces';
import { ActividadesApiService } from '../../../../../core/api/services/actividades-api.service';
import { AmenitiesApiService } from '../../../../../core/api/services/amenities-api.service';
import { DescuentosApiService } from '../../../../../core/api/services/descuentos-api.service';
import { MembresiasApiService } from '../../../../../core/api/services/membresias-api.service';
import {
  CATEGORIAS,
  DIAS,
  MODALIDADES,
  precioPase,
  resumenPase,
  textoCategoria,
} from '../../../../_compartido-perfiles/components/membresias/membresias.helpers';
import { formatearFechaAsistencia } from '../../../../_compartido-perfiles/components/seguimiento-asistencia/seguimiento-asistencia.helpers';
import { BotonComponent } from '../../../../ui/boton/boton.component';
import { InputFechaComponent } from '../../../../ui/input-fecha/input-fecha.component';
import { PopupComponent } from '../../../../ui/popup/popup.component';
import { SelectComponent, SelectOption } from '../../../../ui/select/select.component';
import { ToastAlertService } from '../../../../ui/toast-alert/services/toast-alert.service';

interface Borrador {
  readonly nombre: string;
  readonly descripcion: string;
  readonly categoria: CategoriaPase;
  readonly modalidad: ModalidadPase;
  readonly duracionDias: string;
  readonly precio: string;
  readonly limitarIngresos: boolean;
  readonly cantidadIngresos: string;
  readonly dias: ReadonlySet<DiaSemana>;
  readonly horaDesde: string;
  readonly horaHasta: string;
  readonly renovacionAutomatica: boolean;
  readonly congelamientoExtiende: boolean;
  readonly incluyeCuotaActividades: boolean;
  readonly familiar: boolean;
  readonly maxIntegrantes: string;
  readonly ventaPortal: boolean;
  readonly ventaDesde: string;
  readonly ventaHasta: string;
  readonly restricciones: string;
  readonly activo: boolean;
  readonly actividades: ReadonlySet<string>;
  readonly amenities: ReadonlySet<string>;
  readonly descuentos: ReadonlySet<string>;
}

/**
 * Oferta de pases del club (pase libre mensual, diario, por ingresos, por actividad, por horario, familiar…)
 * y la regla del QR: exigir o no un pase vigente para ingresar. Solo ADMIN.
 */
@Component({
  selector: 'app-gestion-pases',
  standalone: true,
  imports: [BotonComponent, InputFechaComponent, PopupComponent, SelectComponent],
  templateUrl: './gestion-pases.component.html',
  styleUrl: './gestion-pases.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GestionPasesComponent {
  private readonly api = inject(MembresiasApiService);
  private readonly actividadesApi = inject(ActividadesApiService);
  private readonly amenitiesApi = inject(AmenitiesApiService);
  private readonly descuentosApi = inject(DescuentosApiService);
  private readonly toast = inject(ToastAlertService);

  protected readonly pases = signal<readonly PaseDto[]>([]);
  protected readonly cargando = signal(true);
  protected readonly exigirPase = signal(false);
  protected readonly guardandoConfig = signal(false);

  protected readonly formularioAbierto = signal(false);
  protected readonly editandoUuid = signal<string | null>(null);
  protected readonly borrador = signal<Borrador>(this.vacio());
  protected readonly guardando = signal(false);
  protected readonly error = signal('');

  protected readonly actividades = signal<readonly ReferenciaDto[]>([]);
  protected readonly amenities = signal<readonly ReferenciaDto[]>([]);
  protected readonly descuentos = signal<readonly ReferenciaDto[]>([]);

  protected readonly opcionesCategoria: readonly SelectOption[] = CATEGORIAS.map((c) => ({ value: c.id, label: c.etiqueta }));
  protected readonly opcionesModalidad: readonly SelectOption[] = MODALIDADES.map((m) => ({ value: m.id, label: m.etiqueta }));
  protected readonly dias = DIAS;
  protected readonly resumen = resumenPase;
  protected readonly precio = precioPase;
  protected readonly categoria = textoCategoria;
  protected readonly fecha = formatearFechaAsistencia;

  protected readonly requiereDias = computed(() => {
    const m = this.borrador().modalidad;
    return m === 'POR_INGRESOS' || m === 'PERSONALIZADO';
  });
  protected readonly activos = computed(() => this.pases().filter((p) => p.activo).length);

  constructor() {
    queueMicrotask(() => this.cargar());
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.api
      .pases()
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({ next: (p) => this.pases.set(p) });
    this.api.config().subscribe({ next: (c) => this.exigirPase.set(c.exigirPaseParaIngresar) });
  }

  protected cambiarExigir(valor: boolean): void {
    if (valor === this.exigirPase()) return;
    this.guardandoConfig.set(true);
    this.api
      .guardarConfig({ exigirPaseParaIngresar: valor })
      .pipe(finalize(() => this.guardandoConfig.set(false)))
      .subscribe({
        next: (c) => this.exigirPase.set(c.exigirPaseParaIngresar),
        error: () => this.exigirPase.set(!valor),
      });
  }

  // ------------------------------------------------------------ Formulario

  protected nuevo(): void {
    this.editandoUuid.set(null);
    this.borrador.set(this.vacio());
    this.abrirFormulario();
  }

  protected editar(p: PaseDto): void {
    this.editandoUuid.set(p.uuid);
    this.borrador.set({
      nombre: p.nombre,
      descripcion: p.descripcion ?? '',
      categoria: p.categoria,
      modalidad: p.modalidad,
      duracionDias: p.duracionDias ? `${p.duracionDias}` : '',
      precio: `${p.precio}`,
      limitarIngresos: p.cantidadIngresos !== null,
      cantidadIngresos: p.cantidadIngresos ? `${p.cantidadIngresos}` : '',
      dias: new Set(p.diasPermitidos),
      horaDesde: p.horaDesde ?? '',
      horaHasta: p.horaHasta ?? '',
      renovacionAutomatica: p.renovacionAutomatica,
      congelamientoExtiende: p.congelamientoExtiende,
      incluyeCuotaActividades: p.incluyeCuotaActividades,
      familiar: p.familiar,
      maxIntegrantes: p.maxIntegrantes ? `${p.maxIntegrantes}` : '',
      ventaPortal: p.ventaPortal,
      ventaDesde: p.ventaDesde ?? '',
      ventaHasta: p.ventaHasta ?? '',
      restricciones: p.restricciones ?? '',
      activo: p.activo,
      actividades: new Set(p.actividades.map((a) => a.uuid)),
      amenities: new Set(p.amenities.map((a) => a.uuid)),
      descuentos: new Set(p.descuentos.map((d) => d.uuid)),
    });
    this.abrirFormulario();
  }

  protected cambiar<K extends keyof Borrador>(campo: K, valor: Borrador[K]): void {
    this.borrador.update((b) => {
      const nuevo = { ...b, [campo]: valor };
      // Por ingresos implica limitar ingresos.
      if (campo === 'modalidad' && valor === 'POR_INGRESOS') return { ...nuevo, limitarIngresos: true };
      if (campo === 'categoria' && valor === 'FAMILIAR') return { ...nuevo, familiar: true, maxIntegrantes: b.maxIntegrantes || '4' };
      return nuevo;
    });
  }

  protected alternar(campo: 'dias' | 'actividades' | 'amenities' | 'descuentos', id: string, marcado: boolean): void {
    this.borrador.update((b) => {
      const conjunto = new Set<string>(b[campo] as ReadonlySet<string>);
      if (marcado) conjunto.add(id);
      else conjunto.delete(id);
      return { ...b, [campo]: conjunto };
    });
  }

  protected guardar(): void {
    const b = this.borrador();
    const precio = Number(b.precio.replace(',', '.'));
    const duracion = Number(b.duracionDias);
    const ingresos = Number(b.cantidadIngresos);
    const integrantes = Number(b.maxIntegrantes);
    if (!b.nombre.trim()) return this.error.set('El nombre es obligatorio.');
    if (b.precio.trim() === '' || !Number.isFinite(precio) || precio < 0) return this.error.set('El precio no es válido.');
    if (this.requiereDias() && (!Number.isInteger(duracion) || duracion < 1)) return this.error.set('Indicá cuántos días dura el pase.');
    if ((b.limitarIngresos || b.modalidad === 'POR_INGRESOS') && (!Number.isInteger(ingresos) || ingresos < 1)) {
      return this.error.set('Indicá la cantidad de ingresos.');
    }
    if (!!b.horaDesde !== !!b.horaHasta) return this.error.set('Completá el horario desde y hasta, o dejá los dos vacíos.');
    if (b.horaDesde && b.horaDesde === b.horaHasta) return this.error.set('El horario desde y hasta no pueden ser iguales.');
    if (b.familiar && (!Number.isInteger(integrantes) || integrantes < 2)) return this.error.set('Un pase familiar cubre al menos 2 personas.');
    if (b.ventaDesde && b.ventaHasta && b.ventaHasta < b.ventaDesde) return this.error.set('El fin de la venta no puede ser anterior al inicio.');
    const payload: PasePayload = {
      nombre: b.nombre.trim(),
      descripcion: b.descripcion.trim() || null,
      categoria: b.categoria,
      modalidad: b.modalidad,
      duracionDias: this.requiereDias() ? duracion : null,
      precio,
      cantidadIngresos: b.limitarIngresos || b.modalidad === 'POR_INGRESOS' ? ingresos : null,
      diasPermitidos: DIAS.filter((d) => b.dias.has(d.id)).map((d) => d.id),
      horaDesde: b.horaDesde || null,
      horaHasta: b.horaHasta || null,
      renovacionAutomatica: b.renovacionAutomatica,
      congelamientoExtiende: b.congelamientoExtiende,
      incluyeCuotaActividades: b.incluyeCuotaActividades,
      familiar: b.familiar,
      maxIntegrantes: b.familiar ? integrantes : null,
      ventaPortal: b.ventaPortal,
      ventaDesde: b.ventaDesde || null,
      ventaHasta: b.ventaHasta || null,
      restricciones: b.restricciones.trim() || null,
      activo: b.activo,
      actividadesUuids: [...b.actividades],
      amenitiesUuids: [...b.amenities],
      descuentosUuids: [...b.descuentos],
    };
    const uuid = this.editandoUuid();
    this.guardando.set(true);
    (uuid ? this.api.editarPase(uuid, payload) : this.api.crearPase(payload))
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: () => {
          this.formularioAbierto.set(false);
          this.cargar();
        },
        error: () => this.error.set('No se pudo guardar. Revisá el mensaje del aviso.'),
      });
  }

  protected async eliminar(p: PaseDto): Promise<void> {
    const confirmado = await this.toast.confirmDanger(
      `¿Eliminar "${p.nombre}"? Solo se puede si nunca se vendió; si ya tiene membresías, desactivalo para que no se venda más.`,
      { titulo: 'Eliminar pase' },
    );
    if (confirmado) this.api.eliminarPase(p.uuid).subscribe({ next: () => this.cargar() });
  }

  private abrirFormulario(): void {
    this.error.set('');
    this.formularioAbierto.set(true);
    this.cargarCatalogos();
  }

  private cargarCatalogos(): void {
    if (!this.actividades().length) {
      this.actividadesApi.paginar({ page: 1, size: 200, search: '', completa: null }).subscribe({
        next: (r) => this.actividades.set(r.content.map((a) => ({ uuid: a.actividadUuid, nombre: a.nombre }))),
      });
    }
    if (!this.amenities().length) {
      this.amenitiesApi.listar().subscribe({
        next: (r) => this.amenities.set(r.map((a) => ({ uuid: a.amenityUuid, nombre: a.nombre }))),
      });
    }
    if (!this.descuentos().length) {
      this.descuentosApi.paginarCatalogo({ page: 1, size: 200, search: '' }).subscribe({
        next: (r) => this.descuentos.set(r.content.map((d) => ({ uuid: d.descuentoUuid, nombre: d.titulo }))),
      });
    }
  }

  private vacio(): Borrador {
    return {
      nombre: '',
      descripcion: '',
      categoria: 'GENERAL',
      modalidad: 'MENSUAL',
      duracionDias: '',
      precio: '',
      limitarIngresos: false,
      cantidadIngresos: '',
      dias: new Set(),
      horaDesde: '',
      horaHasta: '',
      renovacionAutomatica: false,
      congelamientoExtiende: true,
      incluyeCuotaActividades: false,
      familiar: false,
      maxIntegrantes: '',
      ventaPortal: false,
      ventaDesde: '',
      ventaHasta: '',
      restricciones: '',
      activo: true,
      actividades: new Set(),
      amenities: new Set(),
      descuentos: new Set(),
    };
  }
}
