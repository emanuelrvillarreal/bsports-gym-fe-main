import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import { formatearEdadDesdeFechaNacimiento } from '../../../../helpers/edad-formato';
import { formatearSexo } from '../../../../helpers/sexo-formato';
import { SocioDto } from '../../../../core/api/interfaces/socios.interfaces';
import { SociosApiService } from '../../../../core/api/services/socios-api.service';
import { PopupComponent } from '../../../ui/popup/popup.component';
import { TituloHeroComponent } from '../../../ui/titulo-hero/titulo-hero.component';
import {
  AccionTabla,
  ColumnaTabla,
  EventoAccionTabla,
  TablaResponsiveComponent,
} from '../../../ui/tabla-responsive/tabla-responsive.component';

interface FilaFamiliar extends SocioDto {
  readonly edad: string;
  readonly sexoTexto: string;
}

@Component({
  selector: 'app-grupo-familiar-socio',
  standalone: true,
  imports: [
    PopupComponent,
    TablaResponsiveComponent,
    TituloHeroComponent,
  ],
  templateUrl: './grupo-familiar-socio.component.html',
  styleUrl: './grupo-familiar-socio.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GrupoFamiliarSocioComponent {
  private readonly sociosApi = inject(SociosApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly titular = input<SocioDto | null>(null);
  readonly procesandoMemberUuid = input<string | null>(null);
  readonly cargandoCertificadosMemberUuid = input<string | null>(null);
  readonly versionRecarga = input(0);

  readonly cerrar = output<void>();
  readonly editar = output<SocioDto>();
  readonly verCertificados = output<SocioDto>();
  readonly cambiarEstado = output<SocioDto>();

  protected readonly familiares = signal<readonly SocioDto[]>([]);
  protected readonly filas = computed<readonly FilaFamiliar[]>(() =>
    this.familiares().map((familiar) => ({
      ...familiar,
      edad: formatearEdadDesdeFechaNacimiento(familiar.fechaNacimiento),
      sexoTexto: formatearSexo(familiar.sexo),
    })),
  );
  protected readonly cargando = signal(false);
  protected readonly error = signal('');
  protected readonly columnas: readonly ColumnaTabla<FilaFamiliar>[] = [
    { id: 'nombre', titulo: 'Nombre', ancho: 'minmax(8rem, 1fr)' },
    { id: 'apellido', titulo: 'Apellido', ancho: 'minmax(8rem, 1fr)' },
    { id: 'parentesco', titulo: 'Parentesco', ancho: '9rem' },
    { id: 'dni', titulo: 'DNI', ancho: '8rem' },
    { id: 'email', titulo: 'Email', ancho: 'minmax(12rem, 1.4fr)' },
    { id: 'edad', titulo: 'Edad', ancho: '9rem' },
    { id: 'sexoTexto', titulo: 'Sexo', ancho: '8rem' },
    { id: 'fechaAlta', titulo: 'Fecha de alta', tipo: 'fecha', ancho: '9rem' },
    {
      id: 'estado',
      titulo: 'Estado',
      tipo: 'estado',
      ancho: '9rem',
      estadoTexto: (valor) => String(valor ?? ''),
    },
  ];
  protected readonly acciones: readonly AccionTabla<FilaFamiliar>[] = [
    { predefinida: 'editar', deshabilitada: () => !!this.procesandoMemberUuid() },
    {
      id: 'ver-certificados',
      texto: 'Ver certificados',
      icono: 'heroDocumentText',
      color: 'var(--gestion-socios-certificados)',
      deshabilitada: () =>
        !!this.procesandoMemberUuid() || !!this.cargandoCertificadosMemberUuid(),
      cargando: (familiar) =>
        this.cargandoCertificadosMemberUuid() === familiar.memberUuid,
    },
    {
      id: 'dar-de-baja',
      texto: 'Dar de baja',
      icono: 'heroTrash',
      color: 'var(--semantic-danger)',
      visible: (familiar) => familiar.estado !== 'INACTIVO',
      deshabilitada: () => !!this.procesandoMemberUuid(),
      cargando: (familiar) => this.procesandoMemberUuid() === familiar.memberUuid,
    },
    {
      id: 'dar-de-alta',
      texto: 'Dar de alta',
      icono: 'heroArrowUp',
      color: 'var(--semantic-success)',
      visible: (familiar) => familiar.estado === 'INACTIVO',
      deshabilitada: () => !!this.procesandoMemberUuid(),
      cargando: (familiar) => this.procesandoMemberUuid() === familiar.memberUuid,
    },
  ];

  constructor() {
    effect(() => {
      const titular = this.titular();
      void this.versionRecarga();

      if (!titular) {
        this.familiares.set([]);
        this.error.set('');
        return;
      }

      this.cargar(titular.memberUuid);
    });
  }

  protected manejarAccion(evento: EventoAccionTabla<FilaFamiliar>): void {
    if (evento.accion === 'editar') {
      this.editar.emit(evento.fila);
      return;
    }

    if (evento.accion === 'ver-certificados') {
      this.verCertificados.emit(evento.fila);
      return;
    }

    if (evento.accion === 'dar-de-baja' || evento.accion === 'dar-de-alta') {
      this.cambiarEstado.emit(evento.fila);
    }
  }

  protected cancelar(): void {
    if (!this.procesandoMemberUuid()) {
      this.cerrar.emit();
    }
  }

  private cargar(titularMemberUuid: string): void {
    this.cargando.set(true);
    this.error.set('');
    this.sociosApi
      .listarFamiliares(titularMemberUuid)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cargando.set(false)),
      )
      .subscribe({
        next: (familiares) => this.familiares.set(familiares),
        error: () => this.error.set('No se pudieron cargar los familiares.'),
      });
  }
}
