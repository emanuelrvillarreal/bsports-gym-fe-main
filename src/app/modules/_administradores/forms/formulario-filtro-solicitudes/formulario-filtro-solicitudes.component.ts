import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  signal,
} from '@angular/core';

import { BotonComponent } from '../../../ui/boton/boton.component';
import { ValidacionFormularioDirective } from '../../../ui/validacion-formulario/validacion-formulario.directive';

export interface FiltroSolicitudesPayload {
  readonly busqueda: string;
}

@Component({
  selector: 'app-formulario-filtro-solicitudes',
  standalone: true,
  imports: [BotonComponent, ValidacionFormularioDirective],
  templateUrl: './formulario-filtro-solicitudes.component.html',
  styleUrl: './formulario-filtro-solicitudes.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormularioFiltroSolicitudesComponent {
  readonly cargando = input(false);
  readonly enviado = output<FiltroSolicitudesPayload>();

  protected readonly busqueda = signal('');

  protected actualizarBusqueda(evento: Event): void {
    this.busqueda.set((evento.target as HTMLInputElement).value);
  }

  protected enviar(): void {
    this.enviado.emit({ busqueda: this.busqueda().trim() });
  }
}
