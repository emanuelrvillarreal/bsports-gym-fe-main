import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { TITULO_HERO_ICONS, provideTituloHeroIcons } from '../../../core/icons/app-icons.registry';
import { IconoPagina, IconosAppService } from '../../../core/icons/iconos-app.service';

type NombreIconoTituloHero = keyof typeof TITULO_HERO_ICONS;

@Component({
  selector: 'app-titulo-hero',
  standalone: true,
  imports: [NgIcon, NgOptimizedImage],
  providers: [provideTituloHeroIcons()],
  templateUrl: './titulo-hero.component.html',
  styleUrl: './titulo-hero.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TituloHeroComponent {
  private readonly iconosApp = inject(IconosAppService);

  readonly titulo = input.required<string>();
  readonly subtitulo = input('');
  readonly icono = input<IconoPagina | NombreIconoTituloHero | ''>('');
  /** Logo opcional para representar la entidad del encabezado. */
  readonly logoUrl = input('');
  /** Renderiza el logo como avatar circular sin alterar los usos institucionales existentes. */
  readonly logoCircular = input(false);
  readonly color = input('');
  readonly altoRendimiento = input(false);
  protected readonly nombreIcono = computed(() => {
    const icono = this.icono();

    if (!icono) {
      return '';
    }

    return Object.prototype.hasOwnProperty.call(TITULO_HERO_ICONS, icono)
      ? (icono as NombreIconoTituloHero)
      : this.iconosApp.obtenerNombre(icono);
  });
}
