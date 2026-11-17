import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { resolverVideo } from './reproductor-video.helpers';

/**
 * Video demostrativo de un ejercicio. Muestra un botón "Ver video" y, al tocarlo, reproduce el
 * enlace dentro de la página (YouTube, Vimeo, Google Drive o un archivo .mp4/.webm). Si el sitio no
 * permite embeberlo, ofrece abrirlo en otra pestaña. El reproductor recién se carga al abrirlo, así
 * una rutina con muchos ejercicios no descarga todos los videos de entrada.
 */
@Component({
  selector: 'app-reproductor-video',
  standalone: true,
  template: `
    @if (fuente(); as f) {
      @if (f.tipo === 'externo') {
        <a class="video__enlace" [href]="f.url" target="_blank" rel="noopener noreferrer">Abrir video ↗</a>
      } @else {
        <button type="button" class="video__enlace" [attr.aria-expanded]="abierto()" (click)="abierto.set(!abierto())">
          {{ abierto() ? 'Ocultar video' : '▶ Ver video' }}
        </button>
        @if (abierto()) {
          <div class="video__marco">
            @if (f.tipo === 'iframe') {
              <iframe
                [src]="urlSegura()"
                [title]="'Video: ' + titulo()"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowfullscreen
                referrerpolicy="strict-origin-when-cross-origin"
              ></iframe>
            } @else {
              <video [src]="f.url" controls playsinline preload="metadata" [attr.aria-label]="'Video: ' + titulo()">
                Tu navegador no puede reproducir este video.
                <a [href]="f.url" target="_blank" rel="noopener noreferrer">Abrirlo aparte</a>
              </video>
            }
          </div>
          <a class="video__aparte" [href]="enlaceOriginal()" target="_blank" rel="noopener noreferrer">
            ¿No se ve? Abrir {{ f.tipo === 'iframe' ? 'en ' + f.proveedor : 'en otra pestaña' }} ↗
          </a>
        }
      }
    }
  `,
  styles: [
    `
      :host { display: grid; gap: .4rem; }
      .video__enlace {
        justify-self: start;
        padding: 0;
        border: 0;
        background: transparent;
        color: var(--app-accent);
        font: inherit;
        font-size: .85rem;
        font-weight: 700;
        text-decoration: none;
        cursor: pointer;
      }
      .video__enlace:focus-visible, .video__aparte:focus-visible { outline: 2px solid var(--app-accent); outline-offset: 2px; border-radius: .2rem; }
      .video__marco {
        position: relative;
        width: 100%;
        max-width: 40rem;
        aspect-ratio: 16 / 9;
        overflow: hidden;
        border-radius: .6rem;
        background: #000;
      }
      .video__marco iframe, .video__marco video { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
      .video__aparte { color: var(--app-text-soft); font-size: .78rem; }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReproductorVideoComponent {
  private readonly sanitizer = inject(DomSanitizer);

  readonly url = input<string | null | undefined>(null);
  readonly titulo = input('ejercicio');

  protected readonly abierto = signal(false);
  protected readonly fuente = computed(() => resolverVideo(this.url()));
  protected readonly enlaceOriginal = computed(() => this.url()?.trim() ?? '');
  /** Solo se confía en URLs armadas por resolverVideo (dominios conocidos e id validado). */
  protected readonly urlSegura = computed((): SafeResourceUrl | null => {
    const fuente = this.fuente();
    return fuente?.tipo === 'iframe' ? this.sanitizer.bypassSecurityTrustResourceUrl(fuente.url) : null;
  });
}
