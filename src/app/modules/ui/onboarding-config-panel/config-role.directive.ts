import { Directive, effect, inject, input } from '@angular/core';

import { DriverOnboardingRole } from '../driver-onboarding/driver-onboarding.models';
import { OnboardingConfigPanelComponent } from './onboarding-config-panel.component';

@Directive({
  selector: 'app-onboarding-config-panel[appConfigRole]',
  standalone: true,
})
export class ConfigRoleDirective {
  readonly role = input.required<DriverOnboardingRole>({ alias: 'appConfigRole' });

  private readonly panel = inject(OnboardingConfigPanelComponent);

  constructor() {
    effect(() => {
      this.panel.setRole(this.role());
    });
  }
}
