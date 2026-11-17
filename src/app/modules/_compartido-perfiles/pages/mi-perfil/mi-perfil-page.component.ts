import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { AuthService } from '../../../../core/global-services/services/auth.service';

import { TituloHeroComponent } from '../../../ui/titulo-hero/titulo-hero.component';
import { GestionMiPerfilComponent } from '../../components/gestion-mi-perfil/gestion-mi-perfil.component';

@Component({
  selector: 'app-mi-perfil-page', standalone: true,
  imports: [GestionMiPerfilComponent, TituloHeroComponent],
  templateUrl: './mi-perfil-page.component.html',
  styles: [':host { display: grid; gap: 1.25rem; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MiPerfilPageComponent {
  private readonly authService = inject(AuthService);
  protected readonly imageUrl = computed(() => {
    const usuario = this.authService.obtenerUsuarioGuardado();
    const usuarioAnidado = usuario?.['user'];
    const directa = typeof usuario?.imageUrl === 'string' ? usuario.imageUrl.trim() : '';
    const anidada = usuarioAnidado && typeof usuarioAnidado === 'object'
      && typeof (usuarioAnidado as Record<string, unknown>)['imageUrl'] === 'string'
      ? ((usuarioAnidado as Record<string, unknown>)['imageUrl'] as string).trim()
      : '';

    return directa || anidada;
  });
}
