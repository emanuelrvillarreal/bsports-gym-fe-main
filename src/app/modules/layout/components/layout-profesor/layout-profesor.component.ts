import { ChangeDetectionStrategy, Component } from '@angular/core';

import { LayoutMainComponent } from '../layout-main/layout-main.component';

@Component({
  selector: 'app-layout-profesor',
  imports: [LayoutMainComponent],
  templateUrl: './layout-profesor.component.html',
  styleUrl: './layout-profesor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayoutProfesorComponent {}
