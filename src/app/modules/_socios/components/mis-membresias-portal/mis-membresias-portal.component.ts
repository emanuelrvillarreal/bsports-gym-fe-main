import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { MembresiaDto, PaseDto, PortalMembresiasDto } from '../../../../core/api/interfaces/membresias.interfaces';
import { MembresiasApiService } from '../../../../core/api/services/membresias-api.service';
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

/**
 * "Mis pases": pases del socio (y de su grupo si es titular), vigencia, ingresos usados, congelamientos y
 * cobros. El titular puede contratar o renovar los pases que el club vende online; el pago se hace en
 * "Mis cuotas" como cualquier otra cuota (no hay un circuito de pago aparte).
 */
@Component({
  selector: 'app-mis-membresias-portal',
  standalone: true,
  imports: [BotonComponent, InputFechaComponent, RouterLink, SelectComponent, TarjetaMembresiaComponent],
  templateUrl: './mis-membresias-portal.component.html',
  styleUrl: './mis-membresias-portal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MisMembresiasPortalComponent {
  private readonly api = inject(MembresiasApiService);
  private readonly toast = inject(ToastAlertService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  protected readonly datos = signal<PortalMembresiasDto | null>(null);
  protected readonly cargando = signal(true);
  protected readonly contratando = signal<PaseDto | null>(null);
  protected readonly beneficiario = signal('');
  protected readonly fechaInicio = signal('');
  protected readonly integrantes = signal<ReadonlySet<string>>(new Set());
  protected readonly guardando = signal(false);
  protected readonly error = signal('');
  /** Tras contratar o renovar: recordatorio para pagar. */
  protected readonly pendientePago = signal<MembresiaDto | null>(null);

  protected readonly hoy = isoFecha(new Date());
  protected readonly fecha = formatearFechaAsistencia;
  protected readonly precio = precioPase;
  protected readonly resumen = resumenPase;
  /** Misma base de ruta del portal en la que está (titular o familiar). */
  protected readonly rutaCuotas = this.router.url.startsWith('/socio-familiar') ? '/socio-familiar/cuotas' : '/socio-titular/cuotas';

  protected readonly vigentes = computed(() =>
    (this.datos()?.membresias ?? []).filter((m) => m.estado === 'ACTIVA' && m.situacion !== 'VENCIDA'),
  );
  protected readonly historial = computed(() =>
    (this.datos()?.membresias ?? []).filter((m) => !(m.estado === 'ACTIVA' && m.situacion !== 'VENCIDA')),
  );
  protected readonly variosSocios = computed(() => (this.datos()?.grupo.length ?? 0) > 1);
  protected readonly opcionesBeneficiario = computed((): readonly SelectOption[] =>
    (this.datos()?.grupo ?? []).map((g) => ({ value: g.uuid, label: g.nombre })),
  );
  protected readonly otrosIntegrantes = computed(() => (this.datos()?.grupo ?? []).slice(1));

  constructor() {
    queueMicrotask(() => this.cargar());
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.api
      .portal()
      .pipe(
        finalize(() => this.cargando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({ next: (d) => this.datos.set(d) });
  }

  protected abrirContratar(pase: PaseDto): void {
    this.contratando.set(pase);
    this.beneficiario.set(this.datos()?.grupo[0]?.uuid ?? '');
    this.fechaInicio.set(this.hoy);
    this.integrantes.set(new Set());
    this.error.set('');
    this.pendientePago.set(null);
  }

  protected alternarIntegrante(uuid: string, marcado: boolean): void {
    this.integrantes.update((actual) => {
      const nuevo = new Set(actual);
      if (marcado) nuevo.add(uuid);
      else nuevo.delete(uuid);
      return nuevo;
    });
  }

  protected contratar(): void {
    const pase = this.contratando();
    if (!pase) return;
    if (!this.fechaInicio() || this.fechaInicio() < this.hoy) return this.error.set('La fecha de inicio no puede ser anterior a hoy.');
    if (pase.familiar && !this.integrantes().size) return this.error.set('Elegí quiénes del grupo quedan cubiertos.');
    if (pase.familiar && pase.maxIntegrantes && this.integrantes().size + 1 > pase.maxIntegrantes) {
      return this.error.set(`El pase cubre hasta ${pase.maxIntegrantes} personas.`);
    }
    this.guardando.set(true);
    this.api
      .portalContratar({
        paseUuid: pase.uuid,
        memberUuid: pase.familiar ? null : this.beneficiario() || null,
        fechaInicio: this.fechaInicio(),
        integrantesUuids: pase.familiar ? [...this.integrantes()] : [],
      })
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: (m) => this.terminar(m),
        error: () => this.error.set('No se pudo contratar. Revisá el mensaje del aviso.'),
      });
  }

  protected async accion(m: MembresiaDto, accion: AccionMembresia): Promise<void> {
    if (accion !== 'renovar') return;
    const confirmado = await this.toast.confirm(
      `Se genera la renovación de "${m.pase.nombre}" con una cuota de ${precioPase(m.pase)}. El pase se habilita cuando la pagues.`,
      { titulo: 'Renovar pase' },
    );
    if (!confirmado) return;
    this.api.portalRenovar(m.uuid).subscribe({ next: (nueva) => this.terminar(nueva) });
  }

  private terminar(m: MembresiaDto): void {
    this.contratando.set(null);
    this.pendientePago.set(m.cobro?.estado === 'PAGADA' ? null : m);
    this.cargar();
  }
}
