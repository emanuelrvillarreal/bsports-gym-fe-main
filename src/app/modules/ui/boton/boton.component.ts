import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { obtenerColorTextoContraste } from '../../../helpers/color-texto-contraste';
import { ColorThemeService } from '../color-mod/color-theme.service';
import { LoadSpinnerBlueComponent } from '../load-spinner-blue/load-spinner-blue.component';
import { ThemeModeService } from '../dark-mode/theme-mode.service';

export type BotonTipo = 'button' | 'submit' | 'reset';
export type BotonApariencia = 'solido' | 'texto';
export type ColorPaletaBoton = 'primario' | 'secundario' | 'terciario';

const COLOR_FONDO_PREDETERMINADO = '#009FE3';
const COLOR_BASE_TEMA_CLARO = '#FFFFFF';
const COLOR_BASE_TEMA_OSCURO = '#000000';

@Component({
  selector: 'app-boton',
  standalone: true,
  imports: [LoadSpinnerBlueComponent],
  templateUrl: './boton.component.html',
  styleUrl: './boton.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.--app-boton-color-fondo]': 'colorFondoResuelto()',
    '[style.--app-boton-color-interaccion]': 'colorInteraccionResuelto()',
    '[style.--app-boton-color-texto]': 'colorTexto()',
    '[style.--app-boton-color-texto-interaccion]': 'colorTextoInteraccion()',
    '[class.app-boton-host--texto]': 'apariencia() === "texto"',
    '[class.app-boton-host--solo-icono]': 'soloIcono()',
    '[class.app-boton-host--contenido-vertical]': 'contenidoVertical()',
  },
})
export class BotonComponent {
  private readonly themeModeService = inject(ThemeModeService);
  private readonly colorThemeService = inject(ColorThemeService);
  private readonly botonNativo = viewChild.required<ElementRef<HTMLButtonElement>>('botonNativo');

  readonly tipo = input<BotonTipo>('button');
  readonly formulario = input<string | null>(null, { alias: 'form' });
  readonly apariencia = input<BotonApariencia>('solido');
  readonly soloIcono = input(false);
  readonly contenidoVertical = input(false);
  readonly colorPaleta = input<ColorPaletaBoton>('primario');
  readonly colorFondo = input<string | null>(null);
  readonly colorInteraccion = input<string | null>(null);
  readonly deshabilitado = input(false);
  readonly cargando = input(false);
  readonly ariaLabel = input<string | null>(null, { alias: 'aria-label' });
  readonly ariaExpanded = input<boolean | string | null>(null, { alias: 'aria-expanded' });
  readonly ariaHaspopup = input<string | null>(null, { alias: 'aria-haspopup' });
  readonly ariaChecked = input<boolean | null>(null, { alias: 'aria-checked' });
  readonly ariaSelected = input<boolean | null>(null, { alias: 'aria-selected' });
  readonly rol = input<string | null>(null, { alias: 'role' });
  readonly ariaLabelCarga = input('Cargando');

  readonly accion = output<MouseEvent>();
  readonly perdioFoco = output<FocusEvent>({ alias: 'blur' });

  protected readonly bloqueado = computed(() => this.deshabilitado() || this.cargando());

  private readonly colorBaseTema = computed(() =>
    this.themeModeService.resolvedMode() === 'dark'
      ? COLOR_BASE_TEMA_OSCURO
      : COLOR_BASE_TEMA_CLARO,
  );

  private readonly colorPaletaResuelto = computed(() => {
    const color = (() => {
      switch (this.colorPaleta()) {
        case 'secundario':
          return this.colorThemeService.colorSecundario();
        case 'terciario':
          return this.colorThemeService.colorTerciario();
        default:
          return this.colorThemeService.colorPrimario();
      }
    })();

    return color?.trim() || COLOR_FONDO_PREDETERMINADO;
  });

  protected readonly colorFondoResuelto = computed(() =>
    this.colorFondo()?.trim() || this.colorPaletaResuelto(),
  );

  protected readonly colorInteraccionResuelto = computed(() => {
    const explicito = this.colorInteraccion()?.trim();
    if (explicito) {
      return explicito;
    }

    const fondo = this.colorFondoResuelto();
    return /gradient\(/i.test(fondo)
      ? fondo
      : `color-mix(in srgb, ${fondo} 82%, var(--app-text))`;
  });

  protected readonly colorTexto = computed(() =>
    obtenerColorTextoContraste(this.colorFondoResuelto(), this.colorBaseTema()),
  );

  protected readonly colorTextoInteraccion = computed(() =>
    obtenerColorTextoContraste(
      this.colorInteraccion()?.trim() || this.colorFondoResuelto(),
      this.colorBaseTema(),
    ),
  );

  protected manejarAccion(evento: MouseEvent): void {
    if (this.bloqueado()) {
      return;
    }

    this.accion.emit(evento);
  }

  enfocar(): void {
    this.botonNativo().nativeElement.focus();
  }

  obtenerElementoNativo(): HTMLButtonElement {
    return this.botonNativo().nativeElement;
  }
}
