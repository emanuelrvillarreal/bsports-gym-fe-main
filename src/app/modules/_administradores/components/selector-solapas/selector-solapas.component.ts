import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { ID_CONTADOR_EN_CLUB } from '../../../../core/global-services/services/menu-solapas.service';
import { CardComponent } from '../../../ui/card/card.component';
import {
  SECCIONES_ADMINISTRACION,
  SeccionAdministracion,
  SolapaAdministracion,
} from '../../secciones-administracion';

interface SeccionConfigurable {
  readonly seccion: SeccionAdministracion;
  readonly solapas: readonly SolapaAdministracion[];
}

/**
 * Lista de pantallas del panel para tildar las que el club quiere ver (más el contador "en el club" de la
 * barra de arriba). La usan Configuración › Menú y solapas y el último paso de "Completá el perfil".
 * No guarda nada: emite el nuevo conjunto de ocultas y quien la usa decide cuándo guardarlo.
 */
@Component({
  selector: 'app-selector-solapas',
  standalone: true,
  imports: [CardComponent],
  templateUrl: './selector-solapas.component.html',
  styleUrl: './selector-solapas.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectorSolapasComponent {
  readonly ocultas = input.required<ReadonlySet<string>>();
  readonly ocultasChange = output<ReadonlySet<string>>();

  protected readonly secciones: readonly SeccionConfigurable[] = SECCIONES_ADMINISTRACION.map(
    (seccion) => ({ seccion, solapas: seccion.solapas.filter((solapa) => solapa.ocultable) }),
  ).filter((item) => item.solapas.length > 0);

  protected readonly contadorVisible = computed(() => !this.ocultas().has(ID_CONTADOR_EN_CLUB));

  protected estaVisible(solapa: SolapaAdministracion): boolean {
    return !this.ocultas().has(solapa.id);
  }

  protected alternar(id: string, visible: boolean): void {
    const siguientes = new Set(this.ocultas());
    if (visible) siguientes.delete(id);
    else siguientes.add(id);
    this.ocultasChange.emit(siguientes);
  }

  protected readonly idContador = ID_CONTADOR_EN_CLUB;

  protected descripcionRoles(solapa: SolapaAdministracion): string {
    return solapa.roles.includes('ADM_RECEPCION') ? 'Administración y recepción' : 'Solo administración';
  }
}
