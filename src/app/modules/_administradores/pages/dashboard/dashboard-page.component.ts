import { AccionesRapidasComponent } from '../../components/acciones-rapidas/acciones-rapidas.component';
import { ChangeDetectionStrategy, Component, computed, inject, viewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { AuthSessionService } from '../../../../core/global-services/services/auth-session.service';
import { DashboardGeneralComponent } from '../../_admin/components/dashboard-general/dashboard-general.component';
import { DashboardFinancieroComponent } from '../../_admin/components/dashboard-financiero/dashboard-financiero.component';
import {
  DashboardFinancieroHeroComponent,
  PeriodoDashboardFinanciero as PeriodoHero,
} from '../../_admin/components/dashboard-financiero-hero/dashboard-financiero-hero.component';
import { ResumenDashboardComponent } from '../../components/resumen-dashboard/resumen-dashboard.component';
import { TituloHeroComponent } from '../../../ui/titulo-hero/titulo-hero.component';
import { SelectOption } from '../../../ui/select/select.component';
import { formatearMoneda } from '../../../../helpers/moneda-formato';

const MESES: readonly SelectOption[] = [
  { value: '01', label: 'Enero' },
  { value: '02', label: 'Febrero' },
  { value: '03', label: 'Marzo' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Mayo' },
  { value: '06', label: 'Junio' },
  { value: '07', label: 'Julio' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' },
] as const;

const ANIOS_HISTORICOS_MOSTRADOS = 5;

@Component({
  selector: 'app-dashboard-administradores-page',
  imports: [
    AccionesRapidasComponent,
    DashboardFinancieroComponent,
    DashboardFinancieroHeroComponent,
    DashboardGeneralComponent,
    ResumenDashboardComponent,
    TituloHeroComponent,
  ],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardAdministradoresPageComponent {
  private static readonly LOGO_FALLBACK_URL = 'assets/Logo BOP Solo.svg';
  private readonly datosRuta = inject(ActivatedRoute).snapshot.data;
  private readonly authSessionService = inject(AuthSessionService);
  protected readonly componenteFinanciero = viewChild(DashboardFinancieroComponent);

  protected readonly titulo =
    typeof this.datosRuta['tituloPagina'] === 'string'
      ? this.datosRuta['tituloPagina']
      : 'Dashboard';
  protected readonly subtitulo =
    typeof this.datosRuta['subtituloPagina'] === 'string'
      ? this.datosRuta['subtituloPagina']
      : 'Consultá el estado general del gimnasio.';
  protected readonly mostrarFinanzas =
    Array.isArray(this.datosRuta['roles']) && this.datosRuta['roles'].includes('ADMIN');
  protected readonly prefijoRuta: '/admin' | '/adm-recepcion' = this.mostrarFinanzas
    ? '/admin'
    : '/adm-recepcion';
  protected readonly empresa = computed(() => this.authSessionService.companyName().trim());
  protected readonly logoEmpresa = computed(
    () =>
      this.authSessionService.companyLogoUrl().trim() ||
      DashboardAdministradoresPageComponent.LOGO_FALLBACK_URL,
  );
  protected readonly saldoNeto = computed(() => {
    const balance = this.componenteFinanciero()?.balanceSeleccionado();
    return balance ? formatearMoneda(balance.ingresosNetos) : 'Sin datos';
  });
  protected readonly detalleSaldoNeto = computed(() => {
    const balance = this.componenteFinanciero()?.balanceSeleccionado();
    return balance
      ? `Ingresos ${formatearMoneda(balance.ingresosTotales)} / Egresos ${formatearMoneda(balance.egresosTotales)}`
      : 'No hay un balance registrado para el período seleccionado.';
  });
  protected readonly periodoHero = computed<PeriodoHero>(() => {
    const periodo = this.componenteFinanciero()?.periodoSeleccionado();
    const fechaActual = new Date();
    return {
      anio: String(periodo?.anio ?? fechaActual.getFullYear()),
      mes: String(periodo?.mes ?? fechaActual.getMonth() + 1).padStart(2, '0'),
    };
  });
  protected readonly anios = computed<readonly SelectOption[]>(() => {
    const periodos = this.componenteFinanciero()?.periodosDisponibles() ?? [];
    const anioActual = new Date().getFullYear();
    const anioMinimo = anioActual - ANIOS_HISTORICOS_MOSTRADOS;
    const aniosDelRango = Array.from(
      { length: ANIOS_HISTORICOS_MOSTRADOS + 1 },
      (_, indice) => anioActual - indice,
    );
    const aniosDisponibles = new Set([
      ...aniosDelRango,
      ...periodos.map((periodo) => periodo.anio),
    ]);

    return [...aniosDisponibles]
      .filter((anio) => anio >= anioMinimo && anio <= anioActual)
      .sort((a, b) => b - a)
      .map((anio) => ({ value: String(anio), label: String(anio) }));
  });
  protected readonly meses = computed<readonly SelectOption[]>(() => MESES);

  protected cambiarPeriodo(periodo: PeriodoHero): void {
    const dashboard = this.componenteFinanciero();
    if (!dashboard) return;

    dashboard.seleccionarPeriodo({
      anio: Number(periodo.anio),
      mes: Number(periodo.mes),
    });
  }

  protected restablecerPeriodo(): void {
    this.componenteFinanciero()?.restablecerPeriodo();
  }
}
