import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import {
  CertificadoVigenciaModo,
  PerfilEmpresaDto,
  PerfilEmpresaPayload,
} from '../../../../core/api/interfaces/empresa.interfaces';
import { AuthSessionService } from '../../../../core/global-services/services/auth-session.service';
import { PerfilEmpresaActivaService } from '../../../_compartido-perfiles/services/perfil-empresa-activa.service';
import { BotonComponent } from '../../../ui/boton/boton.component';
import { CardComponent } from '../../../ui/card/card.component';
import { ColorThemeService } from '../../../ui/color-mod/color-theme.service';
import { SelectComponent, SelectOption } from '../../../ui/select/select.component';

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function fechaTexto(fecha: Date): string {
  return `${String(fecha.getDate()).padStart(2, '0')}/${String(fecha.getMonth() + 1).padStart(2, '0')}/${fecha.getFullYear()}`;
}

function ultimoDiaDelMes(anio: number, mes: number): number {
  return new Date(anio, mes, 0).getDate();
}

/**
 * Configuración de la vigencia del certificado médico del club. Replica el cálculo del backend para mostrar un
 * ejemplo en vivo: con fecha fija todos renuevan el mismo día del año; con duración, cada uno N meses después de cargarlo.
 */
@Component({
  selector: 'app-configuracion-certificado-medico',
  standalone: true,
  imports: [BotonComponent, CardComponent, SelectComponent],
  templateUrl: './configuracion-certificado-medico.component.html',
  styleUrl: './configuracion-certificado-medico.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfiguracionCertificadoMedicoComponent implements OnInit {
  private readonly perfilEmpresaActiva = inject(PerfilEmpresaActivaService);
  private readonly sesion = inject(AuthSessionService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly colorTheme = inject(ColorThemeService);

  protected readonly opcionesModo: readonly { readonly valor: CertificadoVigenciaModo; readonly titulo: string; readonly detalle: string }[] = [
    {
      valor: 'FECHA_FIJA',
      titulo: 'Todos renuevan el mismo día del año',
      detalle: 'Por ejemplo, el 1 de enero: todos tienen que volver a subir el certificado.',
    },
    {
      valor: 'DURACION',
      titulo: 'Dura un tiempo desde que se carga',
      detalle: 'Por ejemplo, 12 meses: cada socio renueva en una fecha distinta.',
    },
  ];
  protected readonly opcionesMes: readonly SelectOption[] = MESES.map((nombre, i) => ({ value: String(i + 1), label: nombre }));
  protected readonly opcionesDia: readonly SelectOption[] = Array.from({ length: 31 }, (_, i) => ({
    value: String(i + 1),
    label: String(i + 1),
  }));

  protected readonly perfil = signal<PerfilEmpresaDto | null>(null);
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly error = signal('');
  protected readonly guardado = signal(false);

  protected readonly modo = signal<CertificadoVigenciaModo>('FECHA_FIJA');
  protected readonly meses = signal('12');
  protected readonly dia = signal('1');
  protected readonly mes = signal('1');

  protected readonly mesesInvalido = computed(() => {
    const n = Number(this.meses().trim());
    return this.modo() === 'DURACION' && (!Number.isInteger(n) || n < 1 || n > 120);
  });

  /** Frase de ejemplo con la fecha de hoy. */
  protected readonly ejemplo = computed(() => {
    const hoy = new Date();
    const hoySinHora = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    const vence = this.calcularVencimiento(hoySinHora);
    if (!vence) return '';
    return `Ejemplo: un certificado cargado hoy (${fechaTexto(hoySinHora)}) vence el ${fechaTexto(vence)}.`;
  });

  protected readonly resumenModo = computed(() => {
    if (this.modo() === 'DURACION') {
      return 'Cada certificado vence pasados los meses indicados desde que se carga.';
    }
    const diaN = Number(this.dia());
    const mesN = Number(this.mes());
    return `Todos los certificados vencen el día anterior al ${diaN} de ${MESES[mesN - 1] ?? ''}, y ese día todos tienen que volver a subirlo.`;
  });

  ngOnInit(): void {
    this.cargarPerfil();
  }

  protected seleccionarModo(modo: CertificadoVigenciaModo): void {
    this.modo.set(modo);
    this.guardado.set(false);
  }

  protected actualizarMeses(evento: Event): void {
    this.meses.set((evento.target as HTMLInputElement).value);
    this.guardado.set(false);
  }

  protected guardar(): void {
    const perfil = this.perfil();
    const companyUuid = this.sesion.obtenerCompanyUuid().trim();
    if (this.guardando() || !perfil || !companyUuid) return;
    if (this.mesesInvalido()) {
      this.error.set('Ingresá una duración entera entre 1 y 120 meses.');
      return;
    }
    if (!perfil.domicilio || !perfil.domicilioFacturacion || !perfil.telefono || !perfil.emailInstitucional) {
      this.error.set('Completá el perfil del gimnasio antes de configurar el certificado médico.');
      return;
    }

    const payload = this.crearPayload(perfil);
    this.guardando.set(true);
    this.error.set('');
    this.guardado.set(false);
    this.perfilEmpresaActiva
      .actualizarPerfil(companyUuid, payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.guardando.set(false)),
      )
      .subscribe({
        next: () => {
          this.perfil.set({ ...perfil, ...payload });
          this.guardado.set(true);
        },
        error: () => this.error.set('No se pudo guardar la configuración del certificado.'),
      });
  }

  private calcularVencimiento(fechaCarga: Date): Date | null {
    if (this.modo() === 'DURACION') {
      const n = Number(this.meses().trim());
      if (!Number.isInteger(n) || n < 1 || n > 120) return null;
      const total = fechaCarga.getMonth() + n;
      const anio = fechaCarga.getFullYear() + Math.floor(total / 12);
      const mes = total % 12;
      return new Date(anio, mes, Math.min(fechaCarga.getDate(), ultimoDiaDelMes(anio, mes + 1)));
    }
    const mes = Math.min(12, Math.max(1, Number(this.mes()) || 1));
    const dia = Math.max(1, Number(this.dia()) || 1);
    let anio = fechaCarga.getFullYear();
    let renovacion = new Date(anio, mes - 1, Math.min(dia, ultimoDiaDelMes(anio, mes)));
    if (renovacion <= fechaCarga) {
      anio += 1;
      renovacion = new Date(anio, mes - 1, Math.min(dia, ultimoDiaDelMes(anio, mes)));
    }
    return new Date(renovacion.getFullYear(), renovacion.getMonth(), renovacion.getDate() - 1);
  }

  private cargarPerfil(): void {
    const companyUuid = this.sesion.obtenerCompanyUuid().trim();
    if (!companyUuid) {
      this.error.set('Seleccioná un gimnasio para configurar el certificado médico.');
      return;
    }
    this.cargando.set(true);
    this.perfilEmpresaActiva
      .obtenerPerfil(companyUuid, { forzar: false })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cargando.set(false)),
      )
      .subscribe({
        next: (perfil) => {
          this.perfil.set(perfil);
          this.modo.set(perfil.certificadoVigenciaModo ?? 'FECHA_FIJA');
          this.meses.set(String(perfil.certificadoVigenciaMeses ?? 12));
          this.dia.set(String(perfil.certificadoRenovacionDia ?? 1));
          this.mes.set(String(perfil.certificadoRenovacionMes ?? 1));
        },
        error: () => this.error.set('No se pudo cargar la configuración del gimnasio.'),
      });
  }

  private crearPayload(perfil: PerfilEmpresaDto): PerfilEmpresaPayload {
    const paleta = this.colorTheme.obtenerPaletaPredeterminada();
    const path =
      perfil.path?.trim() ||
      perfil.nombreComercial
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    return {
      path,
      nombreComercial: perfil.nombreComercial,
      razonSocial: perfil.razonSocial,
      cuit: perfil.cuit,
      domicilio: perfil.domicilio!,
      domicilioFacturacion: perfil.domicilioFacturacion!,
      telefono: perfil.telefono!,
      emailFacturaElectronica: perfil.emailFacturaElectronica,
      emailInstitucional: perfil.emailInstitucional!,
      colorPrimario: perfil.colorPrimario ?? paleta.primario,
      colorSecundario: perfil.colorSecundario ?? paleta.secundario,
      cuotaSocialHabilitada: perfil.cuotaSocialHabilitada ?? false,
      certificadoVigenciaModo: this.modo(),
      certificadoVigenciaMeses: Number(this.meses().trim() || '12'),
      certificadoRenovacionDia: Number(this.dia()),
      certificadoRenovacionMes: Number(this.mes()),
    };
  }
}
