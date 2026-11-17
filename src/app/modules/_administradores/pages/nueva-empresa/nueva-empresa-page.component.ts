import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { finalize, forkJoin } from 'rxjs';

import {
  CondicionImpositivaCrmDto,
  ProvinciaCrmDto,
} from '../../../../core/api/interfaces/crm.interfaces';

import {
  EmpresaDto,
  RegistroEmpresaPayload,
} from '../../../../core/api/interfaces/empresa.interfaces';
import { EmpresaApiService } from '../../../../core/api/services/empresa-api.service';
import { SysadminApiService } from '../../../../core/api/services/sysadmin-api.service';
import { extraerMensajeErrorApi } from '../../../../core/api/error-api';
import { FormularioRegistroEmpresaComponent } from '../../../auth/components/formulario-registro-empresa/formulario-registro-empresa.component';
import {
  FormularioRegistroFotoComponent,
  FormularioRegistroFotoValor,
} from '../../../auth/components/formulario-registro-foto/formulario-registro-foto.component';
import { CardComponent } from '../../../ui/card/card.component';
import { TituloHeroComponent } from '../../../ui/titulo-hero/titulo-hero.component';
import { BotonComponent } from '../../../ui/boton/boton.component';

@Component({
  selector: 'app-nueva-empresa-page',
  imports: [
    BotonComponent,
    CardComponent,
    FormularioRegistroEmpresaComponent,
    FormularioRegistroFotoComponent,
    TituloHeroComponent,
  ],
  templateUrl: './nueva-empresa-page.component.html',
  styleUrl: './nueva-empresa-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NuevaEmpresaPageComponent implements OnInit {
  private readonly empresaApi = inject(EmpresaApiService);
  private readonly sysadminApi = inject(SysadminApiService);
  private readonly formularioEmpresa = viewChild(FormularioRegistroEmpresaComponent);

  protected readonly registrando = signal(false);
  protected readonly cargandoCatalogos = signal(false);
  protected readonly catalogosCargados = signal(false);
  protected readonly provinciasCrm = signal<readonly ProvinciaCrmDto[]>([]);
  protected readonly condicionesImpositivasCrm = signal<readonly CondicionImpositivaCrmDto[]>([]);
  protected readonly subiendoLogo = signal(false);
  protected readonly sincronizandoRoles = signal(false);
  protected readonly errorEtapa = signal('');
  protected readonly empresaCreada = signal<EmpresaDto | null>(null);
  protected readonly logoCargado = signal(false);
  protected readonly onboardingCompleto = signal(false);

  ngOnInit(): void {
    this.cargarCatalogosCrm();
  }

  protected cargarCatalogosCrm(): void {
    if (this.cargandoCatalogos()) return;

    this.cargandoCatalogos.set(true);
    this.errorEtapa.set('');
    forkJoin({
      provincias: this.sysadminApi.obtenerProvinciasCrm(),
      condiciones: this.sysadminApi.obtenerCondicionesImpositivasCrm(),
    })
      .pipe(finalize(() => this.cargandoCatalogos.set(false)))
      .subscribe({
        next: ({ provincias, condiciones }) => {
          this.provinciasCrm.set(provincias);
          this.condicionesImpositivasCrm.set(condiciones);
          this.catalogosCargados.set(true);
        },
        error: (error: unknown) => {
          this.catalogosCargados.set(false);
          this.errorEtapa.set(
            this.obtenerMensajeError(
              error,
              'No se pudieron cargar los catálogos del CRM. Verificá los permisos de provincias y condiciones impositivas en el CRM.',
            ),
          );
        },
      });
  }

  protected registrarEmpresa(payload: RegistroEmpresaPayload): void {
    if (this.registrando() || this.empresaCreada()) return;

    this.registrando.set(true);
    this.errorEtapa.set('');

    this.sysadminApi
      .registrarClub(payload)
      .pipe(finalize(() => this.registrando.set(false)))
      .subscribe({
        next: ({ company }) => {
          const companyUuid = company.uuid?.trim();
          if (!companyUuid) {
            this.errorEtapa.set(
              'El gimnasio fue creado, pero la API no devolvio company.uuid. No se puede continuar el onboarding.',
            );
            return;
          }

          this.empresaCreada.set({ ...company, uuid: companyUuid });
          this.formularioEmpresa()?.resetearFormulario();
        },
        error: (error: unknown) =>
          this.errorEtapa.set(this.obtenerMensajeError(error, 'No se pudo registrar el gimnasio.')),
      });
  }

  protected subirLogo(valor: FormularioRegistroFotoValor): void {
    const company = this.empresaCreada();
    if (!company || this.subiendoLogo() || this.logoCargado()) return;

    this.subiendoLogo.set(true);
    this.errorEtapa.set('');

    this.empresaApi
      .subirLogo(company.uuid, valor.foto)
      .pipe(finalize(() => this.subiendoLogo.set(false)))
      .subscribe({
        next: (empresaActualizada) => {
          this.empresaCreada.set(empresaActualizada);
          this.logoCargado.set(true);
          this.sincronizarRoles();
        },
        error: (error: unknown) =>
          this.errorEtapa.set(
            this.obtenerMensajeError(
              error,
              'No se pudo guardar el logo. Podes reintentar sin registrar otra vez el gimnasio.',
            ),
          ),
      });
  }

  protected sincronizarRoles(): void {
    if (!this.logoCargado() || this.sincronizandoRoles() || this.onboardingCompleto()) return;

    this.sincronizandoRoles.set(true);
    this.errorEtapa.set('');

    this.sysadminApi
      .sincronizarRoles()
      .pipe(finalize(() => this.sincronizandoRoles.set(false)))
      .subscribe({
        next: () => this.onboardingCompleto.set(true),
        error: (error: unknown) =>
          this.errorEtapa.set(
            this.obtenerMensajeError(
              error,
              'No se pudieron sincronizar los roles. Podes reintentar sin repetir el alta ni el logo.',
            ),
          ),
      });
  }

  protected registrarOtroClub(): void {
    this.empresaCreada.set(null);
    this.logoCargado.set(false);
    this.onboardingCompleto.set(false);
    this.errorEtapa.set('');
  }

  protected nombreEmpresa(): string {
    const company = this.empresaCreada();
    return company?.nombreComercial ?? company?.razonSocial ?? 'El gimnasio';
  }

  private obtenerMensajeError(error: unknown, fallback: string): string {
    return extraerMensajeErrorApi(error, fallback);
  }
}
