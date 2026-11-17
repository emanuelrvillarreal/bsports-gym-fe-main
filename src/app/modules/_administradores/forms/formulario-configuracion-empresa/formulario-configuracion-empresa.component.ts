import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroChatBubbleLeftRight } from '@ng-icons/heroicons/outline';

import { PerfilEmpresaDto } from '../../../../core/api/interfaces/empresa.interfaces';
import { formatearTelefono, limpiarTelefono } from '../../../../helpers/telefono-formato';
import { BotonComponent } from '../../../ui/boton/boton.component';
import { CardComponent } from '../../../ui/card/card.component';
import { ValidacionFormularioDirective } from '../../../ui/validacion-formulario/validacion-formulario.directive';

export interface ActualizarContactoEmpresaPayload {
  readonly telefono: string;
  readonly emailInstitucional: string;
  readonly emailFacturaElectronica: string;
}

@Component({
  selector: 'app-formulario-configuracion-empresa',
  standalone: true,
  imports: [BotonComponent, CardComponent, NgIcon, ValidacionFormularioDirective],
  providers: [provideIcons({ heroChatBubbleLeftRight })],
  templateUrl: './formulario-configuracion-empresa.component.html',
  styleUrl: './formulario-configuracion-empresa.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormularioConfiguracionEmpresaComponent implements OnDestroy {
  readonly perfil = input<PerfilEmpresaDto | null>(null);
  readonly bloqueado = input(false);
  readonly cargando = input(false);
  readonly duracionErrorMs = input(5000);
  readonly configuracionEnviada = output<ActualizarContactoEmpresaPayload>();

  protected readonly formatearTelefono = formatearTelefono;

  protected readonly telefono = signal('');
  protected readonly emailInstitucional = signal('');
  protected readonly emailFacturaElectronica = signal('');
  protected readonly mensajeError = signal('');
  protected readonly errorVisible = signal(false);
  private errorTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const perfil = this.perfil();
      this.telefono.set(limpiarTelefono(perfil?.telefono ?? ''));
      this.emailInstitucional.set(perfil?.emailInstitucional ?? '');
      this.emailFacturaElectronica.set(perfil?.emailFacturaElectronica ?? '');
      this.limpiarError();
    });
  }

  ngOnDestroy(): void {
    this.limpiarTimeoutError();
  }

  protected actualizarTexto(
    campo: 'emailInstitucional' | 'emailFacturaElectronica',
    evento: Event,
  ): void {
    this[campo].set((evento.target as HTMLInputElement).value);
  }

  protected actualizarTelefono(evento: Event): void {
    this.telefono.set(limpiarTelefono((evento.target as HTMLInputElement).value));
  }

  protected emailInvalido(valor: string): boolean {
    const email = valor.trim();
    return Boolean(email) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  protected enviarConfiguracion(): void {
    if (
      this.emailInvalido(this.emailInstitucional()) ||
      this.emailInvalido(this.emailFacturaElectronica())
    ) {
      this.mostrarError('Verificá los correos ingresados.');
      return;
    }

    this.limpiarError();
    this.configuracionEnviada.emit({
      telefono: this.telefono().trim(),
      emailInstitucional: this.emailInstitucional().trim(),
      emailFacturaElectronica: this.emailFacturaElectronica().trim(),
    });
  }

  private mostrarError(mensaje: string): void {
    this.limpiarTimeoutError();
    this.mensajeError.set(mensaje);
    this.errorVisible.set(true);
    this.errorTimeoutId = setTimeout(() => this.errorVisible.set(false), this.duracionErrorMs());
  }

  private limpiarError(): void {
    this.limpiarTimeoutError();
    this.errorVisible.set(false);
  }

  private limpiarTimeoutError(): void {
    if (this.errorTimeoutId !== null) clearTimeout(this.errorTimeoutId);
    this.errorTimeoutId = null;
  }
}
