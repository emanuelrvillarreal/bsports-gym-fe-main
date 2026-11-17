import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { provideColorModIcons } from '../../../core/icons/app-icons.registry';
import { BotonComponent } from '../boton/boton.component';
import { ColorHex, ColorThemeService, PaletaGuardada } from './color-theme.service';

type TabColor = keyof PaletaGuardada;
type ColorPreset = { readonly nombre: string; readonly valor: ColorHex };

const PRESETS_COLORES: readonly ColorPreset[] = [
  { nombre: 'Esmeralda', valor: '#56c8a0' },
  { nombre: 'Turquesa', valor: '#14b8a6' },
  { nombre: 'Cian', valor: '#06b6d4' },
  { nombre: 'Azul', valor: '#2563eb' },
  { nombre: 'Violeta', valor: '#7c3aed' },
  { nombre: 'Fucsia', valor: '#db2777' },
  { nombre: 'Coral', valor: '#f97316' },
  { nombre: 'Naranja', valor: '#fb923c' },
  { nombre: 'Lima', valor: '#84cc16' },
  { nombre: 'Rojo', valor: '#ef4444' },
] as const;

@Component({
  selector: 'app-color-mod',
  standalone: true,
  imports: [BotonComponent, NgIcon],
  providers: [provideColorModIcons()],
  templateUrl: './color-mod.component.html',
  styleUrl: './color-mod.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColorModComponent {
  private readonly colorThemeService = inject(ColorThemeService);

  readonly altoRendimiento = input(false);
  readonly guardando = input(false);
  readonly restableciendo = input(false);
  readonly paletaPersistida = input<PaletaGuardada | null>(null);

  readonly guardarSolicitado = output<PaletaGuardada>();
  readonly restablecerSolicitado = output<PaletaGuardada>();

  protected readonly presets = PRESETS_COLORES;
  protected readonly tabs: readonly TabColor[] = ['primario', 'secundario'];
  protected readonly tabActiva = signal<TabColor>('primario');
  protected readonly colorPrimario = this.colorThemeService.colorPrimario;
  protected readonly colorSecundario = this.colorThemeService.colorSecundario;
  protected readonly colorTerciario = this.colorThemeService.colorTerciario;
  protected readonly confirmarRestablecerAbierto = signal(false);
  private readonly botonCancelarRestablecimiento = viewChild<BotonComponent>('botonCancelar');
  private readonly referenciaPersistida = signal<PaletaGuardada>(
    this.colorThemeService.obtenerPaletaActual(),
  );
  protected readonly bloqueado = computed(() => this.guardando() || this.restableciendo());
  protected readonly hayCambiosPendientes = computed(
    () =>
      !this.sonPaletasIguales(
        this.colorThemeService.obtenerPaletaActual(),
        this.referenciaPersistida(),
      ),
  );
  protected readonly ayudaTabActiva = computed(() => {
    const ayudas: Record<TabColor, string> = {
      primario: 'Define el color principal de botones, acentos y estados positivos.',
      secundario: 'Define el color secundario para alertas, llamados de atención y contraste.',
      terciario: 'Color interno para compatibilidad con los estilos existentes.',
    };
    return ayudas[this.tabActiva()];
  });

  constructor() {
    this.colorThemeService.inicializar({ sincronizarBackend: false });
    this.referenciaPersistida.set(this.colorThemeService.obtenerPaletaActual());

    effect(() => {
      const persistida = this.paletaPersistida();
      if (!persistida) {
        return;
      }
      this.referenciaPersistida.set(persistida);
      this.colorThemeService.establecerPaleta(persistida);
    });

    effect(() => {
      if (this.confirmarRestablecerAbierto()) {
        this.botonCancelarRestablecimiento()?.enfocar();
      }
    });
  }

  @HostListener('document:keydown.escape')
  protected cerrarConfirmacionConEscape(): void {
    if (this.confirmarRestablecerAbierto() && !this.restableciendo()) {
      this.cancelarRestablecimiento();
    }
  }

  protected abrirTab(tab: TabColor): void {
    if (!this.bloqueado()) {
      this.tabActiva.set(tab);
    }
  }

  protected actualizarColorActivo(evento: Event): void {
    const color = (evento.target as HTMLInputElement | null)?.value;
    if (this.esColorHexValido(color) && !this.bloqueado()) {
      this.actualizarColor(this.tabActiva(), color);
    }
  }

  protected obtenerColorActivo(): ColorHex {
    return this.colorThemeService.obtenerPaletaActual()[this.tabActiva()];
  }

  protected seleccionarPreset(color: ColorHex): void {
    if (!this.bloqueado()) {
      this.actualizarColor(this.tabActiva(), color);
    }
  }

  protected randomizarPaleta(): void {
    if (!this.bloqueado()) {
      this.colorThemeService.randomizarPaleta();
    }
  }

  protected solicitarRestablecimiento(): void {
    if (!this.bloqueado()) {
      this.confirmarRestablecerAbierto.set(true);
    }
  }

  protected cancelarRestablecimiento(): void {
    this.confirmarRestablecerAbierto.set(false);
  }

  protected confirmarRestablecimiento(): void {
    if (this.bloqueado()) {
      return;
    }
    const predeterminada = this.colorThemeService.obtenerPaletaPredeterminada();
    this.colorThemeService.establecerPaleta(predeterminada);
    this.confirmarRestablecerAbierto.set(false);
    this.restablecerSolicitado.emit(predeterminada);
  }

  protected solicitarGuardado(): void {
    if (this.bloqueado() || !this.hayCambiosPendientes()) {
      return;
    }
    this.guardarSolicitado.emit(this.colorThemeService.obtenerPaletaActual());
  }

  private actualizarColor(tab: TabColor, color: ColorHex): void {
    this.colorThemeService.establecerPaleta({
      ...this.colorThemeService.obtenerPaletaActual(),
      [tab]: color,
    });
  }

  private esColorHexValido(valor: string | undefined): valor is ColorHex {
    return typeof valor === 'string' && /^#[\da-fA-F]{6}$/.test(valor);
  }

  private sonPaletasIguales(a: PaletaGuardada, b: PaletaGuardada): boolean {
    return (
      a.primario === b.primario && a.secundario === b.secundario && a.terciario === b.terciario
    );
  }
}
