import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';

import { DriverOnboardingRole } from '../driver-onboarding/driver-onboarding.models';
import { DriverOnboardingService } from '../driver-onboarding/driver-onboarding.service';
import { CardComponent } from '../card/card.component';
import { BotonComponent } from '../boton/boton.component';

type OnboardingPanelCopy = {
  readonly title: string;
  readonly description: string;
};

const COPY_BY_ROLE: Readonly<Record<DriverOnboardingRole, OnboardingPanelCopy>> = {
  admin: {
    title: 'Onboarding',
    description:
      'Reactiva los recorridos automaticos para que vuelvan a mostrarse al entrar en cada pantalla.',
  },
  profesor: {
    title: 'Onboarding',
    description:
      'Reactiva los recorridos del rol profesor para volver a verlos al ingresar en cada vista.',
  },
  miembro: {
    title: 'Onboarding',
    description:
      'Reactiva los recorridos del rol miembro para volver a verlos cuando reingreses a cada pagina.',
  },
} as const;

@Component({
  selector: 'app-onboarding-config-panel',
  standalone: true,
  imports: [BotonComponent, CardComponent],
  templateUrl: './onboarding-config-panel.component.html',
  styleUrl: './onboarding-config-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingConfigPanelComponent {
  private readonly driverOnboardingService = inject(DriverOnboardingService);
  private readonly roleState = signal<DriverOnboardingRole>('admin');

  readonly altoRendimiento = input(false);

  protected readonly copy = computed(() => COPY_BY_ROLE[this.roleState()]);
  protected readonly onboardingPages = computed(() =>
    this.driverOnboardingService.obtenerPanelPorRol(this.roleState()),
  );
  protected readonly onboardingPendienteTodo = computed(() =>
    this.onboardingPages().some((item) => item.pending),
  );
  protected readonly panelAbierto = signal(false);

  setRole(role: DriverOnboardingRole): void {
    this.roleState.set(role);
  }

  protected alternarOnboardingRol(pending: boolean): void {
    this.driverOnboardingService.actualizarEstadoPendienteRol(this.roleState(), pending);
  }

  protected alternarPanel(): void {
    this.panelAbierto.update((abierto) => !abierto);
  }

  protected alternarOnboarding(routePath: string, pending: boolean): void {
    this.driverOnboardingService.actualizarEstadoPendiente(this.roleState(), routePath, pending);
  }
}
