import { Directive, OnInit, TemplateRef, ViewContainerRef, inject, input } from '@angular/core';

import { AuthService } from '../global-services/services/auth.service';
import { AppRole } from './auth-role';

/**
 * Renderiza el bloque únicamente cuando el rol activo está permitido.
 *
 * Esta directiva controla composición visual; la autorización de rutas y endpoints
 * sigue siendo responsabilidad de los guards y del backend.
 */
@Directive({
  selector: '[appVisibleParaRoles]',
})
export class VisibleParaRolesDirective implements OnInit {
  readonly rolesPermitidos = input.required<readonly AppRole[]>({ alias: 'appVisibleParaRoles' });

  private readonly authService = inject(AuthService);
  private readonly template = inject(TemplateRef<unknown>);
  private readonly contenedor = inject(ViewContainerRef);

  ngOnInit(): void {
    const rolActivo = this.authService.obtenerRolUsuario();
    if (rolActivo && this.rolesPermitidos().includes(rolActivo)) {
      this.contenedor.createEmbeddedView(this.template);
    }
  }
}
