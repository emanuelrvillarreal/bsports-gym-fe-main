import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { GestionAmenitiesComponent } from '../../components/gestion-amenities/gestion-amenities.component';
import { TituloHeroComponent } from '../../../ui/titulo-hero/titulo-hero.component';

@Component({
  selector: 'app-amenities-page',
  imports: [GestionAmenitiesComponent, TituloHeroComponent],
  templateUrl: './amenities-page.component.html',
  styleUrl: './amenities-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AmenitiesPageComponent {
  protected readonly puedeConfigurar =
    inject(ActivatedRoute).snapshot.data['puedeConfigurarAmenities'] === true;
}
