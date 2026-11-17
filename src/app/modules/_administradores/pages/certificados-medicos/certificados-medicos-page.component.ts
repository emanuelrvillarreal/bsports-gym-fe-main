import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { AuthSessionService } from '../../../../core/global-services/services/auth-session.service';
import { TituloHeroComponent } from '../../../ui/titulo-hero/titulo-hero.component';
import { ConfiguracionCertificadoMedicoComponent } from '../../components/configuracion-certificado-medico/configuracion-certificado-medico.component';
import { GestionCertificadosMedicosComponent } from '../../components/gestion-certificados-medicos/gestion-certificados-medicos.component';

/** Solapa Socios › Certificados médicos: estado de cada socio y (solo el administrador) cómo vence el certificado. */
@Component({
  selector: 'app-certificados-medicos-page',
  standalone: true,
  imports: [ConfiguracionCertificadoMedicoComponent, GestionCertificadosMedicosComponent, TituloHeroComponent],
  template: `
    <section class="certificados-page">
      <app-titulo-hero
        icono="certificados"
        titulo="Certificados médicos"
        subtitulo="Controlá quién tiene el certificado al día y cuáles actividades lo exigen."
      />
      <app-gestion-certificados-medicos />
      @if (esAdmin) {
        <app-configuracion-certificado-medico />
      }
    </section>
  `,
  styles: ['.certificados-page { display: grid; gap: 1rem; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CertificadosMedicosPageComponent {
  protected readonly esAdmin = inject(AuthSessionService).obtenerRolActivo() === 'ADMIN';
}
