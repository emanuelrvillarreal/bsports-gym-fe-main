import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, finalize } from 'rxjs';

import {
  CongelamientoDto,
  LegajoMembresiasDto,
  MembresiaDto,
  PaseDto,
} from '../../../../core/api/interfaces/membresias.interfaces';
import { MembresiasApiService } from '../../../../core/api/services/membresias-api.service';
import { CuotaRowDto } from '../../../../core/api/interfaces/tesoreria.interfaces';
import { AuthService } from '../../../../core/global-services/services/auth.service';
import { PopupCobroCuotasComponent } from '../../_admin/components/popup-cobro-cuotas/popup-cobro-cuotas.component';
import { formatearMoneda } from '../../../../helpers/moneda-formato';
import {
  precioPase,
  resumenPase,
} from '../../../_compartido-perfiles/components/membresias/membresias.helpers';
import {
  AccionMembresia,
  TarjetaMembresiaComponent,
} from '../../../_compartido-perfiles/components/membresias/tarjeta-membresia/tarjeta-membresia.component';
import {
  formatearFechaAsistencia,
  isoFecha,
} from '../../../_compartido-perfiles/components/seguimiento-asistencia/seguimiento-asistencia.helpers';
import { BotonComponent } from '../../../ui/boton/boton.component';
import { InputFechaComponent } from '../../../ui/input-fecha/input-fecha.component';
import { SelectComponent, SelectOption } from '../../../ui/select/select.component';
import { ToastAlertService } from '../../../ui/toast-alert/services/toast-alert.service';

type Modo = 'lista' | 'contratar' | 'cambiar' | 'congelar' | 'baja';

/**
 * Membresías de un socio (legajo): pase vigente, historial, cobros, congelamientos e ingresos, y las acciones
 * contratar, renovar, cambiar de plan, congelar y dar de baja. Lo usan ADMIN y recepción. El cobro de cada
 * pase queda como una cuota más en Cobros › Cuotas.
 */
@Component({
  selector: 'app-membresias-socio',
  standalone: true,
  imports: [BotonComponent, InputFechaComponent, PopupCobroCuotasComponent, SelectComponent, TarjetaMembresiaComponent],
  templateUrl: './membresias-socio.component.html',
  styleUrl: './membresias-socio.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MembresiasSocioComponent {
  private readonly api = inject(MembresiasApiService);
  private readonly toast = inject(ToastAlertService);
  private readonly destroyRef = inject(DestroyRef);
  /** Solo el ADMIN registra cobros; recepción ve la cuota en el legajo y la cobra Cobros. */
  private readonly puedeCobrar = inject(AuthService).obtenerRolUsuario() === 'ADMIN';
  private readonly popupCobro = viewChild.required(PopupCobroCuotasComponent);
  protected readonly cobrando = signal(false);

  readonly memberUuid = input.required<string>();
  /** Avisa que algo cambió (para refrescar listados). */
  readonly cambio = output<void>();

  protected readonly legajo = signal<LegajoMembresiasDto | null>(null);
  protected readonly cargando = signal(true);
  protected readonly modo = signal<Modo>('lista');
  protected readonly objetivo = signal<MembresiaDto | null>(null);
  protected readonly guardando = signal(false);
  protected readonly error = signal('');

  protected readonly pases = signal<readonly PaseDto[]>([]);
  protected readonly paseUuid = signal('');
  protected readonly fechaInicio = signal('');
  protected readonly integrantes = signal<ReadonlySet<string>>(new Set());
  protected readonly descuentos = signal<ReadonlySet<string>>(new Set());
  protected readonly desde = signal('');
  protected readonly hasta = signal('');
  protected readonly motivo = signal('');

  protected readonly hoy = isoFecha(new Date());
  protected readonly fecha = formatearFechaAsistencia;
  protected readonly moneda = formatearMoneda;
  protected readonly precio = precioPase;
  protected readonly resumenPase = resumenPase;

  protected readonly paseElegido = computed(() => this.pases().find((p) => p.uuid === this.paseUuid()) ?? null);
  protected readonly opcionesPase = computed((): readonly SelectOption[] =>
    this.pases().map((p) => ({ value: p.uuid, label: `${p.nombre} · ${precioPase(p)}` })),
  );
  /** Otros integrantes del grupo que puede cubrir un pase familiar. */
  protected readonly candidatos = computed(() => {
    const l = this.legajo();
    return l ? l.grupo.filter((g) => g.uuid !== l.socio.uuid) : [];
  });
  protected readonly historial = computed(() => {
    const l = this.legajo();
    return l ? l.membresias.filter((m) => m.uuid !== l.vigente?.uuid) : [];
  });
  protected readonly diasCongelamiento = computed(() => {
    if (!this.desde() || !this.hasta() || this.hasta() < this.desde()) return 0;
    return Math.round((Date.parse(this.hasta()) - Date.parse(this.desde())) / 86_400_000) + 1;
  });

  constructor() {
    effect(() => {
      this.memberUuid();
      queueMicrotask(() => this.cargar());
    });
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.api
      .legajo(this.memberUuid())
      .pipe(
        finalize(() => this.cargando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({ next: (l) => this.legajo.set(l) });
  }

  // ------------------------------------------------------------ Contratar / cambiar de plan

  protected abrirContratar(objetivo: MembresiaDto | null = null): void {
    this.objetivo.set(objetivo);
    this.paseUuid.set('');
    this.fechaInicio.set(this.hoy);
    this.integrantes.set(new Set());
    this.descuentos.set(new Set());
    this.error.set('');
    this.modo.set(objetivo ? 'cambiar' : 'contratar');
    this.api.pasesDisponibles().subscribe({ next: (p) => this.pases.set(p) });
  }

  protected elegirPase(uuid: string): void {
    if (uuid === this.paseUuid()) return;
    this.paseUuid.set(uuid);
    this.integrantes.set(new Set());
    this.descuentos.set(new Set());
  }

  protected alternar(conjunto: 'integrantes' | 'descuentos', uuid: string, marcado: boolean): void {
    const destino = conjunto === 'integrantes' ? this.integrantes : this.descuentos;
    destino.update((actual) => {
      const nuevo = new Set(actual);
      if (marcado) nuevo.add(uuid);
      else nuevo.delete(uuid);
      return nuevo;
    });
  }

  protected guardarPlan(): void {
    const pase = this.paseElegido();
    if (!pase) return this.error.set('Elegí un pase.');
    if (!this.fechaInicio()) return this.error.set('Indicá la fecha de inicio.');
    if (pase.familiar && !this.integrantes().size) return this.error.set('Elegí quiénes del grupo quedan cubiertos.');
    if (pase.familiar && pase.maxIntegrantes && this.integrantes().size + 1 > pase.maxIntegrantes) {
      return this.error.set(`El pase cubre hasta ${pase.maxIntegrantes} personas.`);
    }
    const datos = {
      paseUuid: pase.uuid,
      fechaInicio: this.fechaInicio(),
      integrantesUuids: [...this.integrantes()],
      descuentosUuids: [...this.descuentos()],
    };
    const objetivo = this.objetivo();
    this.ejecutar(
      objetivo
        ? this.api.cambiarPlan(objetivo.uuid, datos)
        : this.api.contratar({ ...datos, memberUuid: this.memberUuid() }),
      true,
    );
  }

  // ------------------------------------------------------------ Acciones sobre una membresía

  protected async accion(m: MembresiaDto, accion: AccionMembresia): Promise<void> {
    this.objetivo.set(m);
    this.error.set('');
    if (accion === 'cambiar-plan') return this.abrirContratar(m);
    if (accion === 'congelar') {
      this.desde.set(this.hoy > m.fechaInicio ? this.hoy : m.fechaInicio);
      this.hasta.set('');
      this.motivo.set('');
      this.modo.set('congelar');
      return;
    }
    if (accion === 'baja') {
      this.motivo.set('');
      this.modo.set('baja');
      return;
    }
    const confirmado = await this.toast.confirm(
      `Se crea una nueva membresía de "${m.pase.nombre}" a continuación de la actual, con su cuota de ${precioPase(m.pase)}.`,
      { titulo: 'Renovar pase' },
    );
    if (confirmado) this.ejecutar(this.api.renovar(m.uuid), true);
  }

  protected guardarCongelamiento(): void {
    const m = this.objetivo();
    if (!m) return;
    if (!this.desde() || !this.hasta()) return this.error.set('Indicá desde y hasta cuándo.');
    if (this.hasta() < this.desde()) return this.error.set('La fecha hasta no puede ser anterior a la fecha desde.');
    if (!this.motivo().trim()) return this.error.set('Indicá el motivo.');
    this.ejecutar(this.api.congelar(m.uuid, { desde: this.desde(), hasta: this.hasta(), motivo: this.motivo().trim() }));
  }

  protected guardarBaja(): void {
    const m = this.objetivo();
    if (!m) return;
    if (!this.motivo().trim()) return this.error.set('Indicá el motivo de la baja.');
    this.ejecutar(this.api.darDeBaja(m.uuid, this.motivo().trim()));
  }

  protected async anularCongelamiento(c: CongelamientoDto): Promise<void> {
    const confirmado = await this.toast.confirmDanger(
      `¿Anular el congelamiento del ${formatearFechaAsistencia(c.desde)} al ${formatearFechaAsistencia(c.hasta)}?` +
        (c.extiendeVencimiento ? ' El vencimiento vuelve a como estaba.' : ''),
      { titulo: 'Anular congelamiento' },
    );
    if (confirmado) this.ejecutar(this.api.anularCongelamiento(c.uuid));
  }

  protected volver(): void {
    this.modo.set('lista');
    this.error.set('');
  }

  protected cerrarCobro(): void {
    this.cobrando.set(false);
    this.cargar();
    this.cambio.emit();
  }

  /** Con `cobrar`, si la membresía nueva tiene su cuota impaga, abre el cobro para elegir el medio de pago. */
  private ejecutar(peticion: Observable<MembresiaDto>, cobrar = false): void {
    this.guardando.set(true);
    peticion.pipe(finalize(() => this.guardando.set(false))).subscribe({
      next: (m) => {
        this.modo.set('lista');
        this.cargar();
        this.cambio.emit();
        if (cobrar) this.abrirCobro(m);
      },
      error: () => this.error.set(this.modo() === 'lista' ? '' : 'No se pudo guardar. Revisá el mensaje del aviso.'),
    });
  }

  private abrirCobro(m: MembresiaDto): void {
    const c = m.cobro;
    if (!this.puedeCobrar || !c || (c.estado !== 'PENDIENTE' && c.estado !== 'VENCIDA') || !(c.montoFinal > 0)) return;
    const cuota: CuotaRowDto = {
      cuotaUuid: c.cuotaUuid,
      concepto: m.pase.nombre,
      tipo: 'PASE',
      origen: 'ALTA',
      monto: c.monto,
      montoFinal: c.montoFinal,
      vencimiento: c.vencimiento ?? '',
      estado: c.estado,
      diasMora: 0,
      personaMemberUuid: m.socio.uuid,
      personaNombre: m.socio.nombre,
      personaApellido: '',
      personaEstado: '',
      titularMemberUuid: m.socio.uuid,
      titularNombre: m.socio.nombre,
      titularApellido: '',
    };
    this.popupCobro().iniciarConCuota(cuota);
    this.cobrando.set(true);
  }
}
