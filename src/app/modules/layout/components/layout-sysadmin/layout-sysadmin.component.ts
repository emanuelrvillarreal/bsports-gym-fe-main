import { ChangeDetectionStrategy, Component } from '@angular/core';

import { LayoutMainComponent } from '../layout-main/layout-main.component';

@Component({
  selector: 'app-layout-sysadmin',
  imports: [LayoutMainComponent],
  templateUrl: './layout-sysadmin.component.html',
  styleUrl: './layout-sysadmin.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayoutSysadminComponent {}
