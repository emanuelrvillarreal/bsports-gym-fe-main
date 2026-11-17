import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { ColorThemeService } from '../color-mod/color-theme.service';
import { ThemeModeService } from '../dark-mode/theme-mode.service';

const COLOR_INICIO_PREDETERMINADO = '#009FE3';
const COLOR_FIN_PREDETERMINADO = '#2F52A0';

let siguienteIdInstancia = 0;

@Component({
  selector: 'app-load-spinner-blue',
  standalone: true,
  templateUrl: './load-spinner-blue.component.html',
  styleUrl: './load-spinner-blue.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.--load-spinner-blue-duracion]': 'duracion()',
    '[attr.role]': '"img"',
    '[attr.aria-label]': 'ariaLabel()',
  },
})
export class LoadSpinnerBlueComponent {
  private readonly idInstancia = siguienteIdInstancia++;
  private readonly colorThemeService = inject(ColorThemeService);
  private readonly themeModeService = inject(ThemeModeService);

  readonly duracion = input('1.65s');
  readonly ariaLabel = input('Cargando');
  readonly colorInicio = input<string | null>(null);
  readonly colorFin = input<string | null>(null);

  protected readonly colorInicioResuelto = computed(() => {
    const colorExplicito = this.colorInicio()?.trim();
    if (colorExplicito) return colorExplicito;

    return this.adaptarColorAlTema(
      this.colorThemeService.colorPrimario()?.trim() || COLOR_INICIO_PREDETERMINADO,
    );
  });

  protected readonly colorFinResuelto = computed(() => {
    const colorExplicito = this.colorFin()?.trim();
    if (colorExplicito) return colorExplicito;

    return this.adaptarColorAlTema(
      this.colorThemeService.colorSecundario()?.trim() || COLOR_FIN_PREDETERMINADO,
    );
  });

  protected readonly ids = {
    gradiente: `load-spinner-blue-gradiente-${this.idInstancia}`,
    recortePrimerTramo: `load-spinner-blue-recorte-primer-tramo-${this.idInstancia}`,
    recorteSegundoTramo: `load-spinner-blue-recorte-segundo-tramo-${this.idInstancia}`,
  };

  private adaptarColorAlTema(color: string): string {
    return this.themeModeService.resolvedMode() === 'dark'
      ? `color-mix(in srgb, ${color} 72%, white)`
      : color;
  }
}
