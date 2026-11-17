import { Component, computed, inject, input } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { ThemeModeService } from './theme-mode.service';
import { BotonComponent } from '../boton/boton.component';

@Component({
  selector: 'app-dark-mode',
  imports: [BotonComponent, NgIcon],
  templateUrl: './dark-mode.component.html',
  styleUrl: './dark-mode.component.scss',
})
export class DarkModeComponent {
  private readonly themeModeService = inject(ThemeModeService);
  readonly altoRendimiento = input(false);

  protected readonly modoActual = this.themeModeService.mode;
  protected readonly modoResuelto = this.themeModeService.resolvedMode;
  protected readonly etiquetaModo = computed(() =>
    this.modoResuelto() === 'dark' ? 'Oscuro' : 'Claro',
  );

  constructor() {
    this.themeModeService.inicializar();
  }

  protected alternarModo(): void {
    this.themeModeService.alternarModo();
  }
}
