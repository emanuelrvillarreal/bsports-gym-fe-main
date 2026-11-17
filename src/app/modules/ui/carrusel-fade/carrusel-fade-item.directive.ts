import { Directive, TemplateRef, inject } from '@angular/core';

@Directive({
  selector: 'ng-template[appCarruselFadeItem]',
  standalone: true,
})
export class CarruselFadeItemDirective<T = unknown> {
  readonly templateRef =
    inject<TemplateRef<{ $implicit: T; index: number; active: boolean }>>(TemplateRef);
}
