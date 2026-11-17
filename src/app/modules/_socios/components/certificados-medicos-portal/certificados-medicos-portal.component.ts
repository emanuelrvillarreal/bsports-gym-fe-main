import {
  ChangeDetectionStrategy,
  Component,
  ViewChild,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroEyeSolid } from '@ng-icons/heroicons/solid';
import { finalize } from 'rxjs';

import { CertificadoMedicoDto } from '../../../../core/api/interfaces/certificados-medicos.interfaces';
import { PortalSocioApiService } from '../../../../core/api/services/portal-socio-api.service';
import { CardComponent } from '../../../ui/card/card.component';
import { BotonComponent } from '../../../ui/boton/boton.component';
import { CarruselFadeComponent } from '../../../ui/carrusel-fade/carrusel-fade.component';
import { CarruselFadeItemDirective } from '../../../ui/carrusel-fade/carrusel-fade-item.directive';
import { FormularioCertificadoMedicoComponent } from '../../forms/formulario-certificado-medico/formulario-certificado-medico.component';

@Component({
  selector: 'app-certificados-medicos-portal',
  standalone: true,
  imports: [
    BotonComponent,
    CardComponent,
    CarruselFadeComponent,
    CarruselFadeItemDirective,
    FormularioCertificadoMedicoComponent,
    NgIcon,
  ],
  providers: [provideIcons({ heroEyeSolid })],
  templateUrl: './certificados-medicos-portal.component.html',
  styleUrl: './certificados-medicos-portal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CertificadosMedicosPortalComponent {
  private readonly portalApi = inject(PortalSocioApiService);

  @ViewChild(FormularioCertificadoMedicoComponent)
  private formularioCertificado?: FormularioCertificadoMedicoComponent;

  readonly memberUuid = input.required<string>();
  readonly certificados = input<readonly CertificadoMedicoDto[] | null>([]);
  readonly actualizado = output<void>();

  protected readonly enviando = signal(false);
  protected readonly error = signal('');
  protected readonly certificadosOrdenados = computed(() =>
    [...(this.certificados() ?? [])].sort(
      (a, b) => this.fechaComoNumero(b.fechaCarga) - this.fechaComoNumero(a.fechaCarga),
    ),
  );

  /** Aviso con el estado del certificado del socio, con las mismas reglas que usa el club para habilitar actividades. */
  protected readonly estadoActual = computed(() => {
    const hoy = new Date();
    const hoySinHora = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    let mayorVigencia: Date | null = null;
    let pendiente = false;
    let vencido = false;
    let denegado = false;

    for (const certificado of this.certificados() ?? []) {
      const expiracion = this.fechaComoDate(certificado.fechaExpiracion);
      if (certificado.estado === 'CONFIRMADO' && expiracion && expiracion >= hoySinHora) {
        if (!mayorVigencia || expiracion > mayorVigencia) mayorVigencia = expiracion;
      } else if (certificado.estado === 'PENDIENTE_VALIDACION') {
        pendiente = true;
      } else if (certificado.estado === 'DENEGADO') {
        denegado = true;
      } else {
        vencido = true;
      }
    }

    if (mayorVigencia) {
      const dias = Math.round((mayorVigencia.getTime() - hoySinHora.getTime()) / 86_400_000);
      const fecha = this.fechaTexto(mayorVigencia);
      return dias > 30
        ? { tono: 'ok', titulo: 'Certificado al día', detalle: `Tu certificado está vigente hasta el ${fecha}.` }
        : {
            tono: 'aviso',
            titulo: 'Tu certificado está por vencer',
            detalle: `Vence el ${fecha} (${dias === 0 ? 'hoy' : `en ${dias} ${dias === 1 ? 'día' : 'días'}`}). Subí el nuevo para no quedarte sin poder hacer las actividades que lo exigen.`,
          };
    }
    if (pendiente) {
      return { tono: 'info', titulo: 'Certificado en revisión', detalle: 'El gimnasio todavía tiene que confirmarlo. Hasta entonces no cuenta como vigente.' };
    }
    if (vencido) {
      return { tono: 'error', titulo: 'Tu certificado está vencido', detalle: 'Subí uno nuevo para poder inscribirte y asistir a las actividades que lo exigen.' };
    }
    if (denegado) {
      return { tono: 'error', titulo: 'El gimnasio rechazó tu certificado', detalle: 'Subí uno nuevo para poder hacer las actividades que lo exigen.' };
    }
    return { tono: 'error', titulo: 'Todavía no cargaste tu certificado', detalle: 'Algunas actividades lo exigen: subilo para poder inscribirte.' };
  });

  protected subir(archivo: File): void {
    if (this.enviando()) return;

    this.enviando.set(true);
    this.error.set('');
    this.portalApi
      .subirCertificado(this.memberUuid(), archivo)
      .pipe(finalize(() => this.enviando.set(false)))
      .subscribe({
        next: () => {
          this.formularioCertificado?.limpiarSeleccion();
          this.actualizado.emit();
        },
        error: () =>
          this.error.set(
            'No se pudo subir el certificado. Verificá el archivo e intentá nuevamente.',
          ),
      });
  }

  private fechaComoDate(valor: string): Date | null {
    const partes = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(valor ?? '');
    return partes ? new Date(Number(partes[3]), Number(partes[2]) - 1, Number(partes[1])) : null;
  }

  private fechaTexto(fecha: Date): string {
    return `${String(fecha.getDate()).padStart(2, '0')}/${String(fecha.getMonth() + 1).padStart(2, '0')}/${fecha.getFullYear()}`;
  }

  protected puedeVerArchivo(certificado: CertificadoMedicoDto): boolean {
    return certificado.estado !== 'VENCIDO' && !!certificado.urlArchivo?.trim();
  }

  protected etiquetaEstado(estado: CertificadoMedicoDto['estado']): string {
    return estado === 'PENDIENTE_VALIDACION'
      ? 'Pendiente'
      : estado === 'CONFIRMADO'
        ? 'Confirmado'
        : estado === 'DENEGADO'
          ? 'Denegado'
          : 'Vencido';
  }

  protected abrirArchivo(certificado: CertificadoMedicoDto): void {
    const url = certificado.urlArchivo?.trim();
    if (!url || typeof window === 'undefined') return;

    window.open(url, '_blank', 'noopener,noreferrer');
  }

  private fechaComoNumero(fecha: string): number {
    const coincidencia = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(fecha);
    return coincidencia ? Number(`${coincidencia[3]}${coincidencia[2]}${coincidencia[1]}`) : 0;
  }
}
