import { ChangeDetectionStrategy, Component, computed, effect, input, signal } from '@angular/core';

import { AYUDAS_PANTALLAS } from './ayudas-pantallas';

/** Pantallas cuya ayuda la persona dejó abierta (por defecto se muestra solo el botón). */
const CLAVE_STORAGE = 'bsports.ayudas-abiertas';

function leerOcultas(): Set<string> {
  try {
    const valor = localStorage.getItem(CLAVE_STORAGE);
    return new Set(valor ? (JSON.parse(valor) as string[]) : []);
  } catch {
    return new Set();
  }
}

function guardarOcultas(ocultas: ReadonlySet<string>): void {
  try {
    localStorage.setItem(CLAVE_STORAGE, JSON.stringify([...ocultas]));
  } catch {
    // Sin storage (modo privado): la ayuda vuelve a aparecer al recargar, no pasa nada.
  }
}

/**
 * Botón "¿Cómo se usa esta pantalla?" que despliega una frase y los pasos de lo más común. Arranca cerrado
 * para no tapar la pantalla; si alguien lo deja abierto, se recuerda en este navegador.
 */
@Component({
  selector: 'app-ayuda-pantalla',
  standalone: true,
  templateUrl: './ayuda-pantalla.component.html',
  styleUrl: './ayuda-pantalla.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AyudaPantallaComponent {
  /** Id de la solapa (clave de AYUDAS_PANTALLAS). */
  readonly clave = input<string | null>(null);

  private readonly ocultas = signal<ReadonlySet<string>>(new Set());
  protected readonly ayuda = computed(() => {
    const clave = this.clave();
    return clave ? AYUDAS_PANTALLAS[clave] ?? null : null;
  });
  protected readonly oculta = computed(() => {
    const clave = this.clave();
    return !clave || !this.ocultas().has(clave);
  });

  constructor() {
    effect(() => {
      if (typeof window !== 'undefined') this.ocultas.set(leerOcultas());
    });
  }

  protected ocultar(): void {
    this.cambiar(true);
  }

  protected mostrar(): void {
    this.cambiar(false);
  }

  private cambiar(ocultar: boolean): void {
    const clave = this.clave();
    if (!clave) return;
    const nuevas = new Set(this.ocultas());
    // El set guarda las abiertas.
    if (ocultar) nuevas.delete(clave);
    else nuevas.add(clave);
    this.ocultas.set(nuevas);
    guardarOcultas(nuevas);
  }
}
