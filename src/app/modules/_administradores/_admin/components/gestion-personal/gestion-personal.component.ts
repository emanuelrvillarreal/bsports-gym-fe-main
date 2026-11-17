import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import {
  CupoAdminsDto,
  ListadoPersonalDto,
  PersonaEncontradaDto,
  PersonaPersonalDto,
  RolesPersonal,
} from '../../../../../core/api/interfaces/personal.interfaces';
import { PersonalApiService } from '../../../../../core/api/services/personal-api.service';
import { BotonComponent } from '../../../../ui/boton/boton.component';
import { PopupComponent } from '../../../../ui/popup/popup.component';
import { ToastAlertService } from '../../../../ui/toast-alert/services/toast-alert.service';

type Rol = keyof RolesPersonal;

const NOMBRES_ROL: Readonly<Record<Rol, string>> = {
  admin: 'Administrador',
  recepcion: 'Recepción',
  profesor: 'Profesor',
};

/**
 * Personal del club en una sola lista: cada persona puede tener varios roles (administrador, recepción, profesor)
 * y además ser socio. Los administradores están limitados por el plan.
 */
@Component({
  selector: 'app-gestion-personal',
  standalone: true,
  imports: [BotonComponent, PopupComponent],
  templateUrl: './gestion-personal.component.html',
  styleUrl: './gestion-personal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GestionPersonalComponent {
  private readonly api = inject(PersonalApiService);
  private readonly toast = inject(ToastAlertService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly nombresRol = NOMBRES_ROL;
  protected readonly roles: readonly Rol[] = ['admin', 'recepcion', 'profesor'];

  protected readonly personas = signal<readonly PersonaPersonalDto[]>([]);
  protected readonly cupo = signal<CupoAdminsDto>({ actuales: 0, limite: null });
  protected readonly cargando = signal(true);
  protected readonly busqueda = signal('');
  /** userUuid de la fila que se está guardando. */
  protected readonly guardandoUuid = signal<string | null>(null);

  protected readonly cupoLleno = computed(() => {
    const c = this.cupo();
    return c.limite !== null && c.actuales >= c.limite;
  });

  protected readonly personasFiltradas = computed(() => {
    const palabras = this.busqueda().trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!palabras.length) return this.personas();
    return this.personas().filter((p) => {
      const texto = [p.nombre, p.apellido, p.dni, p.email].join(' ').toLowerCase();
      return palabras.every((palabra) => texto.includes(palabra));
    });
  });

  // Alta
  protected readonly popupAbierto = signal(false);
  protected readonly guardandoAlta = signal(false);
  protected readonly buscando = signal(false);
  protected readonly encontrada = signal<PersonaEncontradaDto | null>(null);
  protected readonly errorAlta = signal('');
  protected readonly dni = signal('');
  protected readonly nombre = signal('');
  protected readonly apellido = signal('');
  protected readonly email = signal('');
  protected readonly telefono = signal('');
  protected readonly password = signal('');
  protected readonly altaRoles = signal<RolesPersonal>({ admin: false, recepcion: false, profesor: true });

  /** Si la persona ya existe en el sistema no hace falta contraseña: entra con la que ya tiene. */
  protected readonly pidePassword = computed(() => !this.encontrada()?.existe);

  constructor() {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.api
      .listar()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cargando.set(false)),
      )
      .subscribe({ next: (listado) => this.aplicarListado(listado) });
  }

  protected iniciales(p: PersonaPersonalDto): string {
    return `${p.nombre?.charAt(0) ?? ''}${p.apellido?.charAt(0) ?? ''}`.toUpperCase() || '?';
  }

  protected rolDeshabilitado(p: PersonaPersonalDto, rol: Rol): boolean {
    if (this.guardandoUuid() === p.userUuid) return true;
    if (rol === 'admin') return (p.admin && p.yo) || (!p.admin && this.cupoLleno());
    // Administrador ya incluye recepción.
    if (rol === 'recepcion') return p.admin;
    return false;
  }

  protected ayudaRol(p: PersonaPersonalDto, rol: Rol): string {
    if (rol === 'admin' && p.admin && p.yo) return 'No podés quitarte tu propio rol de administrador.';
    if (rol === 'admin' && !p.admin && this.cupoLleno()) return 'Llegaste al límite de administradores de tu plan.';
    if (rol === 'recepcion' && p.admin) return 'Administrador ya incluye todo lo de recepción.';
    return '';
  }

  protected async cambiarRol(p: PersonaPersonalDto, rol: Rol, evento: Event): Promise<void> {
    const campo = evento.target as HTMLInputElement;
    const activar = campo.checked;
    const roles: RolesPersonal = { admin: p.admin, recepcion: p.recepcion, profesor: p.profesor, [rol]: activar };
    if (rol === 'admin' && activar) {
      // Al pasar a administrador deja de figurar como recepción (ya lo incluye).
      Object.assign(roles, { recepcion: false });
    }

    if (!activar) {
      const quedaSinRoles = !roles.admin && !roles.recepcion && !roles.profesor;
      const nombre = `${p.nombre ?? ''} ${p.apellido ?? ''}`.trim();
      const texto = quedaSinRoles
        ? `${nombre} deja de ser ${NOMBRES_ROL[rol].toLowerCase()} y sale de la lista de personal.${p.socio ? ' Sigue siendo socio.' : ''}`
        : `¿Quitarle a ${nombre} el rol de ${NOMBRES_ROL[rol].toLowerCase()}?`;
      const confirmado = await this.toast.confirmDanger(texto, {
        titulo: 'Quitar rol',
        textoConfirmar: 'Sí, quitar',
      });
      if (!confirmado) {
        campo.checked = true;
        return;
      }
    }

    this.guardandoUuid.set(p.userUuid);
    this.api
      .cambiarRoles(p.userUuid, roles)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.guardandoUuid.set(null)),
      )
      .subscribe({
        next: (listado) => this.aplicarListado(listado),
        error: () => (campo.checked = !activar),
      });
  }

  // ---- Alta ----

  protected abrirAlta(): void {
    this.dni.set('');
    this.nombre.set('');
    this.apellido.set('');
    this.email.set('');
    this.telefono.set('');
    this.password.set('');
    this.encontrada.set(null);
    this.errorAlta.set('');
    this.altaRoles.set({ admin: false, recepcion: false, profesor: true });
    this.popupAbierto.set(true);
  }

  protected cerrarAlta(): void {
    if (this.guardandoAlta()) return;
    this.popupAbierto.set(false);
  }

  protected valor(evento: Event): string {
    return (evento.target as HTMLInputElement).value;
  }

  protected buscarPersona(): void {
    const q = this.dni().trim() || this.email().trim();
    if (!q || this.buscando()) return;
    this.buscando.set(true);
    this.api
      .buscar(q)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.buscando.set(false)),
      )
      .subscribe({
        next: (encontrada) => {
          this.encontrada.set(encontrada);
          if (!encontrada.existe) return;
          if (encontrada.nombre) this.nombre.set(encontrada.nombre);
          if (encontrada.apellido) this.apellido.set(encontrada.apellido);
          if (encontrada.email) this.email.set(encontrada.email);
          if (encontrada.dni) this.dni.set(encontrada.dni);
          if (encontrada.telefono) this.telefono.set(encontrada.telefono);
        },
        error: () => this.encontrada.set(null),
      });
  }

  protected cambiarRolAlta(rol: Rol, evento: Event): void {
    const activo = (evento.target as HTMLInputElement).checked;
    this.altaRoles.update((r) => {
      const nuevos = { ...r, [rol]: activo };
      return rol === 'admin' && activo ? { ...nuevos, recepcion: false } : nuevos;
    });
  }

  protected guardarAlta(): void {
    if (this.guardandoAlta()) return;
    const roles = this.altaRoles();
    if (!this.nombre().trim() || !this.apellido().trim() || !this.email().trim()) {
      this.errorAlta.set('Completá nombre, apellido y email.');
      return;
    }
    if (!roles.admin && !roles.recepcion && !roles.profesor) {
      this.errorAlta.set('Elegí al menos un rol.');
      return;
    }
    if (this.pidePassword() && !this.password().trim()) {
      this.errorAlta.set('Poné una contraseña para que pueda entrar.');
      return;
    }

    this.errorAlta.set('');
    this.guardandoAlta.set(true);
    this.api
      .crear({
        ...roles,
        nombre: this.nombre().trim(),
        apellido: this.apellido().trim(),
        dni: this.dni().trim() || null,
        email: this.email().trim(),
        telefono: this.telefono().trim() || null,
        password: this.pidePassword() ? this.password() : null,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.guardandoAlta.set(false)),
      )
      .subscribe({
        next: (listado) => {
          this.aplicarListado(listado);
          this.popupAbierto.set(false);
        },
        error: () => this.errorAlta.set('No se pudo agregar. Revisá los datos e intentá de nuevo.'),
      });
  }

  private aplicarListado(listado: ListadoPersonalDto): void {
    this.personas.set(listado.personas);
    this.cupo.set(listado.cupoAdmins);
  }
}
