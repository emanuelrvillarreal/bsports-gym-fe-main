import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  input,
  output,
  signal,
} from '@angular/core';

import { EstadoSocio } from '../../../../core/api/interfaces/socios.interfaces';
import { BotonComponent } from '../../../ui/boton/boton.component';
import { ValidacionFormularioDirective } from '../../../ui/validacion-formulario/validacion-formulario.directive';

export interface FiltroSociosPayload {
  readonly busqueda: string;
  readonly estados: readonly EstadoSocio[];
}

@Component({
  selector: 'app-formulario-filtro-socios',
  standalone: true,
  imports: [BotonComponent, ValidacionFormularioDirective],
  templateUrl: './formulario-filtro-socios.component.html',
  styleUrl: './formulario-filtro-socios.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormularioFiltroSociosComponent implements OnDestroy {
  readonly duracionErrorMs = input(5000);
  readonly cargando = input(false);
  readonly enviado = output<FiltroSociosPayload>();
  protected readonly busqueda = signal('');
  protected readonly estados = signal<readonly EstadoSocio[]>([]);
  protected readonly mensajeError = signal('');
  protected readonly errorVisible = signal(false);
  private errorTimeoutId: ReturnType<typeof setTimeout> | null = null;
  protected readonly estadosDisponibles: readonly EstadoSocio[] = [
    'ACTIVO',
    'MOROSO',
    'INHABILITADO',
    'SUSPENDIDO',
    'INACTIVO',
  ];

  ngOnDestroy(): void {
    this.limpiarTimeoutError();
  }
  protected actualizarBusqueda(evento: Event): void {
    this.busqueda.set((evento.target as HTMLInputElement).value);
  }
  protected estadoSeleccionado(estado: EstadoSocio): boolean {
    return this.estados().includes(estado);
  }
  protected alternarEstado(estado: EstadoSocio, seleccionado: boolean): void {
    this.estados.update((actuales) =>
      seleccionado ? [...actuales, estado] : actuales.filter((actual) => actual !== estado),
    );
    this.emitir();
  }
  protected enviar(): void {
    this.emitir();
  }
  private emitir(): void {
    this.limpiarTimeoutError();
    this.enviado.emit({ busqueda: this.busqueda().trim(), estados: this.estados() });
  }
  private limpiarTimeoutError(): void {
    if (this.errorTimeoutId !== null) {
      clearTimeout(this.errorTimeoutId);
      this.errorTimeoutId = null;
    }
  }
}
