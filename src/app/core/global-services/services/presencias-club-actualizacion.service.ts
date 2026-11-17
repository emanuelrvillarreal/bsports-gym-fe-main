import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

/** Coordina la actualización de consumidores que muestran personas presentes. */
@Injectable({ providedIn: 'root' })
export class PresenciasClubActualizacionService {
  private readonly actualizacionesSubject = new Subject<void>();

  readonly actualizaciones$ = this.actualizacionesSubject.asObservable();

  solicitarActualizacion(): void {
    this.actualizacionesSubject.next();
  }
}
