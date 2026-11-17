import { HttpClient, HttpContext } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { API_ROUTES } from '../../../../../core/api/api-routes';
import { crearApiUrl } from '../../../../../core/api/api-url';
import { DashboardGeneralDto, DashboardItemDto } from '../../../../../core/api/interfaces/dashboard-general.interfaces';
import { MOSTRAR_TOAST_ERROR } from '../../../../../core/interceptors/context/http-toast-context';
import { formatearMoneda } from '../../../../../helpers/moneda-formato';
import {
  etiquetaMes,
  formatearPorcentaje,
} from '../../../../_compartido-perfiles/components/seguimiento-asistencia/seguimiento-asistencia.helpers';
import { BotonComponent } from '../../../../ui/boton/boton.component';
import { BarraGrafico, GraficoBarrasComponent } from '../../../../ui/grafico-barras/grafico-barras.component';

/** Sin semáforo: en conteos y asistencia general un color de alerta confundiría. */
const NEUTRO = 'var(--app-accent)';

type Seccion = 'socios' | 'actividades' | 'deportivo' | 'economia';

/**
 * Panorama del club para el ADMIN: indicadores clave siempre visibles y una sección a la vez
 * (socios, actividades y asistencia, deportivo, economía) para no sobrecargar el panel.
 * Cada indicador lleva a su pantalla de detalle. Los números salen de los mismos cálculos que esas
 * pantallas (asistencia, reportes económicos), así coinciden.
 */
@Component({
  selector: 'app-dashboard-general',
  standalone: true,
  imports: [BotonComponent, GraficoBarrasComponent, RouterLink],
  templateUrl: './dashboard-general.component.html',
  styleUrl: './dashboard-general.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardGeneralComponent {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly datos = signal<DashboardGeneralDto | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal(false);
  protected readonly seccion = signal<Seccion>('socios');

  protected readonly secciones: readonly { readonly id: Seccion; readonly etiqueta: string }[] = [
    { id: 'socios', etiqueta: 'Socios' },
    { id: 'actividades', etiqueta: 'Actividades y asistencia' },
    { id: 'deportivo', etiqueta: 'Deportivo' },
    { id: 'economia', etiqueta: 'Economía' },
  ];

  protected readonly moneda = (v: number): string => (v < 0 ? `-${formatearMoneda(-v)}` : formatearMoneda(v));
  protected readonly porcentaje = formatearPorcentaje;

  /** Altas por mes; la etiqueta suma las bajas para no perderlas. */
  protected readonly barrasSocios = computed((): readonly BarraGrafico[] => {
    const meses = this.ultimosMeses();
    const tope = Math.max(1, ...meses.map((m) => m.altas));
    return meses.map((m) => ({
      id: m.periodo,
      nombre: etiquetaMes(m.periodo),
      valor: m.altas,
      tope,
      etiquetaValor: m.bajas ? `+${m.altas} / -${m.bajas}` : `+${m.altas}`,
      color: NEUTRO,
    }));
  });
  protected readonly barrasInscripciones = computed((): readonly BarraGrafico[] => {
    const meses = this.ultimosMeses();
    const tope = Math.max(1, ...meses.map((m) => m.inscripciones));
    return meses.map((m) => ({ id: m.periodo, nombre: etiquetaMes(m.periodo), valor: m.inscripciones, tope, etiquetaValor: `${m.inscripciones}`, color: NEUTRO }));
  });
  protected readonly barrasAsistencia = computed((): readonly BarraGrafico[] =>
    this.ultimosMeses()
      .filter((m) => m.asistencia !== null)
      .map((m) => ({
        id: m.periodo,
        nombre: etiquetaMes(m.periodo),
        valor: m.asistencia ?? 0,
        tope: 100,
        etiquetaValor: formatearPorcentaje(m.asistencia),
        color: NEUTRO,
      })),
  );
  protected readonly barrasEconomia = computed(() =>
    this.ingresosEgresos(),
  );
  protected readonly barrasDemanda = computed(() => this.lateral(this.datos()?.demandaActividades ?? [], true));
  protected readonly barrasCategorias = computed(() => this.lateral(this.datos()?.sociosPorCategoria ?? [], false));
  protected readonly barrasDisciplinas = computed(() => this.lateral(this.datos()?.participacionPorDisciplina ?? [], false));
  protected readonly menorDemanda = computed(() =>
    [...(this.datos()?.demandaActividades ?? [])].sort((a, b) => a.valor - b.valor).slice(0, 3),
  );
  protected readonly alertas = computed(() => {
    const d = this.datos();
    if (!d) return 0;
    return d.bajaAsistencia + d.mantenimientosVencidos + d.evaluacionesVencidas + (d.deudaVencida > 0 ? 1 : 0);
  });

  constructor() {
    queueMicrotask(() => this.cargar());
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(false);
    this.http
      .get<DashboardGeneralDto>(crearApiUrl(API_ROUTES.dashboardAdministradores.general), {
        context: new HttpContext().set(MOSTRAR_TOAST_ERROR, { titulo: 'Panorama del gimnasio' }),
      })
      .pipe(
        finalize(() => this.cargando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({ next: (d) => this.datos.set(d), error: () => this.error.set(true) });
  }

  /** Los gráficos verticales necesitan ~7rem por barra: 6 meses entran en un panel ancho. */
  private ultimosMeses(): DashboardGeneralDto['evolucion'] {
    return (this.datos()?.evolucion ?? []).slice(-6);
  }

  private ingresosEgresos(): readonly BarraGrafico[] {
    return this.ultimosMeses().flatMap((m) => {
      const tope = Math.max(1, m.ingresos, m.egresos);
      const grupo = etiquetaMes(m.periodo);
      return [
        { id: `${m.periodo}-i`, nombre: 'Ingresos', grupoNombre: grupo, valor: m.ingresos, tope, color: 'var(--semantic-success)', etiquetaValor: formatearMoneda(m.ingresos) },
        { id: `${m.periodo}-e`, nombre: 'Egresos', grupoNombre: grupo, valor: m.egresos, tope, color: 'var(--semantic-danger)', etiquetaValor: formatearMoneda(m.egresos) },
      ];
    });
  }

  /** Barras horizontales; con cupo, muestra "inscriptos de cupo". */
  private lateral(items: readonly DashboardItemDto[], conCupo: boolean): readonly BarraGrafico[] {
    const tope = Math.max(1, ...items.map((i) => (conCupo && i.extra ? i.extra : i.valor)));
    return items.slice(0, 8).map((i, indice) => ({
      id: i.clave ?? `${indice}`,
      nombre: i.nombre,
      valor: i.valor,
      tope: conCupo && i.extra ? i.extra : tope,
      etiquetaValor: conCupo && i.extra ? `${i.valor} de ${i.extra}` : `${i.valor}`,
    }));
  }
}
