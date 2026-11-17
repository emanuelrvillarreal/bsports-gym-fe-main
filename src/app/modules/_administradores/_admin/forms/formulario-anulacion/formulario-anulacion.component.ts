import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { BotonComponent } from '../../../../ui/boton/boton.component';
import { ValidacionFormularioDirective } from '../../../../ui/validacion-formulario/validacion-formulario.directive';

@Component({
  selector: 'app-formulario-anulacion',
  imports: [BotonComponent, ValidacionFormularioDirective],
  templateUrl: './formulario-anulacion.component.html',
  styleUrl: '../formulario-movimiento/formulario-movimiento.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormularioAnulacionComponent {
  readonly enviando = input(false);
  readonly limiteMotivo = input(512);
  readonly mostrarContador = input(false);
  readonly enviado = output<{ readonly motivo: string }>();
  protected readonly motivo = signal('');
  protected readonly error = signal('');

  protected actualizarMotivo(evento: Event): void {
    this.motivo.set((evento.target as HTMLTextAreaElement).value.slice(0, this.limiteMotivo()));
  }

  protected enviar(): void {
    const motivo = this.motivo().trim();
    if (!motivo) { this.error.set('El motivo es obligatorio.'); return; }
    if (motivo.length > this.limiteMotivo()) {
      this.error.set(`El motivo no puede superar los ${this.limiteMotivo()} caracteres.`);
      return;
    }
    this.error.set('');
    this.enviado.emit({ motivo });
  }
}
