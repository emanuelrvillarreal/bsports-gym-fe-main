import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Fondo animado del panel del club en las pantallas de acceso (login, recuperar contraseña): líneas finas que se
 * desplazan y dibujos de gimnasio (mancuerna, pesa rusa, soga, pelota, cronómetro, disco) que suben despacio.
 * Se apaga con "reducir movimiento" del sistema o con el modo de alto rendimiento.
 */
@Component({
  selector: 'app-decoracion-auth',
  standalone: true,
  templateUrl: './decoracion-auth.component.html',
  styleUrl: './decoracion-auth.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', '[class.deco--quieta]': 'altoRendimiento()' },
})
export class DecoracionAuthComponent {
  readonly altoRendimiento = input(false);

  /** Círculos que suben despacio por el fondo del panel del club (posición, tamaño y ritmo fijos). */
  protected readonly burbujas: readonly {
    tipo: 'burbuja' | 'pesa' | 'kettlebell' | 'soga' | 'pelota' | 'cronometro' | 'disco';
    x: number;
    tam: number;
    dur: number;
    delay: number;
  }[] = [
    { tipo: 'pesa', x: 6, tam: 3.2, dur: 24, delay: 0 },
    { tipo: 'burbuja', x: 18, tam: 1.2, dur: 16, delay: -5 },
    { tipo: 'soga', x: 28, tam: 3, dur: 27, delay: -14 },
    { tipo: 'kettlebell', x: 44, tam: 2.8, dur: 22, delay: -7 },
    { tipo: 'burbuja', x: 56, tam: 2, dur: 19, delay: -11 },
    { tipo: 'pelota', x: 66, tam: 2.6, dur: 25, delay: -3 },
    { tipo: 'cronometro', x: 80, tam: 2.4, dur: 21, delay: -17 },
    { tipo: 'disco', x: 90, tam: 3, dur: 28, delay: -9 },
    { tipo: 'burbuja', x: 36, tam: 0.9, dur: 14, delay: -2 },
  ];
}
