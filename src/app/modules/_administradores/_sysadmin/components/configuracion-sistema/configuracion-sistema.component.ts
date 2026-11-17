import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';

import {
  ConfiguracionDto,
  ConfiguracionGuardarPayload,
} from '../../../../../core/api/interfaces/configuracion.interfaces';
import { ConfiguracionApiService } from '../../../../../core/api/services/configuracion-api.service';
import { BotonComponent } from '../../../../ui/boton/boton.component';
import { CardComponent } from '../../../../ui/card/card.component';
import { PopupComponent } from '../../../../ui/popup/popup.component';
import {
  AccionTabla,
  ColumnaTabla,
  EventoAccionTabla,
  TablaResponsiveComponent,
} from '../../../../ui/tabla-responsive/tabla-responsive.component';
import { FormularioConfiguracionSistemaComponent } from '../../forms/formulario-configuracion-sistema/formulario-configuracion-sistema.component';

interface ConfiguracionFila {
  readonly uid: string;
  readonly name: string;
  readonly value: string;
  readonly alcance: string;
  readonly global: boolean;
}

@Component({
  selector: 'app-configuracion-sistema',
  imports: [
    BotonComponent,
    CardComponent,
    FormularioConfiguracionSistemaComponent,
    PopupComponent,
    TablaResponsiveComponent,
  ],
  templateUrl: './configuracion-sistema.component.html',
  styleUrl: './configuracion-sistema.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfiguracionSistemaComponent {
  private readonly configuracionApi = inject(ConfiguracionApiService);

  protected readonly configuraciones = signal<readonly ConfiguracionFila[]>([]);
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly error = signal('');
  protected readonly editando = signal<string | null>(null);
  protected readonly popupAbierto = signal(false);
  protected readonly valorFormulario = signal<ConfiguracionGuardarPayload | null>(null);

  protected readonly columnas: readonly ColumnaTabla<ConfiguracionFila>[] = [
    { id: 'name', titulo: 'Clave', ancho: 'minmax(12rem, 1.2fr)' },
    { id: 'value', titulo: 'Valor', ancho: 'minmax(12rem, 1.5fr)' },
    { id: 'alcance', titulo: 'Alcance', ancho: '8rem' },
  ];
  protected readonly acciones: readonly AccionTabla<ConfiguracionFila>[] = ['editar'];

  constructor() {
    this.cargar();
  }

  protected editar(fila: ConfiguracionFila): void {
    this.editando.set(fila.uid);
    this.valorFormulario.set({
      name: fila.name,
      value: fila.value,
      global: fila.global,
    });
    this.error.set('');
    this.popupAbierto.set(true);
  }

  protected abrirNuevaConfiguracion(): void {
    this.editando.set(null);
    this.valorFormulario.set(null);
    this.error.set('');
    this.popupAbierto.set(true);
  }

  protected cerrarFormulario(): void {
    if (this.guardando()) return;

    this.popupAbierto.set(false);
    this.editando.set(null);
    this.valorFormulario.set(null);
    this.error.set('');
  }

  protected manejarAccion(evento: EventoAccionTabla<ConfiguracionFila>): void {
    if (evento.accion === 'editar') {
      this.editar(evento.fila);
    }
  }

  protected guardar(payload: ConfiguracionGuardarPayload): void {
    if (this.guardando()) return;

    this.guardando.set(true);
    this.error.set('');
    this.configuracionApi
      .guardar([payload])
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: () => {
          this.popupAbierto.set(false);
          this.editando.set(null);
          this.valorFormulario.set(null);
          this.cargar();
        },
        error: () => {
          this.popupAbierto.set(false);
          this.error.set('No se pudo guardar la configuración.');
        },
      });
  }

  private cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.configuracionApi
      .listar()
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (configuraciones) =>
          this.configuraciones.set(configuraciones.map((item) => this.aFila(item))),
        error: () => this.error.set('No se pudieron cargar las configuraciones.'),
      });
  }

  private aFila(configuracion: ConfiguracionDto): ConfiguracionFila {
    return {
      uid: configuracion.uuid?.trim() || configuracion.name,
      name: configuracion.name,
      value: configuracion.value,
      alcance: configuracion.global ? 'Global' : 'Privada',
      global: configuracion.global,
    };
  }
}
