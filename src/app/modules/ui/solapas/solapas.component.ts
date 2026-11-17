import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgIcon } from '@ng-icons/core';

import { IconoApp, IconosAppService } from '../../../core/icons/iconos-app.service';

/** Pestaña navegable; cada una es un link a su propia ruta. */
export interface SolapaNavegable {
  readonly etiqueta: string;
  readonly ruta: string;
  readonly icono?: IconoApp;
  /** Número a destacar junto a la etiqueta (ej. pendientes). Se oculta en 0 o sin valor. */
  readonly contador?: number | null;
}

@Component({
  selector: 'app-solapas',
  imports: [NgIcon, RouterLink, RouterLinkActive],
  templateUrl: './solapas.component.html',
  styleUrl: './solapas.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SolapasComponent {
  protected readonly iconos = inject(IconosAppService);

  readonly solapas = input.required<readonly SolapaNavegable[]>();
  /** Nombre accesible del grupo, ej. "Secciones de Socios". */
  readonly etiquetaGrupo = input.required<string>();
}
