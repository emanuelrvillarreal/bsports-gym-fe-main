import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Subscription, finalize } from 'rxjs';

import {
  AsistenciaAlumnoDetalleDto,
  AsistenciaAlumnoFilaDto,
  SeguimientoAsistenciaDto,
  TrayectoriaDeportivaDto,
} from '../../../../core/api/interfaces/seguimiento-asistencia.interfaces';
import { PortalSocioApiService } from '../../../../core/api/services/portal-socio-api.service';
import { SeguimientoAsistenciaApiService } from '../../../../core/api/services/seguimiento-asistencia-api.service';
import {
  OPCIONES_PERIODO,
  PeriodoSeguimiento,
  barrasEvolucion,
  etiquetaMes,
  formatearFechaAsistencia,
  formatearPorcentaje,
  rangoPeriodo,
} from '../../../_compartido-perfiles/components/seguimiento-asistencia/seguimiento-asistencia.helpers';
import { TrayectoriaDeportivaComponent } from '../../../_compartido-perfiles/components/trayectoria-deportiva/trayectoria-deportiva.component';
import { BotonComponent } from '../../../ui/boton/boton.component';
import { BarraGrafico, GraficoBarrasComponent } from '../../../ui/grafico-barras/grafico-barras.component';
import { SelectComponent, SelectOption } from '../../../ui/select/select.component';

/**
 * Portal del socio: "Mis asistencias" y "Mi trayectoria deportiva". El titular puede elegir a un
 * familiar de su grupo; el backend valida que el socio pedido sea del mismo grupo.
 */
@Component({
  selector: 'app-mi-trayectoria-portal',
  standalone: true,
  imports: [BotonComponent, GraficoBarrasComponent, SelectComponent, TrayectoriaDeportivaComponent],
  templateUrl: './mi-trayectoria-portal.component.html',
  styleUrl: './mi-trayectoria-portal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MiTrayectoriaPortalComponent {
  private readonly api = inject(SeguimientoAsistenciaApiService);
  private readonly portalApi = inject(PortalSocioApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly esTitular = inject(Router).url.startsWith('/socio-titular');

  protected readonly opcionesPeriodo = OPCIONES_PERIODO.filter((opcion) => opcion.id !== 'personalizado');
  protected readonly vista = signal<'asistencias' | 'trayectoria'>('asistencias');
  protected readonly periodo = signal<PeriodoSeguimiento>('inscripcion');
  /** Vacío = el socio que inició sesión. */
  protected readonly memberUuid = signal('');
  protected readonly opcionesSocios = signal<readonly SelectOption[]>([]);

  protected readonly asistencias = signal<SeguimientoAsistenciaDto | null>(null);
  protected readonly cargando = signal(false);
  protected readonly error = signal('');
  protected readonly trayectoria = signal<TrayectoriaDeportivaDto | null>(null);
  protected readonly cargandoTrayectoria = signal(false);

  protected readonly abierta = signal<string | null>(null);
  protected readonly detalle = signal<AsistenciaAlumnoDetalleDto | null>(null);
  protected readonly cargandoDetalle = signal(false);

  private asistenciasSub?: Subscription;
  private detalleSub?: Subscription;

  /** Primero las inscripciones vigentes; los períodos cerrados quedan como historial al final. */
  protected readonly actividades = computed(() =>
    [...(this.asistencias()?.alumnos.content ?? [])].sort((a, b) => Number(b.activa) - Number(a.activa)),
  );
  protected readonly barras = computed((): readonly BarraGrafico[] => {
    const datos = this.asistencias();
    return datos ? barrasEvolucion(datos.evolucionMensual, datos.umbrales.verde, datos.umbrales.amarillo) : [];
  });
  protected readonly barrasDetalle = computed((): readonly BarraGrafico[] => {
    const detalle = this.detalle();
    const umbrales = this.asistencias()?.umbrales;
    return detalle && umbrales ? barrasEvolucion(detalle.evolucionMensual, umbrales.verde, umbrales.amarillo) : [];
  });

  protected readonly fecha = formatearFechaAsistencia;
  protected readonly porcentaje = formatearPorcentaje;
  protected readonly mes = etiquetaMes;

  constructor() {
    queueMicrotask(() => {
      this.cargarAsistencias();
      if (this.esTitular) this.cargarGrupo();
    });
  }

  protected elegirVista(vista: 'asistencias' | 'trayectoria'): void {
    this.vista.set(vista);
    if (vista === 'trayectoria' && !this.trayectoria()) this.cargarTrayectoria();
  }

  protected elegirPeriodo(periodo: PeriodoSeguimiento): void {
    if (this.periodo() === periodo) return;
    this.periodo.set(periodo);
    this.cargarAsistencias();
  }

  protected elegirSocio(memberUuid: string): void {
    this.memberUuid.set(memberUuid);
    this.trayectoria.set(null);
    this.cargarAsistencias();
    if (this.vista() === 'trayectoria') this.cargarTrayectoria();
  }

  protected alternarDetalle(fila: AsistenciaAlumnoFilaDto): void {
    if (this.abierta() === fila.inscripcionUuid) {
      this.abierta.set(null);
      return;
    }
    this.abierta.set(fila.inscripcionUuid);
    this.detalle.set(null);
    this.detalleSub?.unsubscribe();
    this.cargandoDetalle.set(true);
    const rango = rangoPeriodo(this.periodo());
    this.detalleSub = this.api
      .obtenerDetalle('socio', fila.inscripcionUuid, rango.desde, rango.hasta)
      .pipe(finalize(() => this.cargandoDetalle.set(false)))
      .subscribe({ next: (detalle) => this.detalle.set(detalle) });
  }

  protected reintentar(): void {
    this.cargarAsistencias();
  }

  protected claseNivel(fila: AsistenciaAlumnoFilaDto): string {
    return `portal-trayectoria__nivel portal-trayectoria__nivel--${fila.nivel.toLowerCase()}`;
  }

  protected textoEstadoClase(estado: string): string {
    return estado === 'PRESENTE' ? 'Presente' : estado === 'AUSENTE_JUSTIFICADO' ? 'Justificada' : 'Ausente';
  }

  protected textoInicio(inicio: string): string {
    const [dia, hora] = inicio.replace('T', ' ').split(' ');
    return `${formatearFechaAsistencia(dia)} ${hora?.slice(0, 5) ?? ''}`.trim();
  }

  private cargarAsistencias(): void {
    this.asistenciasSub?.unsubscribe();
    this.cargando.set(true);
    this.error.set('');
    this.abierta.set(null);
    const rango = rangoPeriodo(this.periodo());
    this.asistenciasSub = this.api
      .consultarMisAsistencias(this.memberUuid() || null, rango.desde, rango.hasta)
      .pipe(
        finalize(() => this.cargando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (datos) => this.asistencias.set(datos),
        error: () => this.error.set('No se pudieron cargar tus asistencias.'),
      });
  }

  private cargarTrayectoria(): void {
    this.cargandoTrayectoria.set(true);
    this.api
      .obtenerTrayectoria('socio', this.memberUuid() || null)
      .pipe(
        finalize(() => this.cargandoTrayectoria.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({ next: (trayectoria) => this.trayectoria.set(trayectoria) });
  }

  private cargarGrupo(): void {
    this.portalApi
      .obtenerGrupoFamiliar()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (grupo) => {
          const familiares = grupo.integrantes
            .map((integrante) => integrante.member)
            .filter((member) => !member.titular);
          if (!familiares.length) return;
          this.opcionesSocios.set([
            { value: '', label: 'Yo' },
            ...familiares.map((member) => ({
              value: member.memberUuid,
              label: `${member.nombre ?? ''} ${member.apellido ?? ''}`.trim(),
            })),
          ]);
        },
      });
  }
}
