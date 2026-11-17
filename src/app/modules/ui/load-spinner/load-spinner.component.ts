import { Component, input } from '@angular/core';
import { NgClass } from '@angular/common';

export type LoadSpinnerTipo = 'default' | 'imagen';

@Component({
  selector: 'app-load-spinner',
  standalone: true,
  imports: [NgClass],
  templateUrl: './load-spinner.component.html',
  styleUrl: './load-spinner.component.scss',
})
export class LoadSpinnerComponent {
  readonly tipo = input<LoadSpinnerTipo>('default');
  readonly altoRendimiento = input(false);
  readonly colorPrimario = input('');
  readonly colorSecundario = input('');
}
