import { ChangeDetectionStrategy, Component, HostBinding, input, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { provideCardIcons } from '../../../core/icons/app-icons.registry';
import { BotonComponent } from '../boton/boton.component';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [BotonComponent, NgIcon],
  providers: [provideCardIcons()],
  templateUrl: './card.component.html',
  styleUrl: './card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardComponent {
  readonly titulo = input('');
  readonly descripcion = input('');
  readonly icono = input('');
  readonly colapsar = input(false);
  readonly compacto = input(false);
  readonly altoRendimiento = input(false);
  readonly altoImpactoVisual = input(false);
  protected readonly colapsada = signal(false);

  @HostBinding('class')
  get clasesHost(): string {
    return [
      'app-card-host',
      this.colapsar() ? 'app-card-host--colapsable' : '',
      this.colapsar() && this.colapsada() ? 'app-card-host--colapsada' : '',
      this.compacto() ? 'app-card-host--compacto' : '',
      this.altoRendimiento() ? 'app-card-host--alto-rendimiento' : '',
      this.altoImpactoVisual() ? 'app-card-host--alto-impacto-visual' : '',
    ]
      .filter(Boolean)
      .join(' ');
  }

  protected alternarColapsado(): void {
    if (!this.colapsar()) {
      return;
    }

    this.colapsada.update((valor) => !valor);
  }
}
