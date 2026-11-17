import { Directive, TemplateRef, inject } from '@angular/core';

@Directive({
  selector: 'ng-template[appCarrusel3dItem]',
  standalone: true,
})
export class Carrusel3dItemDirective<T = unknown> {
  readonly templateRef = inject<TemplateRef<{
    $implicit: T;
    index: number;
    active: boolean;
    distance: number;
  }>>(TemplateRef);
}
