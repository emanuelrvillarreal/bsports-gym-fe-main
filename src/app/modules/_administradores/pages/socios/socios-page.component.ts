import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroQrCode } from '@ng-icons/heroicons/outline';
import * as QRCode from 'qrcode';

import { AuthSessionService } from '../../../../core/global-services/services/auth-session.service';
import { normalizarPathEmpresa } from '../../../../helpers/normalizar-path-empresa';
import { environment } from '../../../../../environments/environment';

import { BotonComponent } from '../../../ui/boton/boton.component';
import { PopupComponent } from '../../../ui/popup/popup.component';
import { TituloHeroComponent } from '../../../ui/titulo-hero/titulo-hero.component';
import { GestionSociosComponent } from '../../components/gestion-socios/gestion-socios.component';

@Component({
  selector: 'app-socios-administradores-page',
  imports: [BotonComponent, GestionSociosComponent, NgIcon, PopupComponent, TituloHeroComponent],
  providers: [provideIcons({ heroQrCode })],
  templateUrl: './socios-page.component.html',
  styleUrl: './socios-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SociosAdministradoresPageComponent implements OnDestroy {
  private readonly datosRuta = inject(ActivatedRoute).snapshot.data;
  private readonly authSessionService = inject(AuthSessionService);
  private readonly filasConfiguradas = Number(this.datosRuta['filasVisiblesTabla']);
  private temporizadorCopiado: ReturnType<typeof setTimeout> | null = null;

  protected readonly filasVisiblesTabla =
    Number.isInteger(this.filasConfiguradas) && this.filasConfiguradas > 0
      ? this.filasConfiguradas
      : 50;
  protected readonly pathEmpresa = computed(() =>
    normalizarPathEmpresa(this.authSessionService.companyName()),
  );
  protected readonly enlaceCopiado = signal(false);
  protected readonly qrSocio = signal<string | null>(null);
  protected readonly cargandoQr = signal(false);

  protected async abrirQrSocio(): Promise<void> {
    const path = this.pathEmpresa();
    if (!path || this.cargandoQr()) return;
    this.cargandoQr.set(true);
    const baseUrl = environment.appBaseUrl.trim().replace(/\/+$/, '');
    const enlace = `${baseUrl}/${encodeURIComponent(path)}/login`;
    try {
      this.qrSocio.set(await QRCode.toDataURL(enlace, { errorCorrectionLevel: 'M', margin: 1, width: 320 }));
    } finally {
      this.cargandoQr.set(false);
    }
  }

  protected cerrarQrSocio(): void {
    this.qrSocio.set(null);
  }

  protected async copiarEnlaceSocio(): Promise<void> {
    const path = this.pathEmpresa();
    if (!path || typeof navigator === 'undefined' || !navigator.clipboard) return;

    const baseUrl = environment.appBaseUrl.trim().replace(/\/+$/, '');
    const enlace = `${baseUrl}/${encodeURIComponent(path)}/login`;
    try {
      await navigator.clipboard.writeText(enlace);
      this.enlaceCopiado.set(true);
      this.limpiarTemporizadorCopiado();
      this.temporizadorCopiado = setTimeout(() => this.enlaceCopiado.set(false), 2500);
    } catch {
      this.enlaceCopiado.set(false);
    }
  }

  ngOnDestroy(): void {
    this.limpiarTemporizadorCopiado();
  }

  private limpiarTemporizadorCopiado(): void {
    if (this.temporizadorCopiado !== null) clearTimeout(this.temporizadorCopiado);
    this.temporizadorCopiado = null;
  }
}
